import {
  IPathResolutionHandler,
  PathResolutionResult
} from "../path-resolution";
import { AuthPreset } from "~~/server/lib/nwv2-api-lib/src/event-auth/auth-presets";
import EventFacade from "~~/server/lib/nwv2-api-lib/src/facades/event-facade";
import { PublicReg } from "~~/server/lib/nwv2-api-lib/src/event-auth/registration-handlers-impl/public-reg";
import { eventStorage } from "~~/server/lib/nwv2-api-lib/src/storage/event-storage";
import { ErrorResponse } from "~~/server/lib/nwv2-api-lib/src/enums/enums";
import {
  isSessionEnded,
  isSessionNotStarted,
  isSessionStarted,
  shouldShowEndShow,
  shouldShowPreShow,
  shouldShowStatusEndShow,
  shouldShowStatusPreShow,
  shouldShowStatus
} from "../onshow-logic";

export class PublicResolution extends IPathResolutionHandler {
  async _handle(gatewayEvent, event, path, locale, accessToken, rehearsal) {
    const { eventId, preShow, endShow, registration, main } = event;

    let { showStatus } = event;
    if (showStatus === undefined) {
      showStatus = {
        autoEnd: false,
        state: "Ready",
        webpageId: null,
        templateId: null,
        endAt: event.endAt,
        enable: true,
        startAt: event.startAt,
        autoStart: false,
        redirectUrl: null
      };
    }

    let userSession;
    if (!accessToken) {
      const defaultGroup = await EventFacade.getDefaultUserGroup(eventId);
      const userGroups = [defaultGroup.userGroupId];
      const result = await new PublicReg().handle(
        event,
        registration,
        AuthPreset.PUBLIC,
        {
          locale,
          userGroups
        }
      );
      userSession = result.data;
    }

    if (!path) {
      if (shouldShowEndShow(endShow)) {
        return new PathResolutionResult(
          true,
          {
            templateId: endShow.templateId,
            userSession
          },
          null
        );
      }
      if (shouldShowPreShow(preShow)) {
        if (rehearsal != "true") {
          return new PathResolutionResult(
            true,
            {
              templateId: preShow.templateId
            },
            null
          );
        }
        return new PathResolutionResult(
          true,
          {
            templateId: main.templateId
          },
          null
        );
        // return new PathResolutionResult(true, {
        //     templateId: preShow.templateId,
        //     userSession
        // }, null);
      }
      if (shouldShowStatus(showStatus)) {
        if (rehearsal != "true") {
          return PathResolutionResult.showStatusWebpage(
            null,
            showStatus,
            userSession,
            "Event"
          );
        }
        return new PathResolutionResult(
          true,
          {
            templateId: main.templateId
          },
          null
        );
      }
      return new PathResolutionResult(
        true,
        {
          templateId: main.templateId,
          userSession
        },
        null
      );
    }

    console.log("path =>", path);

    if (path === "main") {
      return new PathResolutionResult(
        true,
        {
          templateId: main.templateId,
          userSession
        },
        null
      );
    }

    const webpages = await eventStorage.getEventWebpages(eventId);
    const page = webpages.find((w) => w.path === path);
    console.log("page =>", page);
    if (page) {
      if (page.isSession) {
        const { sessionId } = page;
        if (shouldShowEndShow(endShow)) {
          return PathResolutionResult.TemplateOnly(
            endShow.templateId,
            userSession
          );
        }
        if (shouldShowPreShow(preShow)) {
          return PathResolutionResult.TemplateOnly(
            preShow.templateId,
            userSession
          );
        }
        const session = await eventStorage.getEventSession(eventId, sessionId);
        let sessionShowStatus = session.showStatus;
        if (sessionShowStatus === undefined) {
          sessionShowStatus = {
            autoEnd: false,
            state: "Ready",
            webpageId: null,
            templateId: null,
            endAt: event.endAt,
            enable: false,
            startAt: event.startAt,
            autoStart: false,
            redirectUrl: null
          };
        }
        if (shouldShowStatus(sessionShowStatus)) {
          if (rehearsal != "true") {
            return PathResolutionResult.showStatusWebpage(
              session,
              sessionShowStatus,
              userSession,
              "Session"
            );
          }
          return new PathResolutionResult(
            true,
            {
              templateId: main.templateId,
              userSession
            },
            null
          );
        }
        if (isSessionNotStarted(session)) {
          return new PathResolutionResult(
            false,
            {
              session,
              userSession
            },
            ErrorResponse.SESSION_NOT_STARTED
          );
        }
        if (isSessionEnded(session)) {
          return new PathResolutionResult(
            false,
            {
              session,
              userSession
            },
            ErrorResponse.SESSION_ENDED
          );
        }
        if (isSessionStarted(session)) {
          return PathResolutionResult.Session(
            session,
            page.templateId,
            userSession
          );
        }
        return new PathResolutionResult(
          false,
          {
            session,
            userSession
          },
          ErrorResponse.SESSION_NOT_LIVE
        );
      } else {
        if (page.enabled) {
          return PathResolutionResult.Webpage(page, userSession);
        }
      }
    }

    console.log("page2 =>", page);

    return new PathResolutionResult(
      false,
      {
        userSession
      },
      ErrorResponse.UNAVAILABLE
    );
  }

  canHandle(authPreset) {
    return authPreset === AuthPreset.PUBLIC;
  }
}
