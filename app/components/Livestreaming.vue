<script lang="ts" setup>
import { onMounted, onBeforeUnmount, computed, type Ref } from "vue";
import JWPlayer from "~/components/LivestreamingPlayers/JWPlayer.vue";
import VideoJS from "~/components/LivestreamingPlayers/VideoJSPlayer.vue";
import IVSRealtimePlayer from "~/components/LivestreamingPlayers/IVSRealtimePlayer.vue";

type LiveState = {
  eventId: string;
  sessionId: string;
  LiveStreaming: {
    action: string;
    extInstanceId: string;
    extension: string;
    state: string;
    status: string;
  };
  Quiz: {
    markers: any[];
  };
};

const viewerStore = useViewerStore();
const liveStateStore = useLiveStateStore();
const streamingStore = useStreamingStore();
const { createPlayer, destroyPlayer, getLoader } = usePlayerManager();

const { liveState } = storeToRefs(liveStateStore);
const { session } = storeToRefs(viewerStore) as unknown as { session: any };
const { streamSettings, error: streamError } = storeToRefs(streamingStore);

const sessionType = computed(() => session.value?.sessionType ?? "");
const quizMarkers = computed(() => liveState.value?.Quiz?.markers ?? []);

const params = {
  eventId: liveState.value?.eventId as string,
  sessionId: liveState.value?.sessionId as string,
  instanceId: liveState.value?.LiveStreaming?.extInstanceId as string
};
const playerComponents: Record<string, any> = {
  jwplayer: JWPlayer,
  videojs: VideoJS,
  ivsplayer: VideoJS,
  ivsrealtime: IVSRealtimePlayer
};

const currentPlayerComponent = computed(() => {
  const type = streamingStore.playerType;
  return playerComponents[type] ?? JWPlayer;
});

const currentLoader = computed(() => getLoader());

onMounted(async () => {
  await streamingStore.fetchStreamSettings(params);
});

onBeforeUnmount(() => {
  destroyPlayer();
});

watch(streamSettings, async (newSettings) => {
  if (newSettings) {
    await createPlayer(
      { ...newSettings, sessionType: sessionType.value },
      quizMarkers.value
    );
  }
});
</script>

<template>
  <div class="livestreaming-container">
    <component
      v-if="currentLoader"
      :is="currentPlayerComponent"
      :key="streamingStore.playerType"
      :extLoader="currentLoader"
    />
    <div v-if="streamError" class="livestreaming-error-container">
      <table>
        <tbody>
          <tr>
            <td>
              <div class="msg-title">
                <h3
                  class="livestreaming-error-title"
                  v-html="streamError.title"
                ></h3>

                <div class="dots">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>

              <p
                class="livestreaming-error-message"
                v-html="streamError.message"
              ></p>
              <!-- <p class="livestreaming-error-code">#{{ streamError.code }}</p> -->
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.livestreaming-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.livestreaming-error-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: center center no-repeat url("/assets/images/bg.video.jpg");
  background-size: cover;
}
h3 {
  margin: 0;
  font-size: 1.5em;
  color: #6d6d6d;
}
.livestreaming-error-message {
  margin: 0.5em 0 0;
  font-size: 1em;
  color: #6d6d6d;
}
.msg-title {
  display: flex;
  align-items: baseline;
  gap: 0.5em;
}
.dots span {
  opacity: 0;
  animation: dot-fade 1.2s infinite;
  font-size: 2em;
}
.dots span:nth-child(2) {
  animation-delay: 0.4s;
}
.dots span:nth-child(3) {
  animation-delay: 0.8s;
}

@keyframes dot-fade {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}
</style>
