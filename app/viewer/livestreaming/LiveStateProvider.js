import LiveStateProvider from "~/lib/nwv2-client-lib/classes/Viewer/LiveStateProvider";

export default class LiveStreamingLiveStateProvider extends LiveStateProvider {
  constructor(priority, liveStreaming) {
    super(priority);
    this.liveStreaming = liveStreaming;
  }
  get isActive() {
    return (
      (this.isMetaInjectEnabled || this.isAmazonIvsEnabled) && this.isPlaying
    );
  }

  get isMetaInjectEnabled() {
    return (
      this.liveStreaming &&
      this.liveStreaming.streamSettings &&
      this.liveStreaming.streamSettings.wowzaMetaInject &&
      this.liveStreaming.streamSettings.wowzaMetaInject.enabled
    );
  }

  get isAmazonIvsEnabled() {
    return (
      this.liveStreaming &&
      this.liveStreaming.streamSettings &&
      this.liveStreaming.streamSettings.amazonIvs &&
      this.liveStreaming.streamSettings.amazonIvs.timestamp > 0
    );
  }

  get isPlaying() {
    return this.liveStreaming && this.liveStreaming.isPlaying;
  }
}
