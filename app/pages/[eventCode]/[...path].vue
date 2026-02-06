<script lang="ts" setup>
import Error404 from "@/components/Error404View.vue";
import Loading from "@/components/LoadingView.vue";
// import SlideShow from "@/components/SlideShow.vue";
import LiveStreaming from "@/components/Livestreaming.vue";
import ProjectStageBadge from "@/components/ProjectStageBadge.vue";
import ConnectionStatus from "@/components/ConnectionStatus.vue";
import { reactive, ref, computed, onMounted, onBeforeUnmount } from "vue";
import { onBeforeRouteLeave } from "vue-router";

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
const { event, head, body } = storeToRefs(viewerStore);

const { data: eventData, pending } = await useFetch<EventData>(`/api/resolve`, {
  params: {
    eventCode,
    path: webpagePath
  }
});

console.log("Fetched event data:", eventData.value);

if (eventData.value) {
  if (eventData.value.error) {
    viewerStore.setError(eventData.value.error);
  }
  if (eventData.value.session) {
    viewerStore.setSession(eventData.value.session);
  }
  if (eventData.value.liveState) {
    viewerStore.setLiveState(eventData.value.liveState);
  }
  viewerStore.setEvent(eventData.value);
  viewerStore.setTemplate(eventData.value.htmlContent);
  viewerStore.setCurrentPath(webpagePath);
  viewerStore.setEventCode(eventCode);
}

useHead(head.value);

onMounted(() => {
  console.log("Event data on mount:", event.value);
});

// const state: any = reactive({
//   rehearsal: "", //sessionStorage.getItem("rehearsal"),
//   token: "", //sessionStorage.getItem("token"),
//   viewer: null,
//   heartbeatBmpSecondsPerBeat: 30,
//   heartbeatInterval: null,
//   isLoading: false,
//   showError404: false,
//   currentPath: null,
//   requestedPath: null,
//   eventExtension: null,
//   sessionExtension: null,
//   eventPageExtension: null,
//   extensionsProps: reactive([]),
//   extensions: {
//     slideshow: {
//       active: false,
//       class: null,
//       componentName: "SlideShow",
//       extLoader: null
//     },
//     livestreaming: {
//       active: false,
//       class: null,
//       componentName: "LiveStreaming",
//       extLoader: null
//     },
//     poll: {
//       active: false,
//       class: null,
//       componentName: "Poll",
//       extLoader: null
//     },
//     survey: {
//       active: false,
//       class: null,
//       componentName: "Survey",
//       extLoader: null
//     },
//     quiz: {
//       active: false,
//       class: null,
//       componentName: "Quiz",
//       extLoader: ref(null)
//     }
//   },
//   showStatus: {},
//   sessionShowStatus: {},
//   autoStartStarted: false,
//   autoEndEnded: false,
//   pingInterval: null
// });

// const isConnecting = computed(() => {
//   return (
//     !state.viewer ||
//     !state.viewer.connector ||
//     !state.viewer.connector.isConnected
//   );
// });

// const connectAttempts = computed(() => {
//   if (
//     state.viewer &&
//     state.viewer.connector &&
//     state.viewer.connector.connectAttempts
//   )
//     return state.viewer.connector.connectAttempts;
//   return 0;
// });

// function getWebpagePath(path = null, leadingSlash = false) {
//   const prefix = leadingSlash ? "/" : "";
//   if (path) return `${prefix}${eventCode}/${path}`;
//   return `${prefix}${eventCode}`;
// }

// function heartbeat() {
//   clearInterval(state.heartbeatInterval);
//   state.viewer?.api?.heartbeat();
//   if (state.heartbeatBmpSecondsPerBeat > 0) {
//     state.heartbeatInterval = setTimeout(() => {
//       heartbeat();
//     }, state.heartbeatBmpSecondsPerBeat * 1000);
//   }
// }

// function resolvePath() {
//   state.isLoading = true;
//   state.showError404 = false;
//   state.currentPath = state.eventPath;
//   const loadingPath = state.currentPath;
//   clearInterval(state.heartbeatInterval);
//   state.viewer.connector.disconnectFromSession();

//   state.viewer.api
//     .resolvePath(state.eventPath, state.rehearsal)
//     .then((pathInfo: any) => {
//       if (loadingPath != state.currentPath) return;
//       const { event, session, url: iframeUrl, path } = pathInfo;
//       const { endShow, showStatus } = event;

//       if (
//         endShow &&
//         endShow.enabled &&
//         endShow.redirectUrl &&
//         (endShow.state == "Started" ||
//           (endShow.autoStart && new Date().getTime() >= endShow.startAt))
//       ) {
//         window.location.href = endShow.redirectUrl;
//         return false;
//       }

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

//       state.viewer.api.getSocialNetworkTopic().then((topic: any) => {
//         state.viewer.connector.connectToSocialNetwork(topic);
//       });

//       state.viewer.connector.forEachExtension((ext: any) => {
//         ext.bridgeParams = { eventId, sessionId, languages };
//         ext.setApiParams({ eventId, sessionId, accessToken, languages });
//       });

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

//         state.viewer.api
//           .getLiveState()
//           .then((liveState: any) => {
//             state.viewer.connector.loadSettings({ eventId, sessionId });
//             state.viewer.connector.loadLiveState(liveState);
//             state.viewer.connector.connectToSession(sessionId);
//             state.viewer.connector.connectToEvent(eventId);
//             state.viewer.connector.extensions.eventpage.loadUrl(iframeUrl);
//           })
//           .finally(() => {
//             state.isLoading = false;
//           });
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

// async function initializeWebSocket() {
//   const websocketDomain = await state.viewer.api.getViewerWebSocketEndpoint();
//   if (!websocketDomain) {
//     console.error(
//       "WebSocket domain is not defined in the environment variables"
//     );
//     return;
//   }

//   state.viewer.api.initWebSocket(websocketDomain, (event: any) => {
//     const message = JSON.parse(event.data);
//     console.log("Received WebSocket message:", message);
//   });

//   startPingInterval();
// }

// function startPingInterval() {
//   if (state.pingInterval) clearInterval(state.pingInterval);
//   state.pingInterval = setInterval(() => sendPing(), 120000);
// }
// function sendPing() {
//   state.viewer.api.sendPing();
//   console.log("Ping sent at:", new Date().toISOString());
// }
// function disconnectWebSocket() {
//   state.viewer.api.disconnectWebSocket();
// }

// onBeforeUnmount(() => {
//   disconnectWebSocket();
// });

// onMounted(() => {
//   const currURL = new URL(window.location.href);
//   const viewerState = currURL.searchParams.get("viewer");
//   if (sessionStorage.getItem("rehearsal") == null) {
//     viewerState === "rehearsal"
//       ? sessionStorage.setItem("rehearsal", "true")
//       : sessionStorage.setItem("rehearsal", "false");
//     state.rehearsal = sessionStorage.getItem("rehearsal");
//   }

// Viewer.init("#dom").then((v: any) => {
//   state.viewer = v;
//   state.eventExtension = v.eventExtension;
//   state.sessionExtension = v.sessionExtension;
//   state.eventPageExtension = v.eventPageExtension;
//   state.extensions.slideshow.extLoader = v.slideShowExtension;
//   state.extensions.livestreaming.extLoader = v.liveStreamingExtension;
//   state.extensions.poll.extLoader = v.pollExtension;
//   state.extensions.survey.extLoader = v.surveyExtension;
//   state.extensions.quiz.extLoader = v.quizExtension;

//   if (state.rehearsal == "true") {
//     if (state.token == null) {
//       const urltoken = currURL.searchParams.get("token");
//       sessionStorage.setItem("token", urltoken || "");
//       state.token = sessionStorage.getItem("token");
//     }
//     const tokenExp = currURL.searchParams.get("tokenExp");
//     const rehearsalEventCode = getWebpagePath(null, true);
//     let eventCode = getWebpagePath(null, true);
//     let token = state.token;
//     if (state.token) {
//       state.viewer.api.saveAccessToken(
//         state.token,
//         tokenExp,
//         rehearsalEventCode
//       );
//       state.viewer.connector.forEachExtension((ext: any) =>
//         ext.setApiParams({ token, tokenExp })
//       );
//     } else {
//       state.viewer.api.removeAccessToken(eventCode);
//     }
//   }

//   window.addEventListener("nova.viewer.api.token", (evt: any) => {
//     const { accessToken, accessTokenExp } = evt.detail.data;
//     const eventCode = getWebpagePath(null, true);
//     if (accessToken) {
//       state.viewer.api.saveAccessToken(
//         accessToken,
//         accessTokenExp,
//         eventCode
//       );
//       state.viewer.connector.forEachExtension((ext: any) => {
//         ext.setApiParams({ accessToken, accessTokenExp });
//       });
//     } else {
//       state.viewer.api.removeAccessToken(eventCode);
//     }
//   });

//   state.eventPageExtension.gotoHandler = (path: any) => {
//     state.requestedPath = path;
//   };
//   resolvePath();

//   state.eventPageExtension.onExtensionsDetected = (newProps: any) => {
//     state.extensionsProps.splice(
//       0,
//       state.extensionsProps.length,
//       ...newProps
//     );
//   };
// });
// });

// onBeforeRouteLeave(() => {
//   clearInterval(state.heartbeatInterval);
// });
</script>

<template>
  <div id="dom" style="width: 100%; height: 100%">
    <!-- <ProjectStageBadge /> -->
    <!-- <ConnectionStatus
      v-if="!pending && !loading && !error"
      :is-connecting="isConnecting"
      :connect-attempts="connectAttempts"
    /> -->
    <!-- <Loading v-if="pending || loading" /> -->
    <!-- <Error404 v-else-if="error" /> -->
    <div v-if="body" v-html="body"></div>
  </div>
</template>
