<script lang="ts" setup>
import JWPlayerLoader from "~/viewer/livestreaming/players/JWPlayerLoader";

const { extLoader } = defineProps<{
  extLoader: JWPlayerLoader;
}>();

const playerId = computed(() => {
  return extLoader ? extLoader.playerId : "jwplayer";
});

onMounted(() => {
  console.log("JWPlayer mounted");
  nextTick(() => {
    extLoader.startStream();
  });

  window.addEventListener("message", ({ data }) => {
    if (data.type === "nova.extension.quiz.bridge") {
      console.log("data", data);
      switch (data.data.command) {
        case "submitted":
          // extLoader.resumePlay();
          break;
        default:
          break;
      }
    }
  });
});
onBeforeUnmount(() => {
  extLoader.stopStream();
});
</script>

<template>
  <div :id="playerId" class="jwplayer-container">JWPlayer</div>
</template>

<style scoped>
.extension-container[extension="livestreaming"] .jwplayer-container,
.livestreaming-container .jwplayer {
  width: 100% !important;
  height: 100% !important;
}

.extension-container[extension="livestreaming"] .jw-wrapper {
  background-color: transparent;
}
</style>
