<script setup lang="ts">
import SortableHelper from "~/lib/nwv2-client-lib/classes/Utils/SortableHelper";

const slideSyncStore = useSlideSyncStore();
const { slides, currentSlideUrl } = storeToRefs(slideSyncStore);
const liveStateStore = useLiveStateStore();
const { liveState } = storeToRefs(liveStateStore) as unknown as {
  liveState: any;
};

const params = {
  eventId: liveState.value.eventId,
  sessionId: liveState.value.sessionId,
  instanceId: liveState.value.SlideShow.extInstanceId
};

watch(
  liveState,
  (newVal, oldVal) => {
    console.log("Live state changed:", newVal);
    console.log("LIve state old value:", oldVal);
    slideSyncStore.setSlideShowState(newVal.SlideShow);
  },
  { deep: true }
);

onMounted(async () => {
  console.log("SlideShow component mounted with params:", params);
  // Listen for the custom event emitted by the livestreaming extension
  window.addEventListener("nova.extension.livestreaming.time", (event: any) => {
    const currentTime = event.detail.time.position; // JWPlayer position
    // slideSyncStore.syncWithTime(currentTime);
  });

  const data = await slideSyncStore.fetchSlideshowSettings(params);
  if (data) {
    console.log("Fetched slideshow settings:", data);
  } else {
    console.error("Failed to fetch slideshow settings");
  }
});

onMounted(async () => {
  console.log("slides:", slides.value);
});
</script>

<template>
  <div class="slideshow-container">
    <img v-if="currentSlideUrl" :src="currentSlideUrl" />
    <img v-else-if="slides.length > 0" :src="slides[0]?.fileUrl" />
    <div v-else class="slide-placeholder">Waiting for stream...</div>
  </div>
</template>

<style scoped>
.slideshow-container img {
  width: 100%;
  height: auto;
}
</style>
