/* eslint-disable */
// import "@/js/jwplayer/jwplayer.js";
// window.jwplayer.key = "JTvV8AYfeaclNOn3l/P4Tyasye+4BjJqgFxat+k3kwY=";
const jwplayerKey = "D5wpHobrSHJ6Jc4aQWG9zhes/7xYetuPXwSPVR9+b7oDYuIn";
const jwplayerSdkUrl = "/vendor/jwplayer/jwplayer.js";
const amazonIvsProviderSdkUrl =
  "https://player.live-video.net/1.30.0/amazon-ivs-jw-provider.min.js"; //"/static/js/amazon-ivs-jw-provider-1.6.1.min.js";
const cdnbyeSdkUrl = "/static/js/cdnbye/hls.light.min.js";
const cdnbyeHlsjsUrl = "/static/js/cdnbye/provider.hlsjs.js";
const cdnbyeJwPlayerBuild = "/static/js/cdnbye/jwplayer.js";
const serviceWorker = "/static/js/cdnbye/sw.js";

import loadScripts from "load-scripts";
import LiveStreaming from "../Loader";
// import P2PEngineIOS from "swarmcloud-hls-sw";

export default class JWPlayerLoader extends LiveStreaming {
  constructor() {
    super();
    this.playerId = this.name + "-jwplayer";
    this.seeking = false;
    this.jwplayer = null;
    this.ivsPlayer = null;
    this.ivsEvents = null;
    this.playersInstalled = false;
    this.timer = null;
  }
  //  TODO:: elearning
  // maxPlayPosition value to be stored using courseStorage api
  // const seek = !this.streamSettings.videoProp.compulsoryView;
  // Maybe need to create the api to store maxPlayPosition

  get isPlayerSDKReady() {
    return this.playersInstalled;
    // return window.jwplayer && window.jwplayer(this.playerId) && window.jwplayer(this.playerId).setup;
  }

  get isAmazonIvsEnabled() {
    return this.streamSettings && this.streamSettings.sourceType == "amazonivs";
  }

  get isCdnByeEnabled() {
    if (!!this.streamSettings.cdnbye) {
      return this.streamSettings && this.streamSettings.cdnbye.enabled;
    } else return false;
  }

  get isPlaying() {
    return this.jwplayer && this.jwplayer.getState() === "playing";
  }

  resumePlay() {
    if (!this.jwplayer) return;

    const state = this.jwplayer.getState();
    if (state === "paused") {
      this.jwplayer.play();
    } else if (state !== "playing") {
      // Add safety measure: limit recursive calls to prevent memory leaks
      this._resumePlayAttempts = (this._resumePlayAttempts || 0) + 1;

      // Give up after 10 attempts (10 seconds)
      if (this._resumePlayAttempts < 10) {
        setTimeout(() => {
          this.resumePlay();
        }, 1000);
      } else {
        console.warn("Failed to resume playback after multiple attempts");
        this._resumePlayAttempts = 0;
      }
    }
  }
  async installPlayer() {
    if (this.playersInstalled) {
      return;
    }
    if (this.isCdnByeEnabled) {
      await loadScripts(cdnbyeSdkUrl);
      await loadScripts(cdnbyeHlsjsUrl);
      await loadScripts(cdnbyeJwPlayerBuild);
    } else {
      await loadScripts(jwplayerSdkUrl);
    }
    if (!window.jwplayer) {
      return;
    }
    window.jwplayer.key = jwplayerKey;

    // if (this.isAmazonIvsEnabled) {
    await loadScripts(amazonIvsProviderSdkUrl);
    // }

    this.playersInstalled = true;
  }

  async setupPlayer(url, config = null) {
    const sessionType = this.api.pathData.session.sessionType;
    if (sessionType === "Archive") {
      await super.getStreamViewInfo();
    }
    this.seeking = false;

    // Clean up existing player instance before creating a new one
    if (this.jwplayer) {
      console.log(
        "Cleaning up existing JWPlayer instance before setting up a new one"
      );
      this.removePlayerContainer();
    }

    this.playersInstalled = false;

    await this.installPlayer();
    if (await super.setupPlayer(url, config)) {
      let type = undefined;
      // if (url.matches(/\.m3u8$/)) {
      //   type = "hls";
      // }
      if (this.isAmazonIvsEnabled) {
        type = "ivs";
      }
      let playerConfig = Object.assign(
        {
          playlist: [
            {
              file: url,
              type
            }
          ],
          stretching: "foo",
          autostart: true,
          mute: false,
          width: "100%",
          height: "100%",
          aspectratio: "16:9",
          volume: 50,
          repeat: this.streamSettings.videoProp
            ? this.streamSettings.videoProp.loop
            : false,
          ga: {
            label: this.api.path
          }
          // defaultBandwidthEstimate: this.minimumBandwidth || 50000,
        },
        config
      );
      let p2pConfig;
      if (this.isCdnByeEnabled) {
        p2pConfig = {
          logLevel: "warn", // Reduce logging to improve performance
          announceLocation:
            this.streamSettings.cdnbye && this.streamSettings.cdnbye.location,
          swFile: serviceWorker,
          // Use arrow functions to avoid memory leaks from closures
          getStats: (
            totalP2PDownloaded,
            totalP2PUploaded,
            totalHTTPDownloaded,
            p2pDownloadSpeed
          ) => {
            if (this.streamSettings.debug) {
              console.log(`
                TotalP2PDownload: ${totalP2PDownloaded}
                TotalP2PUpload: ${totalP2PUploaded}
                TotalHTTPDownloaded: ${totalHTTPDownloaded}
                P2pDownloadSpeed: ${p2pDownloadSpeed}
              `);
            }
          },
          getPeerId: (peerId) => {
            if (this.streamSettings.debug) {
              console.log(`PeerID: ${peerId}`);
            }
          },
          getPeersInfo: (peers) => {
            if (this.streamSettings.debug) {
              console.log(`Peers Info: ${peers}`);
            }
          }
        };

        playerConfig["hlsjsdefault"] = true;
        playerConfig["hlsjsConfig"] = {
          debug: false, // Disable debug to reduce memory usage
          p2pConfig
        };

        try {
          if (
            typeof Hls !== "undefined" &&
            Hls.P2pEngine &&
            (!Hls.P2pEngine.isMSESupported() ||
              Hls.P2pEngine.getBrowser() === "Mac-Safari")
          ) {
            // use ServiceWorker based p2p engine, need additional file sw.js
            new Hls.P2pEngine.ServiceWorkerEngine(p2pConfig);
          }
        } catch (e) {
          console.warn("Error initializing P2P engine:", e);
        }
      }
      console.log("Setting up JWPlayer with config:", playerConfig);
      // Always create a fresh player instance to avoid addsource errors
      this.jwplayer = jwplayer(this.playerId).setup(playerConfig);
      console.log("JWPlayer instance created:", this.jwplayer);

      // if (this.isCdnByeEnabled) {
      //   window.disableP2pEngineIOSAutoInit = true;
      //   p2pConfig["swFile"] = serviceWorker;
      //   let engine = new P2PEngineIOS(p2pConfig);
      //   engine.registerServiceWorker().then((registration) => {
      //     console.info("ServiceWorker registration successful with scope: ", registration);
      //   }).catch(err => {
      //     console.info("ServiceWorker registration failed ", err)
      //   })
      // }

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
          if (sessionType === "Archive") {
            console.log("seeking::", this.lastPlayPosition);
            this.jwplayer.seek(this.lastPlayPosition);
            this.jwplayer.on("meta", () => {
              this.maxVideoLength = this.jwplayer.getDuration();
            });
          }
        });
        this.jwplayer.on("play", () => {
          if (sessionType === "Archive") {
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
          if (sessionType === "Archive") {
            this.watchedFullVideo = true;
            super.updateStreamViewInfo();
          }
        });

        if (this.isAmazonIvsEnabled) {
          // Store a reference to the metadata handler for later removal
          this._ivsMetadataHandler = null;

          this.jwplayer.on("providerPlayer", function (player) {
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
              self._ivsMetadataHandler = (data) => {
                if (!data || !data.text) return;
                try {
                  const cmdData = JSON.parse(data.text);
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
          this.jwplayer.on("meta", (data) => {
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
                const timestamp = Date.now(); // More efficient than new Date().getTime()

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
                  duration: data.metadataTime - this.lastChunkData.time,
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

        this.jwplayer.on("setupError", (data) => {
          console.error("setupError", data);
          this.onPlayerError(data);
        });
        let tmp;
        let compulsoryView = this.streamSettings.videoProp
          ? this.streamSettings.videoProp.compulsoryView
          : false;
        this.jwplayer.on("time", (time) => {
          if (sessionType !== "Archive") return;
          if (tmp !== Math.round(time.position)) {
            // As 'time' event is trigger 3 - 4 times per second, triggerQuiz function will only run once per second
            this.triggerQuiz(Math.round(time.position, this.player));
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
            "streamviewdata" +
              "#" +
              this.instanceId +
              "#" +
              this.api.account.userId,
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
        this.jwplayer.on("seek", (event) => {
          if (!compulsoryView) return;
          if (!this.seeking) {
            if (event.offset > this.maxPlayPosition) {
              this.seeking = true;
              setTimeout(() => {
                this.jwplayer.seek(this.maxPlayPosition);
              }, 0);
            }
          } else {
            this.seeking = false;
          }
        });

        this.jwplayer.on("play", (data) => {
          clearTimeout(this.tryNextTimeout);
          clearTimeout(this.bufferTimeout);
          clearInterval(this.retryInterval);
          this.hideErrorTimeout = setTimeout(() => {
            this.retryAttempts = 0;
            this.hideError();
          }, 1000);
        });
        this.jwplayer.on("error", (error) => {
          console.log("err1");
          clearTimeout(this.hideErrorTimeout);
          this.onPlayerError(error);
        });
        this.jwplayer.on("warning", (error) => {
          clearTimeout(this.hideErrorTimeout);
          this.onPlayerWarning(error);
        });
        this.jwplayer.on("complete", () => {
          if (!this.isAmazonIvsEnabled) return;
          clearTimeout(this.hideErrorTimeout);
          this.onConnectionError({ code: "Retry" });
        });
        //  this.jwplayer.on('playbackRateChanged', (data) => {
        //    this.onPlaybackRateChanged(data)
        //  })
        //  this.jwplayer.on('visualQuality', (data) => {
        //    this.onVisualQuality(data)
        //  })
        this.jwplayer.on("buffer", (data) => {
          clearTimeout(this.bufferTimeout);
          if (this.bufferTimeoutWindow > 0) {
            this.bufferTimeout = setTimeout(() => {
              this.onPlayerError({
                code: 990002,
                message: `Buffer timeout`,
                type: "error"
              });
            }, this.bufferTimeoutWindow * 1000);
          }
        });
      }
    }
    return this.jwplayer;
  }

  async triggerQuiz(time) {
    let markers = await this.connector.liveState.Quiz.markers;
    markers.forEach(async (marker) => {
      if (time === marker.timer / 1000 && !marker.skip) {
        let quizId = marker.triggerValues.quizId;
        this.jwplayer.pause();
        let quiz = {
          ...this.connector.liveState.Quiz,
          extInstanceId: quizId,
          __active: true,
          __state: "Started",
          action: "quiz",
          state: "Started"
        };
        let newState = { ...this.connector.liveState, Quiz: quiz };
        console.log("new state::", newState);
        const data = {
          command: "livestate",
          liveState: newState
        };
        this.connector.viewerSessionCommandHandler("activate-quiz", data);
      }
    });
  }

  bridgeHandler(data) {
    super.bridgeHandler(data);
    switch (data.command) {
      case "toggleFullscreen":
        this.toggleFullscreen();
        break;
      case "player.seek":
        this.setPosition(data.position);
        break;
      case "toggleMute":
        this.toggleMute(data.value);
        break;
      default:
        break;
    }
  }
  toggleFullscreen() {
    if (this.jwplayer) {
      if (this.jwplayer.getFullscreen()) {
        this.jwplayer.setFullscreen(false);
      } else {
        this.jwplayer.setFullscreen(true);
      }
    }
  }
  toggleMute(value) {
    if (this.jwplayer) this.jwplayer.setMute(value);
  }

  onConnectionError(error) {
    if (this.jwplayer) this.jwplayer.stop();
    super.onConnectionError(error);
  }

  onLowBandwidthWarning(error) {
    if (this.jwplayer) this.jwplayer.stop();
    super.onLowBandwidthWarning(error);
  }

  setPosition(pos) {
    if (this.jwplayer) this.jwplayer.seek(pos);
  }

  removePlayerContainer() {
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
        // Remove all event listeners first to prevent memory leaks
        this.jwplayer.off();
        // Stop playback before removing
        this.jwplayer.stop();
        // Remove the player from DOM
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
      timestamp: Date.now(),
      loadTime: 0,
      duration: 0,
      bitrate: 0
    };
    this.currentChunkData = {
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
