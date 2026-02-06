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
  shouldShowRegistration,
  userCanJoinSession,
  shouldShowStatusEndShow,
  shouldShowStatusPreShow,
  shouldShowStatus
} from "../onshow-logic";
import { eventStorage } from "~~/server/lib/nwv2-api-lib/src/storage/event-storage";
import { ErrorResponse } from "~~/server/lib/nwv2-api-lib/src/enums/enums";
import { tryGetUserProfileWithToken } from "./user-session-util";
import CacheFacade from "~~/server/lib/nwv2-api-lib/src/facades/cache-facade";

export class SelfEmailPasswordResolution extends IPathResolutionHandler {
  async _handle(gatewayEvent, event, path, locale, accessToken, rehearsal) {
    const {
      eventId,
      preShow,
      endShow,
      login,
      main,
      registration,
      passwordRecovery,
      error,
      networking,
      inbox,
      profile,
      eLearning
    } = event;
    const videoCall = event["video-call"];

    let { showStatus, attendeeLimit } = event;

    const { attendeeViewingLimit = 0 } = registration;

    const limit = Number(attendeeViewingLimit);
    if (!isNaN(limit) && limit >= 0) {
      console.log("Valid viewing limit:", limit);
      attendeeLimit = {
        limit,
        eventId,
        ...attendeeLimit
      };
    } else {
      console.log("Invalid viewing limit");
    }
    console.log("attendeeLimit => ", attendeeLimit);

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
    // switch (path) {
    //     case "":
    //     case "main":
    //         if (!userProfile) {
    //             return new PathResolutionResult(true, {
    //                 templateId: login.templateId
    //             }, null, "accessPage");
    //         } else {
    //             return onShowFlow(endShow, preShow, main.templateId, rehearsal, showStatus);
    //         }
    //     case "registration":
    //         if (shouldShowRegistration(event, registration)) {
    //             return new PathResolutionResult(true, {
    //                 templateId: registration.templateId
    //             }, null, "accessPage");
    //         } else {
    //             return new PathResolutionResult(false, {
    //                 templateId: error.templateId
    //             }, ErrorResponse.REGISTRATION_ENDED);
    //         }
    //     case "recovery":
    //         return new PathResolutionResult(true, {
    //             templateId: passwordRecovery.trigger.templateId
    //         }, null, "accessPage");
    //     case "password-reset":
    //         return new PathResolutionResult(true, {
    //             templateId: passwordRecovery.reset.templateId
    //         }, null, "accessPage");
    //     case "networking":
    //         if (!userProfile) {
    //             return new PathResolutionResult(true, {
    //                 templateId: login.templateId
    //             }, null);
    //         } else if (networking.enabled) {
    //             return new PathResolutionResult(true, {
    //                 templateId: networking.templateId
    //             }, null);
    //         }
    //     case "inbox":
    //         if (!userProfile) {
    //             return new PathResolutionResult(true, {
    //                 templateId: login.templateId
    //             }, null);
    //         } else if (networking.enabled) {
    //             return new PathResolutionResult(true, {
    //                 templateId: inbox.templateId
    //             }, null);
    //         }
    //     case "video-call":
    //         if (!userProfile) {
    //             return new PathResolutionResult(true, {
    //                 templateId: login.templateId
    //             }, null);
    //         } else if (networking.enabled) {
    //             return new PathResolutionResult(true, {
    //                 templateId: videoCall.templateId
    //             }, null);
    //         }
    //     case "profile":
    //         console.log("Profile => ", new PathResolutionResult(true, {
    //             templateId: profile.templateId
    //         }, null), profile.templateId);
    //         if (!userProfile) {
    //             return new PathResolutionResult(true, {
    //                 templateId: login.templateId
    //             }, null);
    //         } else if (networking.enabled) {
    //             return new PathResolutionResult(true, {
    //                 templateId: profile.templateId
    //             }, null);
    //         }
    //     case "eLearning":
    //         console.log("eLearning => ", new PathResolutionResult(true, {
    //             templateId: eLearning.templateId
    //         }, null), eLearning.templateId);
    //             if (!userProfile) {
    //                 return new PathResolutionResult(true, {
    //                     templateId: login.templateId
    //                 }, null);
    //             } else if (eLearning.enabled) {
    //                 return new PathResolutionResult(true, {
    //                     templateId: eLearning.templateId
    //                 }, null);
    //             }
    // }

    switch (path) {
      case "":
      case "main":
        if (!userProfile) {
          return new PathResolutionResult(
            true,
            {
              templateId: login.templateId
            },
            null,
            "accessPage"
          );
        } else {
          return onShowFlow(
            endShow,
            preShow,
            main.templateId,
            rehearsal,
            showStatus,
            attendeeLimit
          );
        }
      case "registration":
        if (shouldShowRegistration(event, registration)) {
          return new PathResolutionResult(
            true,
            {
              templateId: registration.templateId
            },
            null,
            "accessPage"
          );
        } else {
          return new PathResolutionResult(
            false,
            {
              templateId: error.templateId
            },
            ErrorResponse.REGISTRATION_ENDED
          );
        }
      case "recovery":
        return new PathResolutionResult(
          true,
          {
            templateId: passwordRecovery.trigger.templateId
          },
          null,
          "accessPage"
        );
      case "password-reset":
        return new PathResolutionResult(
          true,
          {
            templateId: passwordRecovery.reset.templateId
          },
          null,
          "accessPage"
        );
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
            null,
            "accessPage"
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
              null,
              "accessPage"
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
      case AuthPreset.EMAIL_PASSWORD:
        return true;
    }
    return false;
  }
}

async function onShowFlow(
  endShow,
  preShow,
  fallbackTemplateId,
  rehearsal,
  showStatus,
  attendeeLimit
) {
  console.log("attendeeLimit =>", attendeeLimit);
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
        templateId: fallbackTemplateId
      },
      null
    );
  }
  if (shouldShowStatus(showStatus)) {
    if (rehearsal != "true") {
      console.log("Show Status Here => ", showStatus);
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
  //   console.log("Fallback Here => ", true, { templateId: fallbackTemplateId }, null, "Event");
  //   if (attendeeLimit.limit > 0) {
  //     const hasReachedLimit = await checkAttendeeVeiwingLimit(attendeeLimit.eventId, attendeeLimit.limit);
  //     console.log("hasReachedLimit => ", hasReachedLimit);
  //     if (hasReachedLimit) {
  //       return new PathResolutionResult(
  //         true,
  //         {
  //           templateId: attendeeLimit.templateId
  //         },
  //         null
  //       );
  //     }
  //   }
  return new PathResolutionResult(
    true,
    {
      templateId: fallbackTemplateId
    },
    null,
    "Event"
  );
}

async function checkAttendeeVeiwingLimit(eventId, limit) {
  const currentLiveCount = await CacheFacade.getLiveViewerCount(eventId);
  if (currentLiveCount > limit) {
    return true;
  }
  return false;
}
