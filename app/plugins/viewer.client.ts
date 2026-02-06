import EventExtension from "@/viewer/event/Loader";
import Livestreaming from "@/viewer/livestreaming/Loader";
import Extensionloader from "~/lib/nwv2-client-lib/classes/Viewer/Extension/Loader";
import ViewerApi from "~/lib/nwv2-client-lib/classes/Viewer/Api";
import * as env from "~/lib/nwv2-client-lib/api/env.js";
// import ViewerConnector from "~/lib/nwv2-client-lib/classes/Viewer/Connector";

export async function initializeViewer() {
  console.log("Loading env vars for viewer...");
  await env.loadEnvVars();
  const config = useRuntimeConfig().public as {
    mqttPoolId: string;
    mqttEndpoint: string;
    awsRegion: string;
    projectStageId: string;
  };

  const viewerStore = useViewerStore();
  const { eventCode, currentPath, event } = storeToRefs(viewerStore);

  const awsConfig = {
    poolId: config.mqttPoolId,
    host: config.mqttEndpoint,
    region: config.awsRegion,
    iotPolicyName: `${config.projectStageId}-IoTStack-messageBrokerPolicy`
  };
  if (!(globalThis as any).process) (globalThis as any).process = {};
  if (typeof (globalThis as any).process.nextTick !== "function") {
    (globalThis as any).process.nextTick = (cb: Function, ...args: any[]) =>
      Promise.resolve().then(() => cb(...args));
  }
  const ViewConnector =
    await import("~/lib/nwv2-client-lib/classes/Viewer/Connector");
  const connector = new ViewConnector.default("event-viewer", awsConfig);
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

  await connector.boot();

  return {
    api,
    connector,
    eventExtension
  };
}

export default defineNuxtPlugin(async (nuxtApp) => {
  nuxtApp.hook("app:mounted", async () => {
    try {
      await env.loadEnvVars();
      const NovaViewer = await initializeViewer();
      nuxtApp.provide("viewer", NovaViewer);
    } catch (e) {
      console.error("Error initializing Nova Viewer:", e);
    }
  });
});
