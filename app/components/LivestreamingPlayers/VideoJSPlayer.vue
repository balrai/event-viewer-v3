<script lang="ts" setup>
import type VideoJsLoader from "~/viewer/livestreaming/players/VideoJsLoader";

const props = defineProps<{
  extLoader: VideoJsLoader;
}>();

const playerId = "videojs";

onMounted(() => {
  nextTick(() => {
    props.extLoader.startStream();
  });
});

onBeforeUnmount(() => {
  props.extLoader.stopStream();
});
</script>

<template>
  <video
    :id="playerId"
    class="video-js"
    controls
    playsinline
    crossOrigin="anonymous"
  ></video>
</template>

<style scoped>
.video-js {
  width: 100% !important;
  height: 100% !important;
  padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
}
</style>
