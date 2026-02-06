export const useStreamingStore = defineStore("livestreaming", () => {
  const streamSettings = useState("streamSettings", () => null as any);

  const player = computed(() => {
    return streamSettings.value ? streamSettings.value.player : null;
  });

  function setStreamSettings(value: any) {
    streamSettings.value = value;
  }

  async function fetchStreamSettings(params: any) {
    try {
      const data = await $fetch("/api/extension/config", {
        method: "GET",
        query: params
      });
      setStreamSettings(data);
      return data;
    } catch (error) {
      console.error("Error fetching streaming state:", error);
      throw error;
    }
  }

  return {
    streamSettings,
    setStreamSettings,
    fetchStreamSettings,
    player
  };
});
