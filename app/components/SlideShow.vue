<script setup lang="ts">
const slideStore = useSlideSyncStore();
const viewerStore = useViewerStore();

const { liveState } = storeToRefs(viewerStore) as unknown as {
  liveState: any;
};

const params = {
  eventId: liveState.value.eventId,
  sessionId: liveState.value.sessionId,
  instanceId: liveState.value.SlideShow.extInstanceId
};

onMounted(async () => {
  // Listen for the custom event emitted by JWPlayerLoader.ts
  window.addEventListener("nova.extension.livestreaming.time", (event: any) => {
    const currentTime = event.detail.time.position; // JWPlayer position
    slideStore.syncWithTime(currentTime);
  });

  const data = await slideStore.fetchSlideshowSettings(params);
});

onMounted(async () => {});
</script>

<template>
  <div class="slide-sync-container">
    <img v-if="slideStore.currentSlideUrl" :src="slideStore.currentSlideUrl" />
    <div v-else class="slide-placeholder">Waiting for stream...</div>
  </div>
</template>

<style scoped>
.slide-sync-container img {
  width: 100%;
  height: auto;
}
</style>
