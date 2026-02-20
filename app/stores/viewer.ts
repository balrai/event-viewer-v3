import { createApp } from "vue";

interface EventData {
  event: any;
  userSession?: any;
  session?: any;
  htmlContent?: string;
  path: string | null;
}

export const useViewerStore = defineStore("viewer", () => {
  const deferredScripts = useState<
    Array<{ src?: string; innerHTML?: string; type?: string }>
  >("deferredScripts", () => []);
  const config = useRuntimeConfig();
  const baseURL = config.public.baseURL || "";
  const event = useState("event", () => null);
  const eventCode = useState<string | null>("eventCode", () => null);
  const currentPath = useState<string | null>("currentPath", () => null);
  const userSession = useState("userSession", () => null);
  const loading = ref(false);
  const head = useState<Object | null>("header", () => null);
  const body = useState<string | null>("body", () => null);
  const error = ref<string | null>(null);
  const session = useState("session", () => null);
  const liveState = useState("liveState", () => ({}));
  let observer: MutationObserver | null = null;

  const extensions = useState<Record<string, boolean>>(
    "extensions",
    () => ({})
  );

  const { viewer } = useViewer(); // ensure viewer is initialized

  console.log("Viewer store initialized, viewer:", viewer);
  const extensionRegistry: Record<string, Component> = {
    livestreaming: {
      component: defineAsyncComponent(
        () => import("~/components/Livestreaming.vue")
      )
    },
    slideshow: {
      component: defineAsyncComponent(
        () => import("~/components/SlideShow.vue")
      )
    }
  };

  const whitelist = new Set(Object.keys(extensionRegistry));

  function setLiveState(state: Record<string, any>) {
    liveState.value = { ...liveState.value, ...state };
  }
  function setSession(sessionData: any) {
    session.value = sessionData;
  }

  function setUserSession(session: any) {
    userSession.value = session;
  }

  function setError(err: string | null) {
    error.value = err;
  }

  function setCurrentPath(path: string | null) {
    currentPath.value = path;
  }

  function setEventCode(code: string | null) {
    eventCode.value = code;
  }

  function setEvent(eventData: EventData) {
    event.value = eventData.event;
  }

  async function setTemplate(htmlContent?: string | null) {
    if (!htmlContent) {
      head.value = null;
      body.value = null;
      return;
    }
    if (import.meta.server) {
      const cheerio = await import("cheerio");
      const $ = cheerio.load(htmlContent);

      $("[nova-extension]").each((_, el) => {
        const extName = $(el).attr("nova-extension");
        if (extName && whitelist.has(extName)) {
          extensions.value[extName] = true;
        }
      });
      const headObj: any = {};

      const title = $("title").text();
      if (title) headObj.title = title;

      headObj.meta = $("meta")
        .toArray()
        .map((el) => Object.fromEntries(Object.entries($(el).attr() || {})));

      headObj.link = $("link")
        .toArray()
        .map((el) => Object.fromEntries(Object.entries($(el).attr() || {})));

      headObj.script = [];
      $("script").each((i, el) => {
        const $el = $(el);
        const attrs = $el.attr() || {};
        if (attrs.src && attrs.src.includes("webpage.js")) {
          return;
        }
        if (attrs.src) {
          headObj.script.push(attrs);
        } else {
          // inline script -> allow innerHTML by ID
          const id = `inline-script-${Date.now()}-${i}`;
          headObj.script.push({
            innerHTML: $el.html() || "",
            type: attrs.type || "text/javascript",
            hid: id
          });
          headObj.__dangerouslyDisableSanitizersByTagID =
            headObj.__dangerouslyDisableSanitizersByTagID || {};
          headObj.__dangerouslyDisableSanitizersByTagID[id] = ["innerHTML"];
        }
      });

      headObj.style = [];
      $("style").each((i, el) => {
        const id = `inline-style-${Date.now()}-${i}`;
        headObj.style.push({ innerHTML: $(el).html() || "", hid: id });
      });
      head.value = headObj;
      $("body")
        .find("a[nova-href]")
        .each((_, el) => {
          const $el = $(el);
          $el.attr("href", getUrl($el.attr("nova-href") || "#"));
        });
      body.value = $("body").html() || null;
    }

    // Client: use DOMParser
    if (import.meta.client) {
      try {
        const doc = new DOMParser().parseFromString(htmlContent, "text/html");
        doc.querySelectorAll("script").forEach((el, i) => {
          const src = el.getAttribute("src");

          if (src && src.includes("webpage.js")) {
            return;
          }
          if (src) {
            deferredScripts.value.push({ src });
          } else {
            deferredScripts.value.push({
              innerHTML: el.innerHTML || "",
              type: el.getAttribute("type") || "text/javascript"
            });
          }
          el.remove();
        });

        const headObj: any = {};
        const titleEl = doc.querySelector("title");
        if (titleEl?.textContent) headObj.title = titleEl.textContent;

        headObj.meta = Array.from(doc.querySelectorAll("meta")).map((el) =>
          Object.fromEntries(
            Array.from(el.attributes).map((a) => [a.name, a.value])
          )
        );

        headObj.link = Array.from(doc.querySelectorAll("link")).map((el) =>
          Object.fromEntries(
            Array.from(el.attributes).map((a) => [a.name, a.value])
          )
        );

        headObj.script = [];
        Array.from(doc.querySelectorAll("script")).forEach((el, i) => {
          const src = el.getAttribute("src");
          if (src && src.includes("webpage.js")) {
            return;
          }
          if (src) headObj.script.push({ src });
          else {
            const id = `inline-script-${Date.now()}-${i}`;
            headObj.script.push({
              innerHTML: el.innerHTML || "",
              type: el.getAttribute("type") || "text/javascript",
              hid: id
            });
            headObj.__dangerouslyDisableSanitizersByTagID =
              headObj.__dangerouslyDisableSanitizersByTagID || {};
            headObj.__dangerouslyDisableSanitizersByTagID[id] = ["innerHTML"];
          }
        });

        headObj.style = [];
        Array.from(doc.querySelectorAll("style")).forEach((el, i) => {
          const id = `inline-style-${Date.now()}-${i}`;
          headObj.style.push({ innerHTML: el.innerHTML || "", hid: id });
        });

        head.value = headObj;
        clearExistingExtensions();
        initExtensionObserver();
        body.value = doc.body ? doc.body.innerHTML || null : null;

        window.addEventListener("nova.viewer.api.ready", () => {
          executeDeferredScripts();
          const w: any = window;
          if (w.NovaViewer) {
            w.NovaViewer.initParams = {
              ...w.NovaViewer.initParams,
              error: error.value,
              redirect: eventCode.value
            };
          }
        });
        // If viewer already ready (page loaded after viewer init), run immediately
        if ((window as any).NovaViewer) {
          executeDeferredScripts();
        }
      } catch (err) {
        console.error("Failed to parse template on client:", err);
        head.value = null;
        body.value = null;
      }
    }
  }

  function replaceEventLinks() {
    console.log("Replacing event links with baseURL:", baseURL);
    if (baseURL) {
      const elements = document.querySelectorAll("a[nova-href]");
      console.log("elements", elements);

      for (let index = 0; index < elements.length; index++) {
        const element = elements[index];
        console.log("element", element);
        const path = element?.getAttribute("nova-href") || "";
        console.log("path:", path);
        const url = getUrl(path);
        console.log("url::", url);
        element?.setAttribute("href", url);
        element?.removeAttribute("nova-href");
      }
    }
  }

  function initExtensionObserver() {
    if (import.meta.server || observer) return;

    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check if the node itself is an extension or contains extensions
            const extensions = node.hasAttribute("nova-extension")
              ? [node]
              : node.querySelectorAll("[nova-extension]");

            extensions.forEach((el) => mountSingleExtension(el as HTMLElement));
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function mountSingleExtension(el: HTMLElement) {
    const extName = el.getAttribute("nova-extension");
    if (extName && extensionRegistry[extName] && !(el as any).__vue_app__) {
      const ext = extensionRegistry[extName] as {
        component: any;
        props?: any;
      };

      console.log(`🚀 Lifecycle: Mounting ${extName} to real DOM`);

      const app = createApp(ext.component);
      const nuxtApp = useNuxtApp();

      app.use(nuxtApp.$pinia);
      app.config.globalProperties.$fetch = nuxtApp.$fetch;
      app.provide("_nuxtApp", nuxtApp);

      app.mount(el);
      (el as any).__vue_app__ = app;
    }
  }

  function clearExistingExtensions() {
    document.querySelectorAll("[nova-extension]").forEach((el) => {
      const app = (el as any).__vue_app__;
      if (app) {
        app.unmount();
        delete (el as any).__vue_app__;
      }
    });
  }

  function getUrl(path = "") {
    if (path) {
      const url = new URL(`${eventCode.value}/${path}`, baseURL);
      return url.toString();
    }
    return baseURL;
  }

  function executeDeferredScripts() {
    const scripts = deferredScripts.value.splice(0); // take snapshot and clear
    const loadNext = (i = 0) => {
      if (i >= scripts.length) {
        return;
      }
      const s = scripts[i];
      if (s?.src) {
        const el = document.createElement("script");
        el.src = s.src;
        el.defer = true;
        el.onload = () => loadNext(i + 1);
        el.onerror = () => {
          console.error("Failed to load", s.src);
          loadNext(i + 1);
        };
        document.head.appendChild(el);
      } else {
        const el = document.createElement("script");
        el.type = s?.type || "text/javascript";
        el.text = s?.innerHTML || "";
        document.body.appendChild(el);

        loadNext(i + 1);
      }
    };
    // ensure DOM updated first
    Promise.resolve().then(() => loadNext());
  }

  return {
    userSession,
    setUserSession,
    event,
    setEvent,
    loading,
    error,
    setError,
    head,
    body,
    setTemplate,
    extensions,
    currentPath,
    setCurrentPath,
    eventCode,
    setEventCode,
    session,
    setSession,
    liveState,
    replaceEventLinks,
    setLiveState
  };
});
