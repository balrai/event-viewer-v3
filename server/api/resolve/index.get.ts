import {
  failure,
  html,
  internalServerError,
  success
} from "~~/server/lib/nwv2-api-lib/src/response-lib";
import { ErrorResponse } from "~~/server/lib/nwv2-api-lib/src/enums/enums";
import { normalizePath } from "~~/server/lib/nwv2-api-lib/lib/util/path-util";
import { eventStorage } from "~~/server/lib/nwv2-api-lib/src/storage/event-storage";
import EventFacade from "~~/server/lib/nwv2-api-lib/src/facades/event-facade";
import { PublicResolution } from "~~/server/utils/event-resolution/impls/public-resolution";
import { PreEmailGenericResolution } from "~~/server/utils/event-resolution/impls/pre-email-generic-resolution";
import { SelfEmailGenericUniqueResolution } from "~~/server/utils/event-resolution/impls/self-email-generic-unique";
import { PreRegNoPwRecoveryResolution } from "~~/server/utils/event-resolution/impls/pre-reg-no-pw-recovery";
import { SelfEmailPasswordResolution } from "~~/server/utils/event-resolution/impls/self-email-password";
import AnalyticsFacade from "~~/server/lib/nwv2-api-lib/src/facades/analytics-facade";
import { OpenEnrollmentResolution } from "~~/server/utils/event-resolution/impls/open-enrollment-resolution";
import { templateStorage } from "~~/server/lib/nwv2-api-lib/src/storage/template-storage";
import Localization from "~~/server/lib/nwv2-api-lib/src/facades/localization";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { eventCode, path, rehearsal } = query;
    const { secure } = (await getUserSession(event)) as any;
    let accessToken: string | undefined = undefined;
    if (secure) {
      accessToken = secure.accessToken;
    }
    let locale: string | undefined = Array.isArray(query.locale)
      ? (query.locale[0] as string | undefined)
      : ((query.locale as string | undefined) ?? undefined);

    const eventProfile =
      await eventStorage.getEventProfileByEventCode(eventCode);
    if (!eventProfile || !eventProfile.enabled) {
      return failure(ErrorResponse.EVENT_NOT_EXIST);
    }
    const { authPreset, eventId } = eventProfile;
    if (!locale) {
      locale = await EventFacade.getEventDefaultLocale(eventId);
    }

    const handler = new PublicResolution()
      .setNext(new PreEmailGenericResolution())
      .setNext(new SelfEmailGenericUniqueResolution())
      .setNext(new PreRegNoPwRecoveryResolution())
      .setNext(new OpenEnrollmentResolution())
      .setNext(new SelfEmailPasswordResolution());
    const result = await handler.handle(
      event,
      eventProfile,
      authPreset,
      path,
      locale,
      accessToken,
      rehearsal
    );
    locale = result.data.locale || locale;
    if (result.success) {
      if (rehearsal != "true") {
        try {
          await AnalyticsFacade.recordPageVisit(
            event,
            eventId,
            result.data.session?.sessionId,
            path,
            accessToken
          );
        } catch (e) {
          console.log("Error recording page visit: ", e);
        }
      } else {
        await AnalyticsFacade.recordRehearsalPageVisit(
          event,
          eventId,
          result.data.session?.sessionId,
          path,
          accessToken
        );
      }
      let session = result.data.session;
      let livestateData = null;
      if (session) {
        try {
          livestateData = await eventStorage.getSessionLiveState(
            session.sessionId
          );
        } catch (e) {
          console.log("Error fetching livestate data:", e);
        }
      }

      if (!!session && session.sessionType === "Archive") {
        if (session.autoStart && session.endAt < new Date().getTime()) {
          return {
            event: eventProfile,
            session: null,
            liveState: livestateData,
            htmlContent: await fullHtml(
              eventProfile.eventId,
              result.data.templateId,
              locale,
              result.data.recordType,
              result.data.recordId
            ),
            userSession: result.data.userSession,
            error: "UNAVAILABLE",
            path: result.path
          };
        }
      }
      console.log("userSession: ", result.data);

      return {
        event: eventProfile,
        session: session,
        liveState: livestateData,
        htmlContent: await fullHtml(
          eventProfile.eventId,
          result.data.templateId,
          locale,
          result.data.recordType,
          result.data.recordId
        ),
        userSession: result.data.userSession,
        path: result.path
      };
    } else {
      return {
        event: eventProfile,
        session: result.data.session,
        userSession: result.data.userSession,
        error: result.error.error,
        htmlContent: await fullHtml(
          eventProfile.eventId,
          eventProfile.error.templateId,
          locale,
          null,
          null
        ),
        path: result.path
      };
    }
  } catch (e) {
    console.log("e => ", e);
    return internalServerError(e);
  }
});

async function fullHtml(
  eventId: string,
  templateId: string,
  locale: string | undefined,
  recordType: string | null,
  recordId: string | null
) {
  try {
    const templateProfile = await templateStorage.getTemplateProfile(
      eventId,
      templateId
    );
    if (!templateProfile) {
      throw new Error("Template profile not found");
    }
    const fullHtml = await templateStorage.getComponent(templateId, "FullHTML");
    if (!fullHtml) {
      throw new Error("FullHTML component not found");
    }
    const templateLocale = await eventStorage.getLocalization(
      eventId,
      "Template",
      templateId,
      locale
    );
    let alternativeLocales: Record<string, string> = {};
    if (recordType && recordId && locale) {
      alternativeLocales = await eventStorage.getLocalization(
        eventId,
        recordType,
        recordId,
        locale
      );
    }
    return Localization.localizeString(
      fullHtml.content,
      templateLocale?.content,
      alternativeLocales?.content
    );
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: e
    });
  }
}
