import {
  IPathResolutionHandler,
  PathResolutionResult
} from "../path-resolution";
import { tryGetUserProfileWithToken } from "./user-session-util";
import { eventStorage } from "~~/server/lib/nwv2-api-lib/src/storage/event-storage";
import {
  isSessionEnded,
  isSessionNotStarted,
  isSessionStarted,
  shouldShowEndShow,
  shouldShowPreShow,
  userCanJoinSession,
  shouldShowStatusEndShow,
  shouldShowStatusPreShow,
  shouldShowStatus
} from "../onshow-logic";
import { ErrorResponse } from "~~/server/lib/nwv2-api-lib/src/enums/enums";
import { AuthPreset } from "~~/server/lib/nwv2-api-lib/src/event-auth/auth-presets";

export class OpenEnrollmentResolution extends IPathResolutionHandler {
  async _handle(gatewayEvent, event, path, locale, accessToken, rehearsal) {
    const { eventId, preShow, endShow, login, main } = event;

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

    let userProfile = await tryGetUserProfileWithToken(accessToken, rehearsal);
    let page;
    if (!path) {
      path = "main";
    } else {
      const webpages = await eventStorage.getEventWebpages(eventId);
      page = webpages.find((w) => w.path === path);
    }

    switch (path) {
      case "main":
        if (shouldShowEndShow(endShow)) {
          return new PathResolutionResult(
            true,
            {
              templateId: endShow.templateId
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
          //     templateId: preShow.templateId
          // }, null);
        }
        if (shouldShowStatus(showStatus)) {
          if (rehearsal != "true") {
            return PathResolutionResult.showStatusWebpage(
              null,
              showStatus,
              null,
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
        if (userProfile) {
          return new PathResolutionResult(
            true,
            {
              templateId: main.templateId
            },
            null
          );
        } else {
          return new PathResolutionResult(
            true,
            {
              templateId: login.templateId
            },
            null
          );
        }
    }

    if (page) {
      if (page.isSession) {
        if (userProfile) {
          const { sessionId } = page;
          if (shouldShowEndShow(endShow)) {
            return new PathResolutionResult(
              true,
              {
                templateId: endShow.templateId
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
          }
          const session = await eventStorage.getEventSession(
            eventId,
            sessionId
          );
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
                null,
                "Session"
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
          if (!userCanJoinSession(userProfile, session)) {
            return new PathResolutionResult(
              false,
              {
                session
              },
              ErrorResponse.UNAUTHORIZED
            );
          }
          if (isSessionNotStarted(session)) {
            return new PathResolutionResult(
              false,
              {
                session
              },
              ErrorResponse.SESSION_NOT_STARTED
            );
          }
          if (isSessionEnded(session)) {
            return new PathResolutionResult(
              false,
              {
                session
              },
              ErrorResponse.SESSION_ENDED
            );
          }
          if (isSessionStarted(session)) {
            return PathResolutionResult.Session(session, page.templateId);
          }
          return new PathResolutionResult(
            false,
            {
              session
            },
            ErrorResponse.SESSION_NOT_LIVE
          );
        } else {
          console.log("else zone");
          return new PathResolutionResult(
            true,
            {
              templateId: login.templateId
            },
            null
          );
        }
      } else {
        if (page.enabled) {
          if (page.requireLogin && !userProfile) {
            return new PathResolutionResult(
              true,
              {
                templateId: login.templateId
              },
              null
            );
          }
          return PathResolutionResult.Webpage(page);
        }
      }
    }

    return new PathResolutionResult(false, {}, ErrorResponse.UNAVAILABLE);
  }

  canHandle(authPreset) {
    return authPreset === AuthPreset.OPEN_ENROLLMENT;
  }
}
