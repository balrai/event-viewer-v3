export const useLiveStateStore = defineStore("liveState", () => {
  const liveState = useState("liveState", () => null as any);

  function setLiveState(value: any) {
    liveState.value = value;
    console.log("Live state updated:", value);
  }

  return {
    liveState,
    setLiveState
  };
});
