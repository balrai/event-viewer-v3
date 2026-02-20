import EventExtension from "@/viewer/event/Loader";
import Livestreaming from "@/viewer/livestreaming/Loader";
import Extensionloader from "~/lib/nwv2-client-lib/classes/Viewer/Extension/Loader";
import ViewerApi from "~/lib/nwv2-client-lib/classes/Viewer/Api";
import * as env from "~/lib/nwv2-client-lib/api/env.js";

export async function initializeViewer() {
  console.log("Loading env vars for viewer...");
  await env.loadEnvVars();

  const viewerStore = useViewerStore();
  const { eventCode, currentPath, event } = storeToRefs(viewerStore);

  if (!(globalThis as any).process) (globalThis as any).process = {};
  if (typeof (globalThis as any).process.nextTick !== "function") {
    (globalThis as any).process.nextTick = (cb: Function, ...args: any[]) =>
      Promise.resolve().then(() => cb(...args));
  }

  const api: ViewerApi = ViewerApi.singleton();
  const data = {
    event: event.value
  };
  if (eventCode.value) {
    console.log("Resolving path for event code:", currentPath.value, data);
    api.resolvePathHandler(currentPath.value, data);
  }

  const livestreamingExtension = new Livestreaming();
  const eventExtension = new EventExtension();

  return {
    api,
    eventExtension
  };
}

export default defineNuxtPlugin({
  name: "viewer",
  parallel: true,
  async setup(nuxtApp) {
    const viewerState = reactive({
      api: null as ViewerApi | null,
      isReady: false
    });

    nuxtApp.hook("app:mounted", async () => {
      try {
        const NovaViewer = await initializeViewer();
        viewerState.api = NovaViewer.api;
        viewerState.isReady = true;
        console.log("Nova Viewer initialized and ready.");
      } catch (e) {
        console.error("Error initializing Nova Viewer:", e);
      }
    });

    return {
      provide: {
        viewer: viewerState
      }
    };
  }
});
