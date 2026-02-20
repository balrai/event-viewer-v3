/* eslint-disable */
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "@videojs/http-streaming";
import { registerIVSTech } from "amazon-ivs-player";
import type { VideoJSEvents, VideoJSIVSTech } from "amazon-ivs-player";

import LiveStreaming from "../Loader";

export default class VideoJsLoader extends LiveStreaming {
  playerId: string;
  videoJsPlayer: any = null;
  ksdk = null;
  constructor(options: Record<string, any> = {}) {
    super();
    Object.assign(this, options);
    this.playerId = this.name + "videojs";
  }

  override get isPlayerSDKReady() {
    console.log("isready", !!videojs);
    return !!videojs;
  }

  get isAmazonIvsEnabled() {
    return this.sourceType == "amazonivs";
  }

  get isPlaying() {
    return this.videoJsPlayer && !this.videoJsPlayer.paused();
  }

  override async setupPlayer(url: string, config: Record<string, any> = {}) {
    console.log(
      "Setting up Video.JS player with URL:",
      url,
      "and config:",
      config
    );
    if (await super.setupPlayer(url)) {
      console.log("Initializing Video.JS player");
      const playerConfig = Object.assign({
        autoplay: "muted",
        controls: true
      });
      if (this.isAmazonIvsEnabled) {
        registerIVSTech(videojs, {
          wasmBinary:
            "amazon-ivs-player/dist/assets/amazon-ivs-wasmworker.min.wasm",
          wasmWorker:
            "amazon-ivs-player/dist/assets/amazon-ivs-wasmworker.min.js"
        });
        playerConfig.techOrder = ["AmazonIVS"];
      }

      const self = this;

      this.videoJsPlayer = videojs(
        this.playerId,
        playerConfig,

        function onPlayerReady() {
          const player = self.videoJsPlayer;
          player.playsinline(true);
          console.log("Url::-", url);
          player.src(url);

          player.on("ready", () => {
            console.log("Video.JS player is ready");

            player.play();
          });

          player.on("texttrackchange", (e) => {
            const tracks = player.textTracks();

            for (let i = 0; i < tracks.length; i++) {
              switch (tracks[i].label) {
                case "Timed Metadata":
                  tracks[i].on("cuechange", function () {
                    const activeCue = tracks[i].activeCues[0];
                    if (self.isNPayloadData(activeCue.text)) {
                      const cmdData = self.parseNPayloadData(activeCue.text);
                      self.dispatchLiveStateCmdData(cmdData);
                    }
                  });
                  break;
                case "segment-metadata":
                  break;
              }
            }
          });

          player.on("timeupdate", () => {
            self.dispatchExtensionEvent("time", {
              time: player.currentTime()
            });
          });
          player.on("play", (data) => {
            //  console.log('play', data)
            clearTimeout(self.tryNextTimeout);
            clearTimeout(self.bufferTimeout);
            clearInterval(self.retryInterval);
            self.hideErrorTimeout = setTimeout(() => {
              self.retryAttempts = 0;
              self.hideError();
            }, 1000);
          });
          player.on("error", (error) => {
            clearTimeout(self.hideErrorTimeout);
            self.onPlayerError(error);
          });
          player.on("warning", (error) => {
            clearTimeout(self.hideErrorTimeout);
            self.onPlayerWarning(error);
          });
          //  player.on('playbackRateChanged', (data) => {
          //    self.onPlaybackRateChanged(data)
          //  })
          //  player.on('visualQuality', (data) => {
          //    self.onVisualQuality(data)
          //  })
          player.on("stalled", () => {
            clearTimeout(self.bufferTimeout);
            if (self.bufferTimeout > 0) {
              self.bufferTimeout = setTimeout(() => {
                self.onPlayerError({
                  code: 990002,
                  message: `Buffer timeout`,
                  type: "error"
                });
              }, self.bufferTimeoutWindow * 1000);
            }
          });

          player.play();

          clearTimeout(self.tryNextTimeout);
          clearTimeout(self.bufferTimeout);
          clearInterval(self.retryInterval);
          self.hideErrorTimeout = setTimeout(() => {
            self.retryAttempts = 0;
            self.hideError();
          }, 1000);
        }
      );

      if (this.bufferTimeout) {
        clearTimeout(this.bufferTimeout);
        this.bufferTimeout = setTimeout(() => {
          this.onPlayerError({
            code: 990001,
            message: `No response from Video.JS since set-up for ${this.bufferTimeoutWindow} seconds`,
            type: "error"
          });
        }, this.bufferTimeoutWindow * 1000);
      }
    }
    return this.videoJsPlayer;
  }

  stopStream() {
    console.log("Stopping Video.JS stream");
    if (this.videoJsPlayer && this.videoJsPlayer.stop) {
      this.videoJsPlayer.stop();
    }
  }

  onConnectionError(error) {
    if (this.videoJsPlayer && this.videoJsPlayer.stop)
      this.videoJsPlayer.stop();
    super.onConnectionError(error);
  }

  onLowBandwidthWarning(error) {
    if (this.videoJsPlayer && this.videoJsPlayer.stop)
      this.videoJsPlayer.stop();
    super.onLowBandwidthWarning(error);
  }

  setPosition(pos) {
    if (this.videoJsPlayer) this.videoJsPlayer.currentTime(pos);
  }

  removePlayerContainer() {
    super.removePlayerContainer();
    if (this.videoJsPlayer && this.videoJsPlayer.stop) {
      this.videoJsPlayer.stop();
      this.videoJsPlayer.dispose();
    }
    this.videoJsPlayer = null;
    this.ksdk = null;
  }
}
