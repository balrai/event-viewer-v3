import EventExtension from "@/viewer/event/Loader";
import Livestreaming from "@/viewer/livestreaming/Loader";
import Extensionloader from "~/lib/nwv2-client-lib/classes/Viewer/Extension/Loader";
import ViewerApi from "~/viewer/ViewerApi";
import * as env from "~/lib/nwv2-client-lib/api/env.js";

export async function initializeViewer() {
  console.log("Loading env vars for viewer...");
  await env.loadEnvVars();

  const viewerStore = useViewerStore();
  const { eventCode, currentPath, event } = storeToRefs(viewerStore);

  const api: ViewerApi = ViewerApi.singleton();
  api.init();
  const eventLoader = new EventExtension();

  return {
    api
  };
}

export default defineNuxtPlugin({
  name: "viewer",
  parallel: true,
  async setup(nuxtApp) {
    nuxtApp.hook("app:mounted", async () => {
      try {
        await initializeViewer();
      } catch (e) {
        console.error("Error initializing Nova Viewer:", e);
      }
    });
  }
});
