import JWPlayerLoader from "~/viewer/livestreaming/players/JWPlayerLoader";
import VideoJsLoader from "~/viewer/livestreaming/players/VideoJsLoader";
import type { StreamSettings } from "~/stores/livestreaming";

interface PlayerDefinition {
  id: string;
  loader: new (options: Record<string, any>) => any;
  default?: boolean;
}

const players: PlayerDefinition[] = [
  { id: "jwplayer", loader: JWPlayerLoader, default: true },
  { id: "videojs", loader: VideoJsLoader, default: false },
  { id: "ivsplayer", loader: VideoJsLoader, default: false }
  // { id: 'ivsrealtime', loader: IvsRealtimeLoader },
];

export function usePlayerManager() {
  const streamingStore = useStreamingStore();
  const liveStateStore = useLiveStateStore();

  let loader: InstanceType<typeof JWPlayerLoader> | null = null;
  const loaderRef = ref<InstanceType<typeof JWPlayerLoader> | null>(null);

  function resolvePlayer(settings: StreamSettings): PlayerDefinition {
    const player =
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
    // Destroy previous player
    destroyPlayer();

    const playerDef = resolvePlayer(settings);

    console.log("playerDef:", playerDef);
    console.log("settings:", settings);

    loader = new playerDef.loader({
      ...settings,
      quizMarkers
    });
    loaderRef.value = loader;
  }

  function bindLoaderEvents(instance: any) {
    // Override or hook into loader callbacks to push state into the store
    const originalOnPlayerError = instance.onPlayerError?.bind(instance);
    instance.onPlayerError = (data: any) => {
      streamingStore.setError({
        code: data.code,
        title: data.type || "Player Error",
        message: data.message || "An error occurred"
      });
      if (originalOnPlayerError) originalOnPlayerError(data);
    };

    // Hook into dispatchLiveStateCmdData to route to liveState store
    // const originalDispatch = instance.dispatchLiveStateCmdData?.bind(instance);
    // instance.dispatchLiveStateCmdData = (cmdData: any) => {
    //   liveStateStore.processCommand(cmdData);
    //   if (originalDispatch) originalDispatch(cmdData);
    // };
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
    if (loader?.jwplayer) {
      loader.jwplayer.pause();
      streamingStore.setPlayerState({ playing: false });
    }
  }

  function resumePlayer() {
    if (loader?.jwplayer) {
      loader.jwplayer.play();
      streamingStore.setPlayerState({ playing: true });
    }
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
