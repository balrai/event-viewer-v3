<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref, computed, type Ref } from "vue";
import JWPlayer from "~/components/LivestreamingPlayers/JWPlayer.vue";
import JWPlayerLoader from "~/viewer/livestreaming/players/JWPlayerLoader";

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
const streamingStore = useStreamingStore();

const { liveState, session } = storeToRefs(viewerStore) as unknown as {
  liveState: Ref<LiveState>;
  session: any;
};
const sessionType = computed(() => {
  return session.value ? session.value.sessionType : "";
});
const quizMarkers = computed(() => {
  return liveState.value.Quiz.markers || [];
});
console.log("Livestate:", liveState.value);
console.log("Session:", sessionType.value);
const params = {
  eventId: liveState.value.eventId,
  sessionId: liveState.value.sessionId,
  instanceId: liveState.value.LiveStreaming.extInstanceId
};

// console.log("Jata: ", data);
const { streamSettings } = storeToRefs(streamingStore);

console.log("streaming state:", streamSettings.value);
const players = [
  {
    id: "jwplayer",
    component: JWPlayer,
    loader: JWPlayerLoader,
    default: true
  }
  // {
  //   id: 'videojs',
  //   component: VideoJS,
  //   loader: VideoJsLoader,
  // },
  // {
  //   id: 'ivsrealtime',
  //   component: IvsRealtimePlayer,
  //   loader: IvsRealtimeLoader,
  // },
  // {
  //   id: 'ivsplayer',
  //   component: IvsLowLatencyPlayer,
  //   loader: IvsLowLatencyLoader,
  // },
  // {
  //   id: 'shakaPlayer',
  //   component: ShakaPlayer,
  //   loader: ShakaPlayerLoader,
  // },
];

const playerLoader = ref<any>(null);
const error = ref<any>(null);

const currentError = computed(() => {
  return error.value || playerLoader.value?.error || null;
});

const player = computed(
  () =>
    players.find((p) => p.id === streamSettings.value?.player) ||
    players.find((p) => p.default) ||
    players[0]
);

onMounted(async () => {
  await streamingStore.fetchStreamSettings(params);
});

onBeforeUnmount(() => {});
watch(
  streamSettings,
  async (newState, oldState) => {
    if (newState && newState !== oldState) {
      console.log("Loading player loader for:", newState);
      setupPlayerLoader();
    }
  },
  { immediate: true }
);

async function setupPlayerLoader() {
  if (playerLoader.value) {
    playerLoader.value.stopStream();
    playerLoader.value.removePlayerContainer();
    playerLoader.value = null;
  }
  const playerInfo = player.value;
  console.log("playerInfo:", playerInfo);
  if (playerInfo) {
    playerLoader.value = playerInfo.loader
      ? new playerInfo.loader({
          ...streamSettings.value,
          sessionType: sessionType.value,
          quizMarkers: quizMarkers.value
        })
      : null;
  }
}
</script>

<template>
  <div class="livestreaming-container">
    <component
      v-if="playerLoader"
      :is="player?.component"
      :key="player?.id"
      :extLoader="playerLoader"
    />
    <div v-if="currentError" class="livestreaming-error-container">
      <table>
        <tbody>
          <tr>
            <td>
              <h3 class="livestreaming-error-title" v-html="error.title"></h3>
              <p class="livestreaming-error-message" v-html="error.message"></p>
              <p class="livestreaming-error-code">#{{ error.errCode }}</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.nova-livestream-wrapper {
  width: 100%;
  max-width: 100%;
}
.nova-livestream-wrapper video {
  display: block;
}
</style>
