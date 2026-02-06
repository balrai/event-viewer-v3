declare global {
  interface Session {}

  interface Event {}
  interface LiveStreamingState {
    action: string;
    extInstanceId: string;
    extension: string;
    state: string;
    status: string;
  }
  interface LiveState {
    LiveStreaming: LiveStreamingState;
    eventId: string;
    sessionId: string;
  }

  interface LiveStreamingConfig {
    player: string;
    amazonIvs: Object;
    ivsRealTime: Object;
    locations: string[];
    recoveryFrequency: number;
    state: string;
    status: string;
    streamingUrl: string[][];
  }
}
