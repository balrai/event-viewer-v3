import { generateClient } from "aws-amplify/api";

interface LiveStateUpdate {
  eventId: string;
  sessionId: string;
  LiveStreaming?: {
    action: string;
    state: string;
    status: string;
    streamUrl?: string;
    extInstanceId?: string;
  };
  Quiz?: {
    markers: any[];
    action: string;
  };
  SlideShow?: {
    action: string;
    slide: number;
  };
  showStatus?: Record<string, any>;
}

let client: ReturnType<typeof generateClient> | null = null;
let subscription: { unsubscribe: () => void } | null = null;

export function useAppSyncSubscription() {
  const streamingStore = useStreamingStore();
  const liveStateStore = useLiveStateStore();
  const viewerStore = useViewerStore();
  const authStore = useAuthStore();

  const isConnected = ref(false);
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 10;

  function getClient() {
    if (!client) {
      client = generateClient();
    }
    return client;
  }

  function handleLiveStateUpdate(data: LiveStateUpdate) {
    console.log("[AppSync] Live state update:", data);

    // Route to liveState store (central state for all extensions)
    liveStateStore.setLiveState(data);

    // Route streaming-specific changes
    if (data.LiveStreaming) {
      handleStreamingUpdate(data.LiveStreaming);
    }

    // Route show status changes
    if (data.showStatus) {
      viewerStore.setShowStatus(data.showStatus);
    }
  }

  function handleStreamingUpdate(streaming: LiveStateUpdate["LiveStreaming"]) {
    if (!streaming) return;

    switch (streaming.action) {
      case "start":
        streamingStore.setStreamSettings({
          ...streamingStore.streamSettings!,
          streamUrl: streaming.streamUrl
        });
        streamingStore.setPlayerState({ playing: true });
        break;

      case "stop":
        streamingStore.setPlayerState({ playing: false });
        break;

      case "urlChange":
        streamingStore.setStreamSettings({
          ...streamingStore.streamSettings!,
          streamUrl: streaming.streamUrl
        });
        break;

      default:
        console.warn("[AppSync] Unknown streaming action:", streaming.action);
    }
  }

  function subscribe(eventId: string, sessionId: string) {
    unsubscribe(); // Clean up any existing subscription

    const gqlClient = getClient();
    const { user } = storeToRefs(authStore);

    const query = /* GraphQL */ `
      subscription OnLiveStateUpdate($eventId: String!, $sessionId: String!) {
        onLiveStateUpdate(eventId: $eventId, sessionId: $sessionId) {
          eventId
          sessionId
          LiveStreaming {
            action
            state
            status
            streamUrl
            extInstanceId
          }
          Quiz {
            markers
            action
          }
          SlideShow {
            action
            slide
          }
          showStatus
        }
      }
    `;

    try {
      const observable = gqlClient.graphql({
        query,
        variables: { eventId, sessionId }
      });

      subscription = (observable as any).subscribe({
        next: ({ data }: { data: { onLiveStateUpdate: LiveStateUpdate } }) => {
          isConnected.value = true;
          reconnectAttempts.value = 0;
          handleLiveStateUpdate(data.onLiveStateUpdate);
        },
        error: (err: any) => {
          console.error("[AppSync] Subscription error:", err);
          isConnected.value = false;
          attemptReconnect(eventId, sessionId);
        },
        complete: () => {
          console.log("[AppSync] Subscription completed");
          isConnected.value = false;
        }
      });

      console.log("[AppSync] Subscribed to live state updates");
    } catch (err) {
      console.error("[AppSync] Failed to subscribe:", err);
      isConnected.value = false;
    }
  }

  function attemptReconnect(eventId: string, sessionId: string) {
    if (reconnectAttempts.value >= maxReconnectAttempts) {
      console.error("[AppSync] Max reconnect attempts reached");
      return;
    }

    reconnectAttempts.value++;
    const delay = Math.min(1000 * 2 ** reconnectAttempts.value, 30000);

    console.log(
      `[AppSync] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.value})`
    );

    setTimeout(() => {
      subscribe(eventId, sessionId);
    }, delay);
  }

  function unsubscribe() {
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }
    isConnected.value = false;
  }

  return {
    isConnected: readonly(isConnected),
    reconnectAttempts: readonly(reconnectAttempts),
    subscribe,
    unsubscribe
  };
}
