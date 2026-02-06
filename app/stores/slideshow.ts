export const useSlideSyncStore = defineStore("slidesync", () => {
  const slideSyncSettings = useState("slidesyncLiveState", () => null as any);

  const slides = ref<Array<{ url: string; time: number }>>([]);
  const currentSlideUrl = ref<string>("");

  function setSlides(data: any[]) {
    // Expecting data like: [{ url: '...', time: 0 }, { url: '...', time: 60 }]
    slides.value = data.sort((a, b) => a.time - b.time);
  }

  function setSlideSyncSettings(value: any) {
    slideSyncSettings.value = value;
  }
  function syncWithTime(currentTime: number) {
    // Find the last slide that is less than or equal to current time
    const activeSlide = [...slides.value]
      .reverse()
      .find((s) => s.time <= currentTime);

    if (activeSlide) {
      currentSlideUrl.value = activeSlide.url;
    }
  }

  async function fetchSlideshowSettings(params: any) {
    try {
      const data = await $fetch("/api/extension/config", {
        method: "GET",
        query: params
      });
      setSlideSyncSettings(data);
      return data;
    } catch (error) {
      console.error("Error fetching streaming state:", error);
      throw error;
    }
  }

  return {
    slideSyncSettings,
    setSlideSyncSettings,
    slides,
    setSlides,
    currentSlideUrl,
    syncWithTime,
    fetchSlideshowSettings
  };
});
