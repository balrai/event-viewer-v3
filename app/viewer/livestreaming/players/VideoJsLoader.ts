import videojs from "video.js";
import "video.js/dist/video-js.css";
import {
  create,
  registerIVSTech,
  registerIVSQualityPlugin,
  PlayerEventType
} from "amazon-ivs-player";
import type Player from "video.js/dist/types/player";
import type {
  TextCue,
  TextMetadataCue,
  ErrorType,
  PlayerState,
  VideoJSEvents,
  VideoJSIVSTech,
  VideoJSQualityPlugin,
  PlayerError,
  PlayerConfig,
  MediaPlayer
} from "amazon-ivs-player";
import LiveStreaming from "../Loader";

interface IVSPlayer extends Player, VideoJSQualityPlugin, VideoJSIVSTech {}

export default class VideoJsLoader extends LiveStreaming {
  playerId: string;
  videoJSPlayer: IVSPlayer | null = null;
  amazonIVSPlayer: MediaPlayer | null = null;
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

  override get isPlaying(): boolean {
    if (this.amazonIVSPlayer) {
      return !this.amazonIVSPlayer.isPaused();
    }
    return !!this.videoJSPlayer && !this.videoJSPlayer.paused();
  }

  override async setupPlayer(url: string): Promise<boolean> {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    const mimeTypes = {
      ".m3u8": "application/x-mpegURL",
      ".mp4": "video/mp4",
      ".webm": "video/webm"
    };

    if (await super.setupPlayer(url)) {
      const self = this;

      console.log("Initializing Video.JS player");
      const extension = url.substring(url.lastIndexOf("."));
      const detectedMimeType =
        mimeTypes[extension as keyof typeof mimeTypes] ||
        "application/x-mpegURL";
      const playerConfig = Object.assign({
        autoplay: true,
        controls: true
      });
      if (this.isAmazonIvsEnabled) {
        const ivsPlayerConfig: PlayerConfig = {
          wasmBinary: "/ivs/amazon-ivs-wasmworker.min.wasm",
          wasmWorker: "/ivs/amazon-ivs-wasmworker.min.js"
        };
        registerIVSTech(videojs, ivsPlayerConfig);
        registerIVSQualityPlugin(videojs);
        playerConfig.techOrder = ["AmazonIVS", "html5"];
      }

      this.videoJSPlayer = videojs(this.playerId, playerConfig, () => {
        const player = toRaw(self.videoJSPlayer) as IVSPlayer;
        player?.src({
          src: url,
          type: detectedMimeType
        });

        this.setupVideoJsPlayerEvents(player);

        if (self.isAmazonIvsEnabled) {
          player?.enableIVSQualityPlugin();
          this.setupIvsPlayerEvents(player);
        }
        clearTimeout(self.tryNextTimeout);
        clearTimeout(self.bufferTimeout);
        clearInterval(self.retryInterval);
        self.hideErrorTimeout = setTimeout(() => {
          self.retryAttempts = 0;
          self.hideError();
        }, 1000);
      }) as IVSPlayer;

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
    return !!this.videoJSPlayer;
  }

  setupVideoJsPlayerEvents(player: IVSPlayer) {
    player.on("error", () => {
      const error = player.error();
      console.error("Video.JS Player Error:", error);
      this.onPlayerError({
        code: error?.code || 990000,
        message: error?.message || "Unknown Video.JS error",
        type: "error"
      });
    });
  }

  setupIvsPlayerEvents(player: IVSPlayer) {
    const ivsPlayer = player.getIVSPlayer();

    ivsPlayer.addEventListener(PlayerEventType.TEXT_CUE, (e: TextCue) => {
      console.log("IVS Player Text Cue:", e);
    });

    ivsPlayer.addEventListener(
      PlayerEventType.TEXT_METADATA_CUE,
      (e: TextMetadataCue) => {
        console.log("IVS Player Text Metadata Cue:", e);
        try {
          const cmdData = JSON.parse(e.text);
          console.log("IVS metadata received:", cmdData);
          this.dispatchLiveStateCmdData(cmdData);
        } catch (e) {
          console.warn("Error parsing IVS metadata:", e);
        }
      }
    );

    ivsPlayer.addEventListener(PlayerEventType.ERROR, (e: PlayerError) => {
      console.error("IVS Player Error:", e);
      this.onPlayerError({
        code: e.code || 990002,
        message: e.message || "Unknown IVS Player error",
        type: e.type || "error"
      });
    });
  }

  stopStream() {
    this.videoJSPlayer?.dispose();
    this.videoJSPlayer = null;
    return;
  }
}
