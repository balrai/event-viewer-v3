/* eslint-disable */
import ExtensionLoader from "~/lib/nwv2-client-lib/classes/Viewer/Extension/Loader";
import LiveStreamingConfig from "~/lib/nwv2-client-lib/classes/DataModel/Extensions/LiveStreaming/Config";
import LiveStateProvider from "./LiveStateProvider";

export default class LiveStreamingLoader extends ExtensionLoader {
  constructor() {
    console.log("streaming loader constructor", import.meta.client);
    super("LiveStreaming");
    this.extSettingsEnabled = true;
    this.state = {
      active: false,
      extInstanceId: null
    };
    this.eventTypes = {
      livestreamingTime: "nova.extension.livestreaming.time"
    };
    this.streamSourceTypes = {
      ivsrealtime: "ivsrealtime"
    };
    this.isLoading = true;
    this.defaultSettings = new LiveStreamingConfig();

    this.watchedFullVideo = false;
    this.maxVideoLength = 0;
    this.maxPlayPosition = 0;
    this.lastPlayPosition = 0;
    this.totalWatchTime = 0;
    this.currentSteamIndex = 0;
    this.currentSteamLanguage = null;
    this.retryAttempts = 0;
    this.retryDelay = 0;
    this.minimumBandwidth = 0;
    this.streamSources = [];
    this.locationIndex = 0;
    this.streamSettings = {};
    this.retryInterval = null;
    this.maxRetryAttempts = 1;
    this.bufferTimeoutWindow = 15;
    this.bufferTimeout = null;
    this.tryNextTimeout = null;
    this.hideErrorTimeout = null;
    this.preferredLocation = 0;
    this.castLoader = null;
    this.instanceId = null;

    this.lastChunkData = {
      timestamp: new Date().getTime(),
      loadTime: 0,
      duration: 0,
      bitrate: 0
    };
    this.currentChunkData = {
      timestamp: new Date().getTime(),
      loadTime: 0,
      duration: 0,
      bitrate: 0
    };
    this.bitrates = [];
    this.bitratesSampleSize = 5;

    this.error = null;
    this.onError = null;
    this.liveStateProvider = new LiveStateProvider(10, this);
    this.marker;
    this.setupExternalInterface();
  }

  init(dom, connector) {
    super.init(dom, connector);
    connector.addLiveStateProvider(this.liveStateProvider);
  }

  get currentBitrate() {
    return (
      this.currentChunkData.bitrate /
      (this.currentChunkData.loadTime / this.currentChunkData.duration)
    );
  }

  get averageBitrate() {
    return (
      this.bitrates.reduce((a, b) => a + b, 0) /
      Math.max(this.bitrates.length, 1)
    );
  }

  get isHidden() {
    return this.state.action == "hide";
  }

  get isPlayerSDKReady() {
    return false;
  }

  get player() {
    console.log("this.streamSettings player", this.streamSettings);
    return this.streamSettings
      ? this.streamSettings.sourceType == this.streamSourceTypes.ivsrealtime
        ? this.streamSettings.sourceType
        : this.streamSettings.player
      : null;
  }

  get isPlaying() {
    return false;
  }

  async setupPlayer(url) {
    if (!this.isPlayerSDKReady) return;
    console.log("Setting up player with URL:", url);
    if (!url) {
      this.onCustomError({
        code: 990003,
        message: `Stream sources not provided!`,
        type: "error"
      });
      console.error("no stream source!", this.streamSources);
      return;
    }

    // Ensure player container is properly removed before setting up a new one
    // this.removePlayerContainer()
    this.hideError();
    if (!this.isHidden) {
      console.log("Player is not hidden, returning true");
      return true;
    }
    console.log("Player is hidden, returning false");
    return false;
  }

  async getStreamViewInfo() {
    const c_data = JSON
      .parse
      // sessionStorage.getItem(
      //   "streamviewdata" + "#" + this.instanceId + "#" + this.api.account.userId
      // )
      ();
    if (!!c_data) {
      var { maxPlayPosition, lastPlayPosition, totalWatchTime } = c_data;
    } else {
      var { maxPlayPosition, lastPlayPosition, totalWatchTime } =
        await this.api.getStreamViewInfo(this.instanceId);
    }
    if (!!maxPlayPosition) this.maxPlayPosition = maxPlayPosition;
    if (!!lastPlayPosition) this.lastPlayPosition = lastPlayPosition;
    if (!!totalWatchTime) this.totalWatchTime = totalWatchTime;
    return;
  }

  async updateStreamViewInfo() {
    this.api.updateStreamViewInfo(this.instanceId, {
      maxPlayPosition: this.maxPlayPosition,
      lastPlayPosition: this.lastPlayPosition,
      totalWatchTime: this.totalWatchTime,
      maxVideoLength: this.maxVideoLength,
      watchedFullVideo: this.watchedFullVideo
    });
  }

  playNextStream() {
    if (
      this.currentSteamIndex <
      this.streamSources[this.locationIndex].length - 1
    ) {
      this.currentSteamIndex++;
      if (!this.streamSources[this.locationIndex][this.currentSteamIndex]) {
        return false;
      }
      this.playStream();
      return true;
    }
    // show error message
    // alert("cannnot play all streams.");
    return false;
  }

  async restartStream() {
    this.currentSteamIndex = 0;
    this.retryAttempts = 0;
    // this.hideError();
    await this.playStream();
  }

  startStream() {
    this.restartStream();
  }

  stopStream() {
    this.updateStreamViewInfo();
    this.removePlayerContainer();
  }

  async playStream() {
    console.log("start..", Date.now());
    setTimeout(() => {
      if (
        !this.streamSources ||
        !this.streamSources.length ||
        !this.streamSources[this.locationIndex].length
      ) {
        console.log("isLoading:", this.isLoading);
        if (!this.isLoading) {
          this.onCustomError({
            code: 990003,
            message: `Stream sources not provided!!`,
            type: "error"
          });
          console.error("no stream source!", this.streamSources);
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

    console.log("Playing stream at index:", this.currentSteamIndex);
    console.log("Stream sources:", this.streamSources);
    // Log current stream information
    const currentStreamUrl =
      this.streamSources[this.locationIndex][this.currentSteamIndex];
    console.log("Playing stream:", {
      retryAttempts: this.retryAttempts,
      locationIndex: this.locationIndex,
      currentSteamIndex: this.currentSteamIndex,
      currentStreamUrl: currentStreamUrl,
      allStreamSources: this.streamSources
    });

    // Clean up any existing player before setting up a new one
    this.removePlayerContainer();

    // Set up the player with the current stream URL
    await this.setupPlayer(currentStreamUrl);
  }

  setupStream() {
    // this.currentSteamIndex = 0;
    // this.retryAttempts = 0;
    this.retryDelay = 0;
    this.minimumBandwidth = 0;
    // this.streamSources.sort((a, b) => a.order - b.order);
    if (this.streamSettings) {
      if (this.streamSettings.recoveryFrequency) {
        this.streamSettings.recoveryFrequency = Math.max(
          1,
          parseFloat(this.streamSettings.recoveryFrequency)
        );
      } else {
        this.streamSettings.recoveryFrequency = 1;
      }
      this.retryDelay = this.streamSettings.recoveryFrequency * 1000;
      if (this.streamSettings.minimumBandwidth) {
        this.minimumBandwidth =
          parseFloat(this.streamSettings.minimumBandwidth) * 1000;
      }

      console.log("Minimum Bandwidth =>", this.minimumBandwidth);
      // console.log("current bitrate =>", this.currentBitrate());

      this.connector.liveStateProvider.fallbackTimeout =
        this.streamSettings.wowzaMetaInjectTimeout || 0;
      this.restartStream();
    }
  }

  onConnectionError(error) {
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

  onLowBandwidthWarning(error) {
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

  showConnectionError(errCode) {
    this.showError(
      this.config.contentFields.connectionErrorTitle ||
        this.defaultSettings.contentFields.connectionErrorTitle,
      this.config.contentFields.connectionErrorMessage ||
        this.defaultSettings.contentFields.connectionErrorMessage,
      errCode
    );
  }

  showLowBandwidthError(errCode) {
    this.showError(
      this.config.contentFields.lowBandwidthWarningTitle ||
        this.defaultSettings.contentFields.lowBandwidthWarningTitle,
      this.config.contentFields.lowBandwidthWarningMessage ||
        this.defaultSettings.contentFields.lowBandwidthWarningMessage,
      errCode
    );
  }

  showError(title, message, errCode) {
    if (message)
      message = message.replace(
        "{{recoveryFrequency}}",
        Math.round(this.retryDelay / 1000)
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

  onPlaybackError(error) {
    // code, message, sourceError, type
    console.error("LiveStreaming onPlaybackError", error);
  }

  onCustomError(error) {
    this.showError("Error", error.message, error.code);
  }

  onPlayerError(error) {
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
              self.currentSteamIndex = 0;
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
              self.currentSteamIndex = 0;
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

  onPlayerWarning(error) {
    // code, message, sourceError, type
    console.log("LiveStreaming onPlayerWarning", error);
    if (error.code) {
      if (error.code >= 330000 && error.code < 400000) {
        clearTimeout(this.tryNextTimeout);
        let self = this;
        this.tryNextTimeout = setTimeout(function () {
          if (!self.playNextStream()) {
            self.retryAttempts++;
            if (self.retryAttempts == self.maxRetryAttempts) {
              self.onLowBandwidthWarning(error);
            } else {
              self.currentSteamIndex = 0;
            }
          }
        }, this.retryDelay);
      } else if (error.code >= 990000) {
        this.onLowBandwidthWarning(error);
      }
    }
  }

  //  onPlaybackRateChanged(data) {
  //    // playbackRate, position
  //    //  console.log('LiveStreaming onPlaybackRateChanged', data)
  //    // this.onLowBandwidthWarning(null, "playbackRateChanged", {
  //    //   playbackRate,
  //    //   position
  //    // });
  //  }

  //  onVisualQuality(data) {
  //    // mode, label, reason
  //    //  console.log('LiveStreaming onVisualQuality', data)
  //    // this.onLowBandwidthWarning(null, "visualQuality", {
  //    //   mode,
  //    //   label,
  //    //   reason
  //    // });
  //  }

  setPreferredLocation(location) {
    this.preferredLocation = location;
  }

  setLocation(location = 0, dontRestartStream = false) {
    if (typeof location === "string") {
      if (this.streamSettings && this.streamSettings.locations) {
        location = this.streamSettings.locations.findIndex(
          (l) => l == location
        );
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

  isLocationStreamingUrlsAvailable(locationIndex) {
    return this.streamSources.length > locationIndex;
  }

  determineLocation() {
    if (this.isStreamingSourcesAvailable("mainland")) {
      return this.api.getCurrentCountry().then((countryCode) => {
        if (countryCode) {
          switch (countryCode) {
            case "CN":
              this.preferredLocation = "mainland";
              break;
          }
          this.setLocation(this.preferredLocation, true);
        }
      });
    } else {
      return Promise.resolve();
    }
  }

  stateHandler(changedFieldName, newValue, oldValue, state) {
    console.log("changedFieldName => ", changedFieldName);
    console.log("newValue => ", newValue);
    console.log("oldValue => ", oldValue);
    switch (changedFieldName) {
      case "extInstanceId":
      case "action":
        if (state.action == "hide") {
          this.removePlayerContainer();
        } else {
          this.streamSettings = {};
          this.streamSources = [];
          this.getStreamingSettings().then((data) => {
            console.log("changedFieldName => ", changedFieldName);
            console.log("steam Settings => ", data);
            this.streamSettings = data.streamSettings;
            this.streamSources = data.streamSettings.streamingUrls;
            console.log("stream URLS => ", this.streamSources);
            if (this.state.extInstanceId == null) {
              this.state.extInstanceId = data.streamSettings.instanceId;
            }
            if (this.streamSources) {
              console.log("stream URLS ...=> ", this.streamSources);
              this.determineLocation().then(() => {
                this.setupStream();
              });
            }
          });
        }
        break;
    }
  }

  bridgeHandler(data) {
    super.bridgeHandler(data);
    switch (data.command) {
      case "location":
        this.setLocation(data.location);
        break;
      case "locale":
        this.setStreamingLanguage(data.locale);
        break;
      case "player.seek":
        // this.setPosition(data.position);
        break;
    }
    if (this.castLoader) {
      this.castLoader.bridgeHandler(data);
    }
  }

  setPosition(pos = null) {
    throw new Error("Not implemented");
  }

  getStreamingSettings(locale = null) {
    if (!locale) locale = this.currentSteamLanguage;
    console.log("instanceId in the state", this.state);
    if (this.state.extInstanceId != null) {
      this.instanceId = this.state.extInstanceId;
    }
    let instanceId =
      this.state.extInstanceId == null
        ? this.streamSettings.instanceId
        : this.instanceId;
    console.log(this.instanceId, instanceId);
    return this.api.getExtensionData(instanceId, locale).then((data) => {
      console.log("data --=> ", data);
      return {
        streamSettings: data,
        streamSources: data.streamingUrls
      };
    });
  }

  getStreamingLanguage() {
    if (!this.currentSteamLanguage) {
      this.currentSteamLanguage = this.api.getCurrentLanguage();
    }
    return this.currentSteamLanguage;
  }

  setStreamingLanguage(langCode) {
    if (this.castLoader) return;
    // console.log(`LiveStreaming.Loader[${this.playerId}].setStreamingLanguage(${langCode})`, this.state.extInstanceId);
    this.currentSteamLanguage = langCode;
    this.streamSettings = {};
    this.streamSources = [];
    return this.getStreamingSettings(langCode).then((data) => {
      this.streamSettings = data.streamSettings;
      this.streamSources = data.streamSettings.streamingUrls;
      if (this.streamSources) {
        this.determineLocation().then(() => {
          this.restartStream();
        });
      }
    });
  }

  isStreamingSourcesAvailable(location) {
    const index = this.streamSettings.locations.findIndex((l) => l == location);
    return (
      index >= 0 &&
      this.streamSources &&
      this.streamSources[index] &&
      this.streamSources[index].length > 0 &&
      this.streamSources[index][0]
    );
  }

  isNPayloadData(data) {
    if (typeof data !== "string") {
      return false;
    }
    return data.match(/^N-PAYLOAD /);
  }

  parseNPayloadData(data) {
    if (this.isNPayloadData(data)) {
      const jsonData = data.replace(/^N-PAYLOAD /, "");
      return JSON.parse(jsonData);
    }
    return null;
  }

  dispatchLiveStateCmdData(cmdData) {
    window.dispatchEvent(
      new CustomEvent("nova.connector.command.session", {
        detail: {
          topicId: cmdData.sessionId,
          data: cmdData
        }
      })
    );
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

    console.log("Checking for castLoader:", this.castLoader);
    if (this.castLoader) {
      console.log("Removing cast loader player container");
      this.castLoader.removePlayerContainer();
    }
  }

  setupExternalInterface() {
    const self = this;

    /* --- for debug purpose --- */
    this.api.registerExternalInterface("_", {
      LiveStreaming: self
    });
    /* ------------------------- */
    this.api.registerExternalInterface("LiveStreaming", {
      setPreferredLocation(location) {
        return self.setPreferredLocation(location);
      },
      setLocation(location) {
        return self.setLocation(location);
      },
      setLanguage(locale) {
        return self.setStreamingLanguage(locale);
      },
      getSettings() {
        return self.getStreamingSettings();
      },
      setPlayerPosition(position) {
        return self.setPlayerPosition(position);
      },
      toggleMute(value) {
        return self.toggleMute(value);
      },
      toggleFullScreen() {
        return self.toggleFullScreen();
      }
    });
  }

  activateExtension() {
    super.activateExtension();
    this.setupExternalInterface();
    this.setupStream();
  }

  castAs(PlayerType) {
    console.log("Casting loader as:", PlayerType.name);

    // Clean up existing cast loader if it exists
    if (this.castLoader) {
      console.log("Deactivating existing cast loader");
      this.castLoader.deactivateExtension();
      this.castLoader = undefined;
    }

    // Create a new loader instance
    var loader = new PlayerType();
    console.log("New loader instance created:", loader);

    // Copy properties from this loader to the new one
    Object.assign(loader, this, {
      activated: false,
      listenersRegistered: false
    });

    // Update references
    this.liveStateProvider.liveStreaming = loader;
    this.castLoader = loader;

    // Initialize and activate the new loader
    loader.runIn(this.runInExtension);
    loader.activateExtension();

    return loader;
  }
}
