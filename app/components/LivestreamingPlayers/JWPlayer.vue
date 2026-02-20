<script lang="ts" setup>
import type JWPlayerLoader from "~/viewer/livestreaming/players/JWPlayerLoader";

const props = defineProps<{
  extLoader: JWPlayerLoader;
}>();

const playerId = computed(() => props.extLoader?.playerId ?? "jwplayer");

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
  <div :id="playerId" class="jwplayer-container"></div>
</template>

<style scoped>
.extension-container[extension="livestreaming"] .jwplayer-container,
.livestreaming-container .jwplayer-container {
  width: 100% !important;
  height: 100% !important;
}
</style>
