import { mqtt5 } from "aws-iot-device-sdk-v2";
import { toUtf8 } from "@aws-sdk/util-utf8-browser";

export function useMqtt() {
  const nuxtApp = useNuxtApp();
  const viewerStore = useViewerStore();
  const liveStateStore = useLiveStateStore();
  const { session, event } = storeToRefs(viewerStore);
  const topics: { [key: string]: (payload: any) => void } = {};
  const { handleEventMessage, handleSessionMessage } = useMessageHandler();

  const mqttClient = (nuxtApp as any).$mqtt() as mqtt5.Mqtt5Client | undefined;

  mqttClient?.on("messageReceived", (eventData: mqtt5.MessageReceivedEvent) => {
    const topic = eventData.message.topicName;
    const raw = eventData.message.payload
      ? toUtf8(eventData.message.payload as Buffer)
      : null;

    if (!raw) return;

    try {
      const payload = JSON.parse(raw);
      if (topics[topic]) {
        topics[topic](payload);
      }
    } catch (e) {
      console.error("[MQTT] Failed to parse message:", raw, e);
    }
  });

  function subscribeToTopic(topic: string, callback?: (payload: any) => void) {
    if (topics[topic]) return;
    if (!mqttClient) {
      return;
    }
    topics[topic] = callback || (() => {});

    mqttClient.subscribe({
      subscriptions: [{ topicFilter: topic, qos: mqtt5.QoS.AtLeastOnce }]
    });
  }

  async function connectToEvent() {
    if (!mqttClient) {
      console.warn("[MQTT] Client not ready");
      setTimeout(connectToEvent, 1000);
      return;
    }
    const eventId = (event.value as any)?.eventId;
    if (!eventId) {
      console.warn("[MQTT] No eventId available");
      return;
    }
    const topic = `${eventId}`;
    subscribeToTopic(topic, (payload) => {
      handleEventMessage(topic, payload);
    });
  }

  async function connectToSession() {
    if (!mqttClient) {
      console.warn("[MQTT] Client not ready");
      setTimeout(connectToSession, 1000);
      return;
    }
    const sessionId = (session.value as any)?.sessionId;
    if (!sessionId) {
      console.warn("[MQTT] No sessionId available");
      return;
    }
    const topic = sessionId;
    subscribeToTopic(topic, (payload) => {
      handleSessionMessage(topic, payload);
    });
  }

  async function unsubscribeToTopic(topic: string) {
    if (!mqttClient) return;
    delete topics[topic];
    await mqttClient.unsubscribe({
      topicFilters: [topic]
    });
  }

  async function unsubscribe() {
    if (!mqttClient) return;
    const topicFilters = Object.keys(topics);
    if (topicFilters.length > 0) {
      for (const topic of topicFilters) {
        delete topics[topic];
        await unsubscribeToTopic(topic);
      }
    }
  }

  // Auto-subscribe once session becomes available
  watch(
    session,
    (newSession: any) => {
      console.log("[MQTT] Session changed:", newSession);
      if (newSession?.sessionId) {
        connectToSession();
      }
    },
    { immediate: true }
  );
  onMounted(() => {
    if ((event.value as any)?.eventId) {
      connectToEvent();
    }
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return { subscribeToTopic, unsubscribeToTopic };
}
