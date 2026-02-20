<script lang="ts" setup>
import { onMounted, onBeforeUnmount, computed, type Ref } from "vue";
import JWPlayer from "~/components/LivestreamingPlayers/JWPlayer.vue";
import VideoJS from "~/components/LivestreamingPlayers/VideoJSPlayer.vue";

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
  eventId: liveState.value.eventId,
  sessionId: liveState.value.sessionId,
  instanceId: liveState.value.LiveStreaming.extInstanceId
};

const playerComponents: Record<string, any> = {
  jwplayer: JWPlayer,
  videojs: VideoJS,
  ivsplayer: VideoJS
};

const currentPlayerComponent = computed(() => {
  const type = streamingStore.playerType;
  console.log("typee:", type);
  console.log("type::", playerComponents[type]);
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
  console.log("Stream settings updated:", newSettings);
  console.log("current player component:", currentPlayerComponent.value);
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
              <h3
                class="livestreaming-error-title"
                v-html="streamError.title"
              ></h3>
              <p
                class="livestreaming-error-message"
                v-html="streamError.message"
              ></p>
              <p class="livestreaming-error-code">#{{ streamError.code }}</p>
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
</style>
