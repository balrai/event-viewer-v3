import ExtensionBase from "../extension/ExtensionBase";

export default class LivestreamingLoader extends ExtensionBase {
  instanceId = "";
  sessionType = "";
  currentStreamIndex = 0;
  maxPlayPosition = 0;
  lastPlayPosition = 0;
  totalWatchTime = 0;
  maxVideoLength = 0;
  retryAttempts = 0;
  maxRetryAttempts = 3;
  retryDelay = 3000; // in milliseconds
  locations: string[] = [];
  locationIndex = 0;
  streamingUrls: string[][] = [];
  sourceType = "";
  isLoading = true;
  seeking = false;
  bufferTimeout: any = null;
  bufferTimeoutWindow = 15;
  tryNextTimeout: any = null;
  hideErrorTimeout: any = null;
  retryInterval: any = null;
  bitrates: number[] = [];
  videoProp: any = null;
  bitratesSampleSize = 5;
  quizMarkers = [];
  currentChunkData: {
    time: number;
    timestamp: number;
    loadTime: number;
    duration: number;
    bitrate: number | string;
  } = {
    time: 0,
    timestamp: Date.now(),
    loadTime: 0,
    duration: 0,
    bitrate: 0
  };
  defaultSettings = {
    name: "livestreaming",
    contentFields: {
      connectionErrorTitle: "Streaming Error",
      connectionErrorMessage:
        "An error has occurred.<br />\nThe player will automatically refresh every {{recoveryFrequency}} second(s).<br />\nAlternatively, please refresh the page.",
      lowBandwidthWarningTitle: "Network Error",
      lowBandwidthWarningMessage:
        "Network connection issues detected.<br />\nPlease check your Internet connection.<br />\nThe player will automatically refresh every {{recoveryFrequency}} second(s)."
    }
  };
  error: { title: string; message: string; errCode: number } | null = null;
  onError:
    | ((
        error: { title: string; message: string; errCode: number } | null
      ) => void)
    | null = null;
  eventTypes = {
    livestreamingTime: "nova.extension.livestreaming.time"
  };

  constructor() {
    super("livestreaming");
  }

  get isPlayerSDKReady() {
    return false;
  }

  get currentBitrate() {
    return (
      parseInt(this.currentChunkData.bitrate as string, 10) /
      (this.currentChunkData.loadTime / this.currentChunkData.duration)
    );
  }

  get averageBitrate() {
    return (
      this.bitrates.reduce((a, b) => a + b, 0) /
      Math.max(this.bitrates.length, 1)
    );
  }

  startStream() {
    console.log("Starting livestreaming");
    this.restartStream();
  }

  async restartStream() {
    this.currentStreamIndex = 0;
    this.retryAttempts = 0;
    await this.playStream();
  }

  async playStream() {
    console.log("start..", Date.now());
    setTimeout(() => {
      if (
        !this.streamingUrls ||
        !this.streamingUrls.length ||
        !this.streamingUrls[this.locationIndex]?.length
      ) {
        console.log("isLoading:", this.isLoading);
        if (!this.isLoading) {
          this.onCustomError({
            code: 990003,
            message: `Stream sources not provided!!`,
            type: "error"
          });
          console.error("no stream source!", this.streamingUrls);
        }

        return false;
      }
    }, 2000);
    console.log("End..", Date.now());
    console.log(
      "LiveStreaming playStream - retryAttempts:",
      this.retryAttempts
    );
    this.isLoading = false;

    console.log("Playing stream at index:", this.currentStreamIndex);
    console.log("Stream sources:", this.streamingUrls);
    // Log current stream information
    const currentStreamUrl =
      this.streamingUrls?.[this.locationIndex]?.[this.currentStreamIndex] ?? "";
    console.log("Playing stream:", {
      retryAttempts: this.retryAttempts,
      locationIndex: this.locationIndex,
      currentStreamIndex: this.currentStreamIndex,
      currentStreamUrl: currentStreamUrl,
      allStreamSources: this.streamingUrls
    });

    // Clean up any existing player before setting up a new one
    this.removePlayerContainer();

    // Set up the player with the current stream URL
    await this.setupPlayer(currentStreamUrl);
  }

  async setupPlayer(url: string) {
    if (!this.isPlayerSDKReady) return false;
    console.log("Setting up player with URL:", url);
    if (!url) {
      this.onCustomError({
        code: 990003,
        message: `Stream sources not provided!`,
        type: "error"
      });
      return false;
    }
    return true;
  }
  removePlayerContainer() {
    console.log("Base Loader: removePlayerContainer called");

    // Clear all timeouts to prevent callbacks after removal
    clearTimeout(this.bufferTimeout);
    clearTimeout(this.tryNextTimeout);
    clearTimeout(this.hideErrorTimeout);

    // Clear any retry intervals
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    // console.log("Checking for castLoader:", this.castLoader);
    // if (this.castLoader) {
    //   console.log("Removing cast loader player container");
    //   this.castLoader.removePlayerContainer();
    // }
  }

  // stopStream() {
  //   console.log("Stopping livestreaming");
  // }

  playNextStream() {
    const locationStreams = this.streamingUrls[this.locationIndex] ?? [];
    if (this.currentStreamIndex < locationStreams.length - 1) {
      this.currentStreamIndex++;
      if (!locationStreams[this.currentStreamIndex]) {
        return false;
      }
      this.playStream();
      return true;
    }
    // show error message
    // alert("cannnot play all streams.");
    return false;
  }

  onConnectionError(error: { message: string; code: number; type: string }) {
    // code, message, sourceError, type
    console.error("LiveStreaming onConnectionError", error);
    if (this.retryDelay > 0) {
      this.showConnectionError(error.code);
      clearInterval(this.retryInterval);
      this.retryInterval = setInterval(() => {
        this.restartStream();
      }, this.retryDelay);
    } else {
      this.restartStream();
    }
  }

  onLowBandwidthWarning(error: {
    message: string;
    code: number;
    type: string;
  }) {
    // type, message, error
    console.warn(
      "LiveStreaming onLowBandwidthWarning",
      error,
      this.currentBitrate
    );
    if (this.retryDelay > 0) {
      this.showLowBandwidthError(error.code);
      clearInterval(this.retryInterval);
      this.retryInterval = setInterval(() => {
        this.restartStream();
      }, this.retryDelay);
    } else {
      this.restartStream();
    }
  }

  onPlayerError(error: { message: string; code: number; type: string }) {
    if (error.code) {
      if (error.code >= 210000 && error.code < 300000) {
        clearTimeout(this.tryNextTimeout);
        let self = this;
        this.showConnectionError(error.code);
        this.tryNextTimeout = setTimeout(function () {
          if (!self.playNextStream()) {
            self.retryAttempts++;
            if (self.retryAttempts == self.maxRetryAttempts) {
              self.onConnectionError(error);
            } else {
              self.currentStreamIndex = 0;
            }
          }
        }, this.retryDelay);
      } else if (error.code >= 330000 && error.code < 400000) {
        clearTimeout(this.tryNextTimeout);
        let self = this;
        this.tryNextTimeout = setTimeout(function () {
          if (!self.playNextStream()) {
            self.retryAttempts++;
            if (self.retryAttempts == self.maxRetryAttempts) {
              self.onLowBandwidthWarning(error);
            } else {
              self.currentStreamIndex = 0;
            }
          }
        }, this.retryDelay);
      } else if (error.code >= 990000) {
        this.onConnectionError(error);
      } else {
        this.onCustomError(error);
      }
    }
  }

  onCustomError(error: { message: string; code: number; type: string }) {
    this.showError("Error", error.message, error.code);
  }

  showConnectionError(errCode: number) {
    this.showError(
      this.defaultSettings.contentFields.connectionErrorTitle,
      this.defaultSettings.contentFields.connectionErrorMessage,
      errCode
    );
  }

  showLowBandwidthError(errCode: number) {
    this.showError(
      this.defaultSettings.contentFields.lowBandwidthWarningTitle,
      this.defaultSettings.contentFields.lowBandwidthWarningMessage,
      errCode
    );
  }

  showError(title: string, message: string, errCode: number) {
    if (message)
      message = message.replace(
        "{{recoveryFrequency}}",
        String(Math.round(this.retryDelay / 1000))
      );
    if (message === "Sorry, the video player failed to load.")
      message =
        "Please ensure you have enough bandwidth to load this video source";
    this.error = {
      title,
      message,
      errCode
    };
    console.log("LiveStreaming showError", this.onError);
    if (this.onError) {
      this.onError(this.error);
    }
    console.log("This Error => ", this.error);
  }

  hideError() {
    console.log("hide Error");
    this.error = null;
    if (this.onError) {
      this.onError(null);
    }
  }

  setLocation(location: number | string = 0, dontRestartStream = false) {
    if (typeof location === "string") {
      if (this.locations) {
        location = this.locations.findIndex((l) => l == location);
      }
    }
    if (typeof location === "number") {
      if (this.isLocationStreamingUrlsAvailable(location)) {
        this.locationIndex = location;
        if (!dontRestartStream) {
          this.restartStream();
        }
        return true;
      } else {
        console.error(`LiveStreaming: location '${location}' not available!`);
      }
    }
    return false;
  }

  isLocationStreamingUrlsAvailable(locationIndex: number) {
    return this.streamingUrls.length > locationIndex;
  }

  async updateStreamViewInfo() {
    // TODO: make api call to update stream view info like play position, watch time, etc.
    // this.api.updateStreamViewInfo(this.instanceId, {
    //   maxPlayPosition: this.maxPlayPosition,
    //   lastPlayPosition: this.lastPlayPosition,
    //   totalWatchTime: this.totalWatchTime,
    //   maxVideoLength: this.maxVideoLength,
    //   watchedFullVideo: this.watchedFullVideo
    // });
  }

  isNPayloadData(data: any) {
    if (typeof data !== "string") {
      return false;
    }
    return data.match(/^N-PAYLOAD /);
  }

  parseNPayloadData(data: any) {
    if (this.isNPayloadData(data)) {
      const jsonData = data.replace(/^N-PAYLOAD /, "");
      return JSON.parse(jsonData);
    }
    return null;
  }

  dispatchLiveStateCmdData(cmdData: any) {
    window.dispatchEvent(
      new CustomEvent("nova.connector.command.session", {
        detail: {
          topicId: cmdData.sessionId,
          data: cmdData
        }
      })
    );
  }
}
