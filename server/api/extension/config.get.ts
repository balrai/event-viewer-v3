import { eventStorage } from "~~/server/lib/nwv2-api-lib/src/storage/event-storage";
import Localization from "~~/server/lib/nwv2-api-lib/src/facades/localization";
import { gatherGatewayData } from "~~/server/lib/nwv2-api-lib/src/facades/analytics-facade";
import ipRangeCheck from "ip-range-check";

function updateStreamingUrls(streamingUrls: string[][]): string[][] {
  const oldUrlPrefix = "https://430f859e2e11.us-east-1.playback.live-video.net";
  const newUrlPrefix = "https://ivs.novaweb.live";

  for (let i = 0; i < streamingUrls.length; i++) {
    const inner = streamingUrls[i];
    if (!inner) continue;
    for (let j = 0; j < inner.length; j++) {
      const url = inner[j];
      if (!url) continue;
      if (url.startsWith(oldUrlPrefix)) {
        inner[j] = url.replace(oldUrlPrefix, newUrlPrefix);
      }
    }
  }

  return streamingUrls;
}

// getExtensionInstance
export default defineEventHandler(async (event) => {
  console.log("Extension config.get handler called");
  try {
    const query = getQuery(event);
    // const gatewayData = gatherGatewayData(event);

    const { eventId, instanceId, sessionId } = query;
    console.log("Params:", { eventId, instanceId, sessionId });
    let { locale } = query;
    if (!locale) {
      const session = await getUserSession(event);
      locale = (session.user as { locale?: string }).locale || "en-US";
    }
    if (!(await eventStorage.hasEvent(eventId))) {
      return createError({
        statusCode: 404,
        statusMessage: "Event not found"
      });
    }
    let instance = await eventStorage.getExtensionInstance(eventId, instanceId);
    if (!instance) {
      return createError({
        statusCode: 404,
        statusMessage: "Extension instance not found"
      });
    }
    const { extensionType } = instance;
    let locMap;
    if (locale) {
      locMap = await eventStorage.getLocalization(
        eventId,
        extensionType,
        instanceId,
        locale
      );
    }
    if (
      extensionType === "LiveStreaming" &&
      locMap?.content?.streamingUrls // &&
      // (gatewayData.viewerCountry === "CN" ||
      //   ipRangeCheck(gatewayData.ip, ["172.81.120.0/21", "129.227.153.0/24"]))
    ) {
      locMap.streamingUrls = updateStreamingUrls(locMap.content.streamingUrls);
      instance.streamingUrls = locMap.streamingUrls;
    }
    const result = Localization.localizeObject(instance, locMap?.content);
    if (result.extensionType == "Survey") {
      var questions = result.questions;
      questions.sort((a: any, b: any) =>
        a.order > b.order ? 1 : b.order > a.order ? -1 : 0
      );
      result.questions = questions;
      return result;
    } else {
      console.log(
        "Localized = ",
        Localization.localizeObject(instance, locMap?.content)
      );
      return Localization.localizeObject(instance, locMap?.content);
    }
  } catch (e) {
    return createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: e
    });
  }
});
