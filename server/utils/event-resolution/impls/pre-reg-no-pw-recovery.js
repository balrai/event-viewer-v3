import {
  IPathResolutionHandler,
  PathResolutionResult
} from "../path-resolution";
import { AuthPreset } from "~~/server/lib/nwv2-api-lib/src/event-auth/auth-presets";
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
import { eventStorage } from "~~/server/lib/nwv2-api-lib/src/storage/event-storage";
import { ErrorResponse } from "~~/server/lib/nwv2-api-lib/src/enums/enums";
import { tryGetUserProfileWithToken } from "./user-session-util";

export class PreRegNoPwRecoveryResolution extends IPathResolutionHandler {
  async _handle(gatewayEvent, event, path, locale, accessToken, rehearsal) {
    const {
      eventId,
      preShow,
      endShow,
      login,
      main,
      networking,
      inbox,
      profile,
      eLearning
    } = event;
    const videoCall = event["video-call"];

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

    if (!path) {
      path = "";
    }

    switch (path) {
      case "":
      case "main":
        if (!userProfile) {
          return onShowFlow(
            endShow,
            preShow,
            login.templateId,
            rehearsal,
            showStatus
          );
        } else {
          return onShowFlow(
            endShow,
            preShow,
            main.templateId,
            rehearsal,
            showStatus
          );
        }
      case "networking":
        if (!userProfile) {
          return new PathResolutionResult(
            true,
            {
              templateId: login.templateId
            },
            null
          );
        } else if (networking.enabled) {
          return new PathResolutionResult(
            true,
            {
              templateId: networking.templateId
            },
            null
          );
        }
        break;
      case "inbox":
        if (!userProfile) {
          return new PathResolutionResult(
            true,
            {
              templateId: login.templateId
            },
            null
          );
        } else if (networking.enabled) {
          return new PathResolutionResult(
            true,
            {
              templateId: inbox.templateId
            },
            null
          );
        }
        break;
      case "video-call":
        if (!userProfile) {
          return new PathResolutionResult(
            true,
            {
              templateId: login.templateId
            },
            null
          );
        } else if (networking.enabled) {
          return new PathResolutionResult(
            true,
            {
              templateId: videoCall.templateId
            },
            null
          );
        }
        break;
      case "profile":
        if (!userProfile) {
          return new PathResolutionResult(
            true,
            {
              templateId: login.templateId
            },
            null
          );
        } else if (networking.enabled) {
          return new PathResolutionResult(
            true,
            {
              templateId: profile.templateId
            },
            null
          );
        }
        break;
      case "eLearning":
        if (!userProfile) {
          return new PathResolutionResult(
            true,
            {
              templateId: login.templateId
            },
            null
          );
        } else if (eLearning.enabled) {
          return new PathResolutionResult(
            true,
            {
              templateId: eLearning.templateId
            },
            null
          );
        }
        break;
    }

    const webpages = await eventStorage.getEventWebpages(eventId);
    const page = webpages.find((w) => w.path === path);
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
            // return new PathResolutionResult(true, {
            //     templateId: preShow.templateId
            // }, null);
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
    switch (authPreset) {
      case AuthPreset.PRE_EMAIL_UNIQUE:
      case AuthPreset.PRE_USERNAME_GENERIC:
        return true;
    }
    return false;
  }
}

function onShowFlow(
  endShow,
  preShow,
  fallbackTemplateId,
  rehearsal,
  showStatus
) {
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
    return new PathResolutionResult(
      true,
      {
        templateId: preShow.templateId
      },
      null
    );
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
        templateId: fallbackTemplateId
      },
      null
    );
  }
  return new PathResolutionResult(
    true,
    {
      templateId: fallbackTemplateId
    },
    null
  );
}
