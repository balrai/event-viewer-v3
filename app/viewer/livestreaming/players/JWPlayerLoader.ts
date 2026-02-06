const jwplayerKey = "D5wpHobrSHJ6Jc4aQWG9zhes/7xYetuPXwSPVR9+b7oDYuIn";
const jwplayerSdkUrl = "/vendor/jwplayer/jwplayer.js";
const amazonIvsProviderSdkUrl =
  "https://player.live-video.net/1.30.0/amazon-ivs-jw-provider.min.js";

import loadScripts from "load-scripts";
import LiveStreaming from "../Loader";

declare global {
  interface Window {
    jwplayer?: any;
  }
}

export default class JWPlayerLoader extends LiveStreaming {
  playerId: string;
  playersInstalled = false;
  timer: any = null;
  jwplayer: any = null;
  ivsPlayer: any = null;
  ivsEvents: any = null;
  _ivsMetadataHandler: any = null;
  _resumePlayAttempts = 0;
  lastChunkData: {
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
  constructor(options: Record<string, any> = {}) {
    super();
    Object.assign(this, options);
    this.playerId = this.name + "-jwplayer";
    console.log("JWPlayerLoader initialized with", this.playerId);
    // this.startStream(); //calling super class method
  }

  override get isPlayerSDKReady() {
    return this.playersInstalled;
  }

  get isAmazonIvsEnabled() {
    return this.sourceType == "amazonivs";
  }

  // Install JWPlayer SDK and IVS provider if needed
  async installPlayer() {
    if (this.playersInstalled) {
      return;
    }
    if (!window.jwplayer) {
      await loadScripts(jwplayerSdkUrl);
    }
    if (!window.jwplayer) {
      return;
    }
    window.jwplayer.key = jwplayerKey;

    if (this.isAmazonIvsEnabled) {
      await loadScripts(amazonIvsProviderSdkUrl);
    }

    this.playersInstalled = true;
  }

  // Set up the JWPlayer instance with the provided stream URL
  override async setupPlayer(url: string, config: Record<string, any> = {}) {
    console.log("settting up player", this);

    if (this.jwplayer) {
      this.removePlayerContainer();
    }

    await this.installPlayer();
    if (await super.setupPlayer(url)) {
      let type;
      if (this.isAmazonIvsEnabled) {
        type = "ivs";
      }
      let playerConfig = {
        playlist: [
          {
            file: url,
            type: type
          }
        ],
        autostart: true,
        mute: false,
        width: "100%",
        height: "100%",
        aspectratio: "16:9",
        volume: 50,
        ...config
      };
      this.jwplayer = window.jwplayer(this.playerId).setup(playerConfig);

      const self = this;
      if (this.bufferTimeout) {
        clearTimeout(this.bufferTimeout);
        this.bufferTimeout = setTimeout(() => {
          this.onPlayerError({
            code: 990001,
            message: `No response from JW Player since set-up for ${this.bufferTimeoutWindow} seconds`,
            type: "error"
          });
        }, this.bufferTimeoutWindow * 1000);
      }
      if (this.jwplayer) {
        this.jwplayer.on("ready", () => {
          console.log("JWPlayer is ready and playing");
          if (this.sessionType === "Archive" && this.lastPlayPosition) {
            this.jwplayer.seek(this.lastPlayPosition);
            this.jwplayer.on("meta", () => {
              //TODO: Do we need to Listen for meta events to get duration info?
              this.maxVideoLength = this.jwplayer.getDuration();
            });
          }
        });
        this.jwplayer.on("play", () => {
          if (this.sessionType === "Archive") {
            if (this.timer) {
              clearInterval(this.timer);
              this.timer = null;
            }
            this.timer = setInterval(() => {
              if (!this.jwplayer || this.jwplayer.getState() !== "playing") {
                clearInterval(this.timer);
                this.timer = null;
                return;
              }
              super.updateStreamViewInfo();
            }, 5000);
          }
        });
        this.jwplayer.on("complete", () => {
          if (this.sessionType === "Archive") {
            super.updateStreamViewInfo();
          }
        });

        if (this.isAmazonIvsEnabled) {
          // Store a reference to the metadata handler for later removal
          this._ivsMetadataHandler = null;

          this.jwplayer.on("providerPlayer", function (player: any) {
            console.log("Provider player event received:", player);
            // Clean up any previous IVS player resources first
            if (self.ivsPlayer && self._ivsMetadataHandler) {
              try {
                console.log("Removing previous IVS event listeners");
                const oldPlayerEvent = self.ivsEvents.PlayerEventType;
                self.ivsPlayer.removeEventListener(
                  oldPlayerEvent.TEXT_METADATA_CUE,
                  self._ivsMetadataHandler
                );
              } catch (e) {
                console.warn("Error removing previous IVS event listener:", e);
              }
            }
            // Store references to clean up later
            self.ivsPlayer = player.ivsPlayer;
            self.ivsEvents = player.ivsEvents;
            console.log(
              "IVS player and events stored:",
              self.ivsPlayer,
              self.ivsEvents
            );
            if (self.ivsPlayer && self.ivsEvents) {
              const playerEvent = self.ivsEvents.PlayerEventType;

              // Create the handler function and store the reference
              self._ivsMetadataHandler = (data: any) => {
                if (!data || !data.text) return;
                try {
                  const cmdData = JSON.parse(data.text);
                  console.log("IVS metadata received:", cmdData);
                  self.dispatchLiveStateCmdData(cmdData);
                } catch (e) {
                  console.warn("Error parsing IVS metadata:", e);
                }
              };

              // Add event listener for metadata
              console.log("Adding IVS metadata event listener");
              self.ivsPlayer.addEventListener(
                playerEvent.TEXT_METADATA_CUE,
                self._ivsMetadataHandler
              );
            }
          });
        } else {
          // Use a single meta event handler with memory optimizations
          this.jwplayer.on("meta", (data: any) => {
            // Process TXXX metadata payload if available
            if (data && data.metadata && data.metadata.TXXX) {
              if (this.isNPayloadData(data.metadata.TXXX)) {
                try {
                  const cmdData = this.parseNPayloadData(data.metadata.TXXX);
                  // Only dispatch if valid data was parsed
                  if (cmdData) {
                    this.dispatchLiveStateCmdData(cmdData);
                  }
                } catch (e) {
                  console.warn("Error processing metadata payload:", e);
                }
              }
            }
            // Only process timing data if needed (metadataTime > 0)
            if (data.metadataTime > 0) {
              try {
                const timestamp = Date.now();

                // Get quality info - with safeguards to prevent errors
                let bitrate = "";
                try {
                  const quality = this.jwplayer.getVisualQuality();
                  if (quality && quality.level) {
                    bitrate = quality.level.bitrate;
                  }
                } catch (e) {
                  // Silently handle quality access errors
                  console.log("Error accessing quality information:", e);
                }

                // Update chunk data with minimal object creation
                this.lastChunkData = this.currentChunkData;
                this.currentChunkData = {
                  time: data.metadataTime,
                  timestamp: timestamp,
                  loadTime: (timestamp - this.lastChunkData.timestamp) / 1000.0,
                  duration: data.metadataTime - this.lastChunkData?.time,
                  bitrate: bitrate
                };

                // Carefully manage the bitrates array to prevent unlimited growth
                if (this.currentBitrate && !isNaN(this.currentBitrate)) {
                  // Only add valid bitrate values
                  this.bitrates.push(this.currentBitrate);

                  // Efficiently limit array size
                  if (this.bitrates.length > this.bitratesSampleSize) {
                    this.bitrates = this.bitrates.slice(
                      -this.bitratesSampleSize
                    );
                  }
                }
              } catch (e) {
                console.warn("Error processing chunk metadata:", e);
              }
            }
          });
        }
        this.jwplayer.on("setupError", (data: any) => {
          console.error("setupError", data);
          this.onPlayerError(data);
        });
        let tmp = -1;
        let compulsoryView = this.videoProp?.compulsoryView || false;
        this.jwplayer.on("time", (time: { position: number }) => {
          if (this.sessionType !== "Archive") return;
          if (tmp !== Math.round(time.position)) {
            // As 'time' event is trigger 3 - 4 times per second, triggerQuiz function will only run once per second
            this.triggerQuiz(Math.round(time.position));
          }
          tmp = Math.round(time.position);

          this.totalWatchTime +=
            time.position - this.lastPlayPosition > 0 &&
            time.position - this.lastPlayPosition < 2
              ? time.position - this.lastPlayPosition
              : 0;
          this.lastPlayPosition = time.position;

          if (!this.seeking && compulsoryView) {
            this.maxPlayPosition = Math.max(
              time.position,
              this.maxPlayPosition
            );
          }
          sessionStorage.setItem(
            "streamviewdata" + "#" + this.instanceId,
            JSON.stringify({
              maxPlayPosition: Math.floor(this.maxPlayPosition),
              lastPlayPosition: Math.floor(time.position),
              totalWatchTime: Math.floor(this.totalWatchTime)
            })
          );
          this.dispatchExtensionEvent(this.eventTypes.livestreamingTime, {
            time
          });
        });
      }
    }

    return this.jwplayer;
  }

  async triggerQuiz(time: number) {
    this.quizMarkers.forEach(async (marker: any) => {
      if (time === marker.timer / 1000 && !marker.skip) {
        let quizId = marker.triggerValues.quizId;
        this.jwplayer.pause();
        // TODO: activate quiz using PINIA Store
      }
    });
  }

  stopStream() {
    console.log("Stopping JWPlayer stream");
  }

  override removePlayerContainer() {
    console.log("Removing JWPlayer container", this);
    // Call parent cleanup first
    super.removePlayerContainer();

    // Clear all timers to prevent callbacks after player removal
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Reset tracking variables
    this._resumePlayAttempts = 0;

    // Clear all timeouts
    clearTimeout(this.bufferTimeout);
    clearTimeout(this.hideErrorTimeout);
    clearTimeout(this.tryNextTimeout);
    this.bufferTimeout = null;
    this.hideErrorTimeout = null;
    this.tryNextTimeout = null;

    // Clean up IVS player resources
    if (this.ivsPlayer && this.ivsEvents && this._ivsMetadataHandler) {
      try {
        console.log("Removing IVS event listeners during cleanup");
        const playerEvent = this.ivsEvents.PlayerEventType;
        this.ivsPlayer.removeEventListener(
          playerEvent.TEXT_METADATA_CUE,
          this._ivsMetadataHandler
        );
        this._ivsMetadataHandler = null;
      } catch (e) {
        console.warn("Error removing IVS event listener:", e);
      }
    }

    // Properly destroy JWPlayer instance
    if (this.jwplayer) {
      try {
        console.log("Destroying JWPlayer instance");
        this.jwplayer.off();
        this.jwplayer.stop();
        this.jwplayer.remove();
      } catch (e) {
        console.warn("Error during player cleanup:", e);
      }
      console.log("JWPlayer instance removed successfully");
    }

    // Reset data collection arrays to prevent memory growth
    this.bitrates = [];

    // Reset chunk data to minimal objects
    this.lastChunkData = {
      time: 0,
      timestamp: Date.now(),
      loadTime: 0,
      duration: 0,
      bitrate: 0
    };
    this.currentChunkData = {
      time: 0,
      timestamp: Date.now(),
      loadTime: 0,
      duration: 0,
      bitrate: 0
    };

    // Clear references to allow garbage collection
    this.jwplayer = null;
    this.ivsPlayer = null;
    this.ivsEvents = null;
  }
}
