import {
  Stage,
  SubscribeType,
  JitterBufferMinDelay
} from "amazon-ivs-web-broadcast";
import { ref } from "vue";
import LiveStreaming from "../Loader";

export default class IvsRealtimeLoader extends LiveStreaming {
  playerId: string;
  videoElement: HTMLVideoElement | null;
  stage: Stage | null;
  participants: Array<{ participant: any; streams: any[] }>;
  streamParticipants: any[];
  subscribeToken: string | null;
  //   videoStream: MediaStreamTrack | null;
  //   audioStream: MediaStreamTrack | null;
  loading: ReturnType<typeof ref>;
  constructor(options: Record<string, any> = {}) {
    super();
    Object.assign(this, options);
    this.playerId = "ivsrealtime-player";
    this.videoElement = null;
    this.stage = null;
    this.participants = [];
    this.streamParticipants = [];
    this.subscribeToken = null;
    this.loading = ref(false);
  }

  setVideoElement(element: HTMLVideoElement | null) {
    this.videoElement = element;
  }

  async startIvsRealtimeStream(locale: string | null = null) {
    try {
      if (!locale) {
        locale = await this.getStreamingLanguage();
      }
      console.log("Starting IVS Realtime stream with locale:", locale);
      this.token = (
        await this.api.getSubscribeToken(this.instanceId, locale)
      ).token;
      if (this.token) {
        console.log("token found");
        await this.setupIvsRealtimeStream(this.token);
      } else {
        console.log("token not found");
        setTimeout(async () => await this.startIvsRealtimeStream(), 1500);
      }
    } catch (err) {
      console.log("Error starting IVS realtime stream: ", err);
    } finally {
      this.loading.value = false;
    }
  }

  async stopIvsRealtimeStream() {
    this.loading.value = true;
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
    }
    if (this.stage) {
      try {
        this.stage.removeAllListeners();
        this.stage.leave();
      } catch (err) {
        console.log("Error while leaving stage", err);
      }
      this.stage = null;
    }
    this.participants = [];
    this.streamParticipants = [];
    this.token = null;
    this.videoStream = null;
    this.audioStream = null;
  }

  async setupIvsRealtimeStream(token: string) {
    if (token) {
      const strategy = {
        shouldSubscribeToParticipant: () => {
          return SubscribeType.AUDIO_VIDEO;
        },
        subscribeConfiguration: () => {
          return {
            JitterBufferMinDelay: JitterBufferMinDelay.MEDIUM
          };
        }
      };
      this.stage = new Stage(token, strategy);
      this.stage.on("stageConnectionStateChanged", (state) => {
        console.log("Stage connection state changed:", state);
      });
      this.stage.on("stageParticipantStreamsAdded", (participant, streams) => {
        console.log("Participant streams added:", participant, streams);
        if (streams && streams.length > 0) {
          this.handleParticipantJoined(participant, streams);
        } else {
          console.log("No streams found for the participant.");
        }
      });
      this.stage.on("stageParticipantLeft", (participant) => {
        console.log("Participant left:", participant);
        this.handleParticipantLeft(participant);
      });
      try {
        await this.stage.join();
      } catch (err) {
        console.error("Error joining stage:", err);
      }
    } else {
      console.log("token not found");
    }
  }
  handleParticipantJoined(participant, streams) {
    console.log("Participant joined:", participant, streams);
    this.participants = [...this.participants, { participant, streams }];
    // Find the video stream from the participant's streams
    const videoStream = streams.find(
      (stream) => stream.mediaStreamTrack.kind === "video"
    );
    const audioStream = streams.find(
      (stream) => stream.mediaStreamTrack.kind === "audio"
    );

    if (videoStream && audioStream) {
      this.videoStream = videoStream;
      this.audioStream = audioStream;
      const mediaStream = new MediaStream();
      mediaStream.addTrack(this.videoStream.mediaStreamTrack);
      mediaStream.addTrack(this.audioStream.mediaStreamTrack);
      this.videoElement.srcObject = mediaStream;
      this.videoElement.play();
    }
  }
  handleParticipantLeft(participant) {
    this.participants = this.participants.filter(
      (p) => p.participant.id !== participant.id
    );
    console.log("Participant left:", this.participants);
    if (this.participants.length === 0) {
      console.log("No participants left, stopping video.");
      this.videoElement.pause();
      this.videoElement.srcObject = null;
    }
  }

  // Fullscreen methods
  enterFullscreen() {
    if (this.videoElement) {
      if (this.videoElement.requestFullscreen) {
        this.videoElement.requestFullscreen();
      } else if (this.videoElement.webkitRequestFullscreen) {
        // Safari
        this.videoElement.webkitRequestFullscreen();
      } else if (this.videoElement.mozRequestFullScreen) {
        // Firefox
        this.videoElement.mozRequestFullScreen();
      } else if (this.videoElement.msRequestFullscreen) {
        // IE/Edge
        this.videoElement.msRequestFullscreen();
      } else if (this.videoElement.webkitEnterFullscreen) {
        // iOS Safari
        this.videoElement.webkitEnterFullscreen();
      }
      console.log("Entered fullscreen from loader");
    }
  }

  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      // Safari
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      // Firefox
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      // IE/Edge
      document.msExitFullscreen();
    }
    console.log("Exited fullscreen from loader");
  }

  toggleFullscreen() {
    if (
      !document.fullscreenElement &&
      !document.webkitFullscreenElement &&
      !document.mozFullScreenElement &&
      !document.msFullscreenElement
    ) {
      this.enterFullscreen();
    } else {
      this.exitFullscreen();
    }
  }
}
