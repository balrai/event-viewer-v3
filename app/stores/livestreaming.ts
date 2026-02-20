import { defineStore } from "pinia";

export interface StreamSettings {
  player: string;
  name: string;
  sourceType?: string;
  streamUrl?: string;
  sessionType?: string;
  instanceId?: string;
  videoProp?: Record<string, any>;
  [key: string]: any;
}

export interface StreamPlayback {
  lastPlayPosition: number;
  maxPlayPosition: number;
  totalWatchTime: number;
  maxVideoLength: number;
}

export interface StreamHealth {
  bitrate: number | string;
  loadTime: number;
  chunkDuration: number;
}

export const useStreamingStore = defineStore("livestreaming", () => {
  // --- Config state ---
  const streamSettings = useState<StreamSettings | null>(
    "streamSettings",
    () => null
  );

  // --- Playback state ---
  const isPlaying = ref(false);
  const isBuffering = ref(false);
  const isReady = ref(false);

  // --- Playback tracking ---
  const playback = ref<StreamPlayback>({
    lastPlayPosition: 0,
    maxPlayPosition: 0,
    totalWatchTime: 0,
    maxVideoLength: 0
  });

  // --- Health metrics ---
  const health = ref<StreamHealth>({
    bitrate: 0,
    loadTime: 0,
    chunkDuration: 0
  });

  // --- Error state ---
  const error = ref<{ code: number; title: string; message: string } | null>(
    null
  );

  // --- Computed ---
  const playerType = computed(() => streamSettings.value?.player ?? "jwplayer");
  const isArchive = computed(
    () => streamSettings.value?.sessionType === "Archive"
  );

  // --- Actions ---
  function setStreamSettings(value: StreamSettings | null) {
    streamSettings.value = value;
  }

  async function fetchStreamSettings(params: Record<string, string>) {
    try {
      const data = await $fetch<StreamSettings>("/api/extension/config", {
        method: "GET",
        query: params
      });
      console.log("Fetched stream settings:", data);
      setStreamSettings(data);
      return data;
    } catch (err) {
      console.error("Error fetching streaming config:", err);
      throw err;
    }
  }

  function setPlaybackState(state: Partial<StreamPlayback>) {
    Object.assign(playback.value, state);
  }

  function setHealthMetrics(metrics: Partial<StreamHealth>) {
    Object.assign(health.value, metrics);
  }

  function setError(
    err: { code: number; title: string; message: string } | null
  ) {
    error.value = err;
  }

  function setPlayerState(state: {
    playing?: boolean;
    buffering?: boolean;
    ready?: boolean;
  }) {
    if (state.playing !== undefined) isPlaying.value = state.playing;
    if (state.buffering !== undefined) isBuffering.value = state.buffering;
    if (state.ready !== undefined) isReady.value = state.ready;
  }

  function reset() {
    streamSettings.value = null;
    isPlaying.value = false;
    isBuffering.value = false;
    isReady.value = false;
    error.value = null;
    playback.value = {
      lastPlayPosition: 0,
      maxPlayPosition: 0,
      totalWatchTime: 0,
      maxVideoLength: 0
    };
    health.value = { bitrate: 0, loadTime: 0, chunkDuration: 0 };
  }

  return {
    // State
    streamSettings,
    isPlaying,
    isBuffering,
    isReady,
    playback,
    health,
    error,
    // Computed
    playerType,
    isArchive,
    // Actions
    setStreamSettings,
    fetchStreamSettings,
    setPlaybackState,
    setHealthMetrics,
    setError,
    setPlayerState,
    reset
  };
});
