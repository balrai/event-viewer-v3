import JWPlayerLoader from "~/viewer/livestreaming/players/JWPlayerLoader";
import VideoJsLoader from "~/viewer/livestreaming/players/VideoJsLoader";
import type { StreamSettings } from "~/stores/livestreaming";
// import IVSRealtimeLoader from "~/viewer/livestreaming/players/IVSRealtimeLoader";

interface PlayerDefinition {
  id: string;
  loader: (new (options: Record<string, any>) => any) | null;
  default?: boolean;
}

const players: PlayerDefinition[] = [
  { id: "jwplayer", loader: JWPlayerLoader, default: true },
  { id: "videojs", loader: VideoJsLoader, default: false },
  { id: "ivsplayer", loader: VideoJsLoader, default: false }
  // { id: "ivsrealtime", loader: IVSRealtimeLoader, default: false }
];

export function usePlayerManager() {
  const streamingStore = useStreamingStore();
  const liveStateStore = useLiveStateStore();
  let loader: InstanceType<
    typeof JWPlayerLoader | typeof VideoJsLoader
  > | null = null;
  const loaderRef = ref<InstanceType<
    typeof JWPlayerLoader | typeof VideoJsLoader
  > | null>(null);

  function resolvePlayer(settings: StreamSettings): PlayerDefinition {
    const player =
      players.find((p) => p.id === settings.sourceType) ??
      players.find((p) => p.id === settings.player) ??
      players.find((p) => p.default) ??
      players[0];

    if (!player) {
      throw new Error("No player definition found");
    }

    return player;
  }

  function getLoader() {
    return loaderRef.value;
  }

  async function createPlayer(
    settings: StreamSettings,
    quizMarkers: any[] = []
  ) {
    destroyPlayer();

    const playerDef = resolvePlayer(settings);

    if (playerDef.loader) {
      loader = new playerDef.loader({
        ...settings,
        quizMarkers
      });
      loaderRef.value = loader;
      streamingStore.setPlayerLoader(loader);
      bindLoaderEvents(loader);
    }
  }

  function bindLoaderEvents(instance: any) {
    // Override or hook into loader callbacks to push state into the store
    const originalOnPlayerError = instance.onPlayerError?.bind(instance);
    instance.onPlayerError = (data: any) => {
      streamingStore.setError({
        code: data.code,
        title: "Loading",
        message: "Attempting to load stream. Please wait."
      });
      if (originalOnPlayerError) originalOnPlayerError(data);
    };

    const originalHideError = instance._hideError?.bind(instance);
    instance._hideError = () => {
      streamingStore.setError(null);
      if (originalHideError) {
        originalHideError();
      }
    };

    const originalDispatch = instance.dispatchLiveStateCmdData?.bind(instance);
    instance.dispatchLiveStateCmdData = (cmdData: any) => {
      console.log("Received live state command:", cmdData);
      liveStateStore.setLiveStateFromBuffer(cmdData.timestamp);
      if (originalDispatch) originalDispatch(cmdData);
    };

    const orginalShowError = instance.showError?.bind(instance);
    instance.showError = (error: any) => {
      streamingStore.setError({
        code: error.code || 0,
        title: error.title || "Loading",
        message: error.message || "Attempting to load stream. Please wait."
      });
      if (orginalShowError) orginalShowError(error);
    };
  }

  async function startPlayer() {
    if (!loader) {
      console.error("No loader instance. Call createPlayer() first.");
      return;
    }

    const settings = streamingStore.streamSettings;
    if (!settings?.streamUrl) {
      streamingStore.setError({
        code: 0,
        title: "Configuration Error",
        message: "No stream URL configured"
      });
      return;
    }

    try {
      await loader.startStream();
      streamingStore.setPlayerState({ playing: true, ready: true });
      streamingStore.setError(null);
    } catch (err: any) {
      streamingStore.setError({
        code: err.code || 0,
        title: "Playback Error",
        message: err.message || "Failed to start stream"
      });
    }
  }

  function pausePlayer() {
    loader?.pauseStream();
    streamingStore.setPlayerState({ playing: false });
  }

  function resumePlayer() {
    loader?.resumeStream();
    streamingStore.setPlayerState({ playing: true });
  }

  function destroyPlayer() {
    if (loader) {
      loader.removePlayerContainer();
      loader = null;
    }
    streamingStore.setPlayerState({
      playing: false,
      buffering: false,
      ready: false
    });
    streamingStore.setError(null);
  }

  return {
    getLoader,
    createPlayer,
    startPlayer,
    pausePlayer,
    resumePlayer,
    destroyPlayer,
    resolvePlayer
  };
}
