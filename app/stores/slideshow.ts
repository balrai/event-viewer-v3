export const useSlideSyncStore = defineStore("slidesync", () => {
  const slideSyncSettings = useState("slidesyncLiveState", () => null as any);
  const slideShowState = useState("slideshowState", () => null as any);
  const viewerStore = useViewerStore();
  const { eventCode } = storeToRefs(viewerStore);

  const slides = ref<Array<{ fileUrl: string; filename: string }>>([]);
  const currentSlideUrl = computed(() => {
    console.log("Current slideshow state:", slideShowState.value);

    if (slideShowState.value?.status === "Active") {
      const currentSlideIndex = slideShowState.value?.slideIndex;
      return slides.value[currentSlideIndex]?.fileUrl || "";
    } else {
      return slides.value[0]?.fileUrl || "";
    }
  });

  function setSlides(data: any[]) {
    slides.value = data;
  }

  function setSlideSyncSettings(value: any) {
    slideSyncSettings.value = value;
    console.log("Updated slide sync settings:", value);
    setSlides(value.slides || []);
  }

  function setSlideShowState(value: any) {
    slideShowState.value = value;
  }

  async function fetchSlideshowSettings(params: any) {
    try {
      const data = await $fetch(`/${eventCode.value}/extension/config`, {
        method: "GET",
        query: params
      });
      setSlideSyncSettings(data);
      return data;
    } catch (error) {
      console.error("Error fetching streaming state:", error);
      return null;
    }
  }

  return {
    slideSyncSettings,
    setSlideSyncSettings,
    slides,
    setSlides,
    currentSlideUrl,
    fetchSlideshowSettings,
    setSlideShowState
  };
});
