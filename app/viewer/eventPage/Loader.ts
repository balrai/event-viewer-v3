import ExtensionLoader from "~/lib/nwv2-client-lib/classes/Viewer/Extension/Loader";
import LiveStreamingLoader from "@/viewer/livestreaming/Loader";
import { createApp } from "vue";
import LiveStreaming from "@/components/Livestreaming.vue";
// import SlideShow from "@/components/SlideShow.vue";

export default class EventPageLoader extends ExtensionLoader {
  // Explicitly declare properties used in the class so TypeScript can type-check them
  extensionAttrName: string;
  zIndexAttrName: string;
  iframeUrl: URL | string | null;
  baseUrl: string | null;
  eventTypes: { [key: string]: string };
  extensionsProps: Array<any>;
  onExtensionsDetected: ((props: any[]) => void) | null;
  gotoHandler: (path?: string) => void;
  LiveStreamingLoader: LiveStreamingLoader;

  constructor() {
    super("EventPage", true);
    this.extensionAttrName = "nova-extension";
    this.zIndexAttrName = "nova-z-index";
    this.iframeUrl = null;
    this.baseUrl = this.api ? this.api.baseUrl : null;
    this.eventTypes = {
      extensionsDetected: "nova.extension.detected"
    };
    this.extensionsProps = [];
    this.onExtensionsDetected = null;
    this.gotoHandler = (path) => {
      window.location = path;
    };
    this.LiveStreamingLoader = new LiveStreamingLoader();
    this.setupExternalInterface();
  }

  setupExternalInterface() {
    const self = this;
    this.api.registerExternalInterface("_", {
      EventPageBridge: self
    });

    this.api.registerExternalInterface("Event", {
      getHomeUrl() {
        return self.api.baseUrl;
      },
      getUrl(path = "") {
        return self.getUrl(path);
      },
      goto(path = "") {
        self.updateActiveExtensions([]);
        self.gotoHandler(self.getUrl(path));
      },
      goHome() {
        self.updateActiveExtensions([]);
        self.gotoHandler();
      },
      reloadExtensions() {
        const event = new CustomEvent("reload-extensions");
        window.dispatchEvent(event);
      }
    });
  }

  getUrl(path = "") {
    if (path) {
      const url = new URL(path, this.baseUrl.replace(/\/+$/, "") + "/");
      return url.toString();
    }
    return this.api.baseUrl;
  }

  detectExtensions(extensions) {
    var nodes = document.querySelectorAll("[" + this.extensionAttrName + "]");
    var results = [];
    var extensionName;
    var zIndex;
    var rect;
    for (var i = 0; i < nodes.length; i++) {
      extensionName = nodes[i].getAttribute(this.extensionAttrName);
      if (extensionName === "slideshow" && extensions) {
        this.renderExtension(
          nodes[i],
          SlideShow,
          extensions["slideshow"].extLoader
        );
      } else if (extensionName === "livestreaming" && extensions) {
        this.renderExtension(
          nodes[i],
          LiveStreaming,
          extensions["livestreaming"].extLoader
        );
      } else if (
        extensionName !== "livestreaming" &&
        extensionName !== "slideshow"
      ) {
        zIndex = nodes[i].getAttribute(this.zIndexAttrName);
        rect = nodes[i].getBoundingClientRect();
        results.push({
          extension: extensionName,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          zIndex: zIndex,
          scrollY: window.scrollY,
          scrollX: window.scrollX
        });
      }
    }
    this.extensionsProps = [...results];
    if (this.onExtensionsDetected) {
      this.onExtensionsDetected(this.extensionsProps);
    }
    setTimeout(() => {
      this.detectExtensions();
    }, 100);
  }

  loadUrl(url) {
    if (url) {
      this.updateActiveExtensions([]);
      let fixedUrl = new URL(url);
      new URL(top.location.toString()).searchParams.forEach((value, key) => {
        fixedUrl.searchParams.set(key, value);
      });
      fixedUrl = this.appendAccessToken(fixedUrl);
      fixedUrl = this.appendEventId(fixedUrl);
      fixedUrl = this.appendCallerUrl(fixedUrl);
      fixedUrl = this.appendLangCode(fixedUrl);
      this.iframeUrl = fixedUrl;
    }
  }

  commandHandler(data) {
    super.commandHandler(data);
    switch (data.command) {
      case "show":
        this.updateActiveExtensions([]);
        this.loadUrl(data.url);
        break;
      case "hide":
        // this.iframe.remove()
        this.iframe = null;
        this.iframeUrl = null;
        this.updateActiveExtensions([]);
        break;
    }
  }
  activateExtension() {
    super.activateExtension();
    this.setupEventListeners();
    this.setupExternalInterface();
  }

  extensionComparer(a, b) {
    return a.extension > b.extension ? -1 : 1;
  }

  updateActiveExtensions(extensions) {
    extensions.sort(this.extensionComparer);
    this.extensionsProps = extensions;
  }

  setupEventListeners() {
    const self = this;
    window.addEventListener("focus", () => {
      self.checkSessionStatus();
    });

    window.addEventListener(this.eventTypes.extensionsDetected, (evt) => {
      this.updateActiveExtensions(evt.detail);
    });
  }

  checkSessionStatus() {
    const sessionId = this.api.sessionId;
    if (sessionId) {
      this.api.getSession(sessionId).then(({ session }) => {
        // console.log(session);
        if (session) {
          if (this.api.session && session.state != this.api.session.state) {
            this.dispatchExtensionEvent("nova.event.session.updated", {
              sessionId
            });
          }
          if (session.state == "Ended") {
            this.dispatchExtensionEvent("nova.event.session.ended", {
              sessionId
            });
          }
        }
      });
    }
  }

  renderExtension(targetEl, component, extLoader) {
    if (targetEl.__vue_app__) {
      targetEl.__vue_app__.unmount();
      targetEl.innerHTML = "";
    }
    const app = createApp(component, { extLoader });
    app.mount(targetEl);
    targetEl.__vue_app__ = app;
  }
}
