<script lang="ts" setup>
import IVSRealtimeLoader from "@/viewer/livestreaming/players/IVSRealtimeLoader";
import { nextTick } from "vue";

const { extLoader } = defineProps<{
  extLoader: IVSRealtimeLoader;
}>();

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
const playerId = computed(() => (extLoader ? extLoader.playerId : null));

const videoPlayer = ref<HTMLVideoElement | null>(null);
const isMutedState = ref(false);
const isPlaying = ref(false);
const isLoading = ref(false);
const error = ref({
  title: "Loading Live Stream...",
  message: "Please wait while the live stream is being prepared."
});

watch(
  () => extLoader.loading,
  (newVal) => {
    console.log("new value:", newVal, "\n isPlaying:", isPlaying.value);
    isLoading.value = !!newVal;
    if (newVal) {
      isPlaying.value = false;
    }
    console.log("Loading state changed:", newVal);
  },
  { immediate: true } // Run immediately when component mounts
);

function unmute() {
  if (videoPlayer.value) {
    videoPlayer.value.muted = false;
  }
}

function handleVolumeChange() {
  if (videoPlayer.value) {
    isMutedState.value = videoPlayer.value.muted;
  }
}
function onPlay() {
  isPlaying.value = true;
}
function onPlaying() {
  console.log("playing");
  isPlaying.value = true;
}
function onPause() {
  console.log("pause");
}
function onEnded() {
  console.log("ended");
  isPlaying.value = false;
}
function onError() {
  console.log("error");
  isPlaying.value = false;
}

onMounted(() => {
  console.log("user::", user.value);
  nextTick(() => {
    console.log("playerloader::", extLoader);
    extLoader.setVideoElement(videoPlayer.value);
    extLoader.startIvsRealtimeStream();
    // Initial mute state
    isMutedState.value = videoPlayer.value?.muted ?? false;

    // Set up event listeners with named functions for proper cleanup
    videoPlayer.value?.addEventListener("volumechange", handleVolumeChange);
    videoPlayer.value?.addEventListener("play", onPlay);
    videoPlayer.value?.addEventListener("playing", onPlaying);
    videoPlayer.value?.addEventListener("pause", onPause);
    videoPlayer.value?.addEventListener("ended", onEnded);
    videoPlayer.value?.addEventListener("error", onError);
  });
});
onBeforeUnmount(() => {
  videoPlayer.value?.removeEventListener("volumechange", handleVolumeChange);
  videoPlayer.value?.removeEventListener("play", onPlay);
  videoPlayer.value?.removeEventListener("playing", onPlaying);
  videoPlayer.value?.removeEventListener("pause", onPause);
  videoPlayer.value?.removeEventListener("ended", onEnded);
  videoPlayer.value?.removeEventListener("error", onError);
  extLoader.stopIvsRealtimeStream();
});
</script>

<template>
  <div style="height: 100%">
    <div class="realtime-container">
      <button id="unmute-rt" v-if="isMutedState && isPlaying" @click="unmute">
        <img src="@/assets/images/unmute_w.png" alt="Unmute" />
      </button>
      <video
        class="ivs-realtime"
        ref="videoPlayer"
        playsinline
        controls
        autoplay
        muted
      ></video>
      <div class="ivs-realtime-error-container"></div>
    </div>
    <!--<div v-if="!isPlaying" class="livestreaming-error-container">
       <table>
        <tr>
          <td>
            <h3 class="livestreaming-error-title" v-html="error.title"></h3>
            <p class="livestreaming-error-message" v-html="error.message"></p>
          </td>
        </tr>
      </table>
    </div>-->
    <!-- loading spinner -->
    <div v-if="!isPlaying || isLoading" class="loading-spinner-container">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<style>
.extension-container[extension="livestreaming"] .ivs-realtime {
  width: 100% !important;
  height: 100% !important;
  background: #000;
}
.realtime-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.realtime-container #unmute-rt {
  position: absolute;
  z-index: 1;
  top: 10px;
  left: 10px;
  padding: 0;
  border: none;
  background: none;
  color: #6d6d6d;
  width: 15%;
  min-width: 90px;
  max-width: 110px;
}

#unmute-rt img {
  width: 100%;
  cursor: pointer;
}

.loading-spinner-container {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  z-index: 99;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  #unmute-rt {
    top: 20px;
    left: 5px;
  }
}
</style>
