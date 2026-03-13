type LiveState = {
  sessionId: string;
  [key: string]: any;
};
export const useLiveStateStore = defineStore("liveState", () => {
  const liveState = useState("liveState", () => null as LiveState | null);
  const liveStateBuffer = useState(
    "liveStateBuffer",
    () => ({}) as Record<number, any>
  );
  const streamingStore = useStreamingStore();
  const { isSyncActive, playerLoader } = storeToRefs(streamingStore);

  function setLiveState(value: LiveState | null) {
    liveState.value = value;
  }

  function setLiveStateBuffer(timestamp: number, value: any) {
    const currentBuffer = liveStateBuffer.value || {};
    liveStateBuffer.value = {
      ...currentBuffer,
      [timestamp]: value
    };
    console.log("Buffering live state:", liveStateBuffer.value);
  }

  function setLiveStateFromBuffer(timestamp: number) {
    if (liveStateBuffer.value && liveStateBuffer.value[timestamp]) {
      liveState.value = liveStateBuffer.value[timestamp];
      delete liveStateBuffer.value[timestamp];
    }
  }
  function processLiveState(data: any) {
    console.log("Updating live state with:", data);
    if (
      data &&
      data.sessionId === (liveState.value as LiveState)?.sessionId &&
      data.liveState &&
      data.liveState.extensions
    ) {
      // if no metaInject or IVS is enabled.
      console.log(
        "issyncactive:",
        isSyncActive.value,

        "isPlaying",
        playerLoader.value?.isPlaying
      );
      if (isSyncActive.value && playerLoader.value?.isPlaying) {
        setLiveStateBuffer(data.timestamp, data.liveState);
      } else {
        liveState.value = {
          ...liveState.value,
          ...data.liveState
        };
      }
    }
  }

  onMounted(() => {
    window.addEventListener("nova.connector.command.session", (e: any) => {
      // const { topicId, data } = e.detail;
      // if (topicId === liveState.value?.sessionId) {
      //   setLiveStateFromBuffer(data.timestamp);
      //   switch (data.command) {
      //     case "livestate.timestamp":
      //       setLiveStateFromBuffer(data.timestamp);
      //       break;
      //     default:
      //       console.warn("Unknown livestate command:", data.command);
      //       break;
      //   }
      // }
      console.log("Received nova.connector.command.session event:", e);
    });
  });

  onUnmounted(() => {
    window.removeEventListener("nova.connector.command.session", () => {});
    liveState.value = null;
    liveStateBuffer.value = {};
  });

  return {
    liveState,
    setLiveState,
    setLiveStateFromBuffer,
    processLiveState
  };
});
