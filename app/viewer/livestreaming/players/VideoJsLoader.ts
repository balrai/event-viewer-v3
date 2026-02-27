/* eslint-disable */
import type Player from "video.js/dist/types/player";
import { registerIVSTech, registerIVSQualityPlugin } from "amazon-ivs-player";
import type {
  TextCue,
  TextMetadataCue,
  ErrorType,
  PlayerEventType,
  PlayerState,
  VideoJSEvents,
  VideoJSIVSTech,
  VideoJSQualityPlugin,
  PlayerError,
  PlayerConfig
} from "amazon-ivs-player";
import LiveStreaming from "../Loader";

interface IVSPlayer extends Player, VideoJSQualityPlugin, VideoJSIVSTech {}

let videojs: any = null;

export default class VideoJsLoader extends LiveStreaming {
  playerId: string;
  videoJsPlayer: IVSPlayer | null = null;
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

  override async setupPlayer(url: string): Promise<boolean> {
    if (!videojs) {
      videojs = (await import("video.js")).default;
      await import("video.js/dist/video-js.css");
    }

    const mimeTypes = {
      ".m3u8": "application/x-mpegURL",
      ".mp4": "video/mp4",
      ".webm": "video/webm"
    };

    if (await super.setupPlayer(url)) {
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
        registerIVSTech(videojs, {
          wasmBinary: "/ivs/amazon-ivs-wasmworker.min.wasm",
          wasmWorker: "/ivs/amazon-ivs-wasmworker.min.js",
          serviceWorker: {
            url: "/ivs/amazon-ivs-service-worker-loader.js"
          }
        } as PlayerConfig);
        registerIVSQualityPlugin(videojs);
        playerConfig.techOrder = ["AmazonIVS", "html5"];
      }
      const self = this;
      this.videoJsPlayer = videojs("videojs", playerConfig, () => {
        const player = toRaw(self.videoJsPlayer) as IVSPlayer;
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
    return !!this.videoJsPlayer;
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
    const playerEvent = player.getIVSEvents().PlayerEventType;
    const ivsPlayer = player.getIVSPlayer();

    // for subtitles and captions (if any)
    ivsPlayer.addEventListener(playerEvent.TEXT_CUE, (e: TextCue) => {
      console.log("IVS Player Text Cue:", e);
    });

    ivsPlayer.addEventListener(
      playerEvent.TEXT_METADATA_CUE,
      (e: TextMetadataCue) => {
        console.log("IVS Player Text Metadata Cue:", e);
      }
    );

    ivsPlayer.addEventListener(playerEvent.ERROR, (e: PlayerError) => {
      console.error("IVS Player Error:", e);
      this.onPlayerError({
        code: e.code || 990002,
        message: e.message || "Unknown IVS Player error",
        type: e.type || "error"
      });
    });
  }

  stopStream() {
    this.videoJsPlayer?.dispose();
    this.videoJsPlayer = null;
    return;
  }
}
