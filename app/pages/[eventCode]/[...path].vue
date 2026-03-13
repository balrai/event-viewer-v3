<script lang="ts" setup>
import Error404 from "@/components/Error404View.vue";
import Loading from "@/components/LoadingView.vue";
import ProjectStageBadge from "@/components/ProjectStageBadge.vue";
import ConnectionStatus from "@/components/ConnectionStatus.vue";
import { reactive, ref, computed, onMounted, onBeforeUnmount } from "vue";
import { generateClient } from "aws-amplify/api";

interface EventData {
  error?: string;
  event: any;
  htmlContent: string;
  session?: any;
  userSession?: any;
  path: string | null;
  liveState?: any;
}

const route = useRoute();
const eventCode = route.params.eventCode as string;
const webpagePath = route.params.path
  ? (route.params.path as string[]).join("/")
  : null;

const viewerStore = useViewerStore();
const authStore = useAuthStore();
const liveStateStore = useLiveStateStore();
const {
  subscribe: subscribeToLiveState,
  unsubscribe: unsubscribeFromLiveState,
  isConnected
} = useAppSyncSubscription();
const { user } = storeToRefs(authStore);
const { event, head, body } = storeToRefs(viewerStore);

const {
  data: eventData,
  pending,
  error
} = await useFetch<EventData>(`/${eventCode}/resolve`, {
  params: {
    eventCode,
    path: webpagePath
  }
});

if (eventData.value) {
  const { event, session, liveState, path } = eventData.value;
  const { endShow, showStatus } = event;

  if (eventData.value.error) {
    viewerStore.setError(eventData.value.error);
  }
  if (session) {
    viewerStore.setSession(session);
  }
  if (liveState) {
    liveStateStore.setLiveState(liveState);
  }

  if (
    endShow &&
    endShow.enabled &&
    endShow.redirectUrl &&
    (endShow.state == "Started" ||
      (endShow.autoStart && new Date().getTime() >= endShow.startAt))
  ) {
    window.location.href = endShow.redirectUrl;
  }
  viewerStore.setEvent(eventData.value);
  console.log("Event data loaded:", eventData.value);
  viewerStore.setTemplate(eventData.value.htmlContent);
  viewerStore.setCurrentPath(webpagePath);
  viewerStore.setEventCode(eventCode);
}

useHead(head.value);

let client: any = null;
let subscription: any = null;

const fetchState = async () => {
  if (!client) return;

  const query = `
    query GetUser {
      getUser(id: 1) {
        id
        name
        email
      }
    }`;

  try {
    const response = await client.graphql({
      query,
      authMode: "lambda",
      authToken: user.value?.accessToken
    });

    console.log("GraphQL response:", response);
  } catch (error) {
    console.error("GraphQL error:", error);
  }
};

function subscribeToUserUpdates() {
  if (!client) return;

  const onPutUser = client.graphql({
    query: `
      subscription userAdded {
        userAdded {
          id
          name
          email
        }
      }`
  }) as any;

  subscription = onPutUser.subscribe({
    next: (response: any) => {
      console.log("User updated:", response);
    },
    error: (error: any) => {
      console.error("Subscription error:", error);
    }
  });
}

onMounted(async () => {
  client = generateClient();
  viewerStore.replaceEventLinks();
  useMqtt();

  // fetchState();
  // subscribeToUserUpdates();
});

onBeforeUnmount(() => {
  // Clean up any subscriptions or intervals here
  if (subscription) {
    subscription.unsubscribe();
  }
});

// function resolvePath() {

//   state.viewer.api
//     .resolvePath(state.eventPath, state.rehearsal)
//     .then((pathInfo: any) => {
//       if (loadingPath != state.currentPath) return;
//

//

//       if (showStatus !== undefined) {
//         if (
//           showStatus &&
//           showStatus.enabled &&
//           showStatus.redirectUrl &&
//           (showStatus.state == "Started" ||
//             (showStatus.autoEnd && new Date().getTime() >= showStatus.endAt))
//         ) {
//           window.location.href = showStatus.redirectUrl;
//           return false;
//         }

//         if (path !== "accessPage") {
//           if (path === "Event") {
//             if (
//               showStatus.autoStart &&
//               new Date().getTime() <= showStatus.startAt
//             ) {
//               checkShowStatusAutoStart("Event");
//             } else if (
//               showStatus.autoEnd &&
//               new Date().getTime() <= showStatus.endAt
//             ) {
//               checkShowStatusAutoEnd("Event");
//             }
//           }
//           if (path === "Session") {
//             checkSessionStatus().then((response) => {
//               const sessionShowStatus = response;
//               if (
//                 sessionShowStatus.autoStart &&
//                 new Date().getTime() <= sessionShowStatus.startAt
//               ) {
//                 checkShowStatusAutoStart("Session");
//               } else if (
//                 sessionShowStatus.autoEnd &&
//                 new Date().getTime() <= sessionShowStatus.endAt
//               ) {
//                 checkShowStatusAutoEnd("Session");
//               }
//             });
//           }
//         }
//       }

//       const { eventId, sessionId, languages } = state.viewer.api,
//         accessToken = state.viewer.api.loadAccessToken();

//       if (session) {
//         const sessionShowStatus = session.showStatus;
//         if (sessionShowStatus !== undefined) {
//           if (
//             sessionShowStatus &&
//             sessionShowStatus.enabled &&
//             sessionShowStatus.redirectUrl &&
//             (sessionShowStatus.state == "Started" ||
//               (sessionShowStatus.autoStart &&
//                 new Date().getTime() >= sessionShowStatus.startAt))
//           ) {
//             window.location.href = sessionShowStatus.redirectUrl;
//             return false;
//           }
//         }

//       } else {
//         state.viewer.connector.loadSettings({ eventId });
//         state.viewer.connector.connectToEvent(eventId);
//         state.viewer.connector.extensions.eventpage.loadUrl(iframeUrl);
//         state.isLoading = false;
//       }

//       clearInterval(state.heartbeatInterval);
//       if (state.viewer.api.getAccessToken()) {
//         heartbeat();
//         if (state.viewer.api.websocket) {
//           sendPing();
//         } else {
//           initializeWebSocket();
//         }
//       }
//     })
//     .catch((error: any) => {
//       console.error(error);
//       const { response } = error;
//       const { data: responseData } = response || {};
//       const { error: errorCode, message } = responseData || {};
//       if (errorCode) {
//         switch (errorCode) {
//           case "EVENT_NOT_EXIST":
//             state.showError404 = true;
//             break;
//           default:
//             alert(`Error: ${message}\n\n${errorCode}`);
//         }
//       }
//     })
//     .finally(() => {
//       state.isLoading = false;
//     });
// }

// function checkEventStatus() {
//   const { eventId, rehearsal } = state.viewer.api;
//   return state.viewer.api
//     .eventStatus(eventId, rehearsal)
//     .catch((error: any) => {
//       console.error(error);
//     });
// }
// function checkSessionStatus() {
//   const { eventId, sessionId, rehearsal } = state.viewer.api;
//   return state.viewer.api
//     .sessionStatus(eventId, sessionId, rehearsal)
//     .catch((error: any) => {
//       console.error(error);
//     });
// }

// function checkShowStatusAutoStart(path: string) {
//   if (path === "Session") {
//     setInterval(async () => {
//       const status = await checkSessionStatus();
//       if (new Date().getTime() >= status.startAt) window.location.reload();
//     }, 5000);
//   }
//   if (path === "Event") {
//     setInterval(async () => {
//       const status = await checkEventStatus();
//       if (new Date().getTime() >= status.startAt) window.location.reload();
//     }, 5000);
//   }
// }
// function checkShowStatusAutoEnd(path: string) {
//   if (path === "Session") {
//     setInterval(async () => {
//       const status = await checkSessionStatus();
//       if (new Date().getTime() >= status.endAt) window.location.reload();
//     }, 5000);
//   }
//   if (path === "Event") {
//     setInterval(async () => {
//       const status = await checkEventStatus();
//       if (new Date().getTime() >= status.endAt) window.location.reload();
//     }, 5000);
//   }
// }
</script>

<template>
  <div id="dom" style="width: 100%; height: 100%">
    <ProjectStageBadge />
    <Loading v-if="pending" />
    <Error404 v-else-if="error" />
    <div v-if="body" v-html="body"></div>
  </div>
</template>
