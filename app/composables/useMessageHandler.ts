export const useMessageHandler = () => {
  function handleEventMessage(topic: string, payload: any) {
    console.log(
      "[MessageHandler] Received message on topic:",
      topic,
      "with payload:",
      payload
    );
    // Add your message handling logic here based on the topic and payload
  }
  function handleSessionMessage(topic: string, payload: any) {
    console.log(
      "[MessageHandler] Received session message on topic:",
      topic,
      "with payload:",
      payload
    );
    if (payload.command === "livestate") {
      const liveStateStore = useLiveStateStore();
      liveStateStore.processLiveState(payload);
    }
  }

  return {
    handleEventMessage,
    handleSessionMessage
  };
};
