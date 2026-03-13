import { eventStorage } from "~~/server/lib/nwv2-api-lib/src/storage/event-storage";
import { IdPwAuth } from "~~/server/lib/nwv2-api-lib/src/event-auth/authentication-handlers-impl/id-pw-auth";
import { AuthPreset } from "~~/server/lib/nwv2-api-lib/src/event-auth/auth-presets";
import { IdPasscodeAuth } from "~~/server/lib/nwv2-api-lib/src/event-auth/authentication-handlers-impl/id-passcode-auth";
import AnalyticsFacade from "~~/server/lib/nwv2-api-lib/src/facades/analytics-facade";
import { validateEmail } from "~~/server/lib/nwv2-api-lib/src/util/string-lib";
import { PasscodeOnlyAuth } from "~~/server/lib/nwv2-api-lib/src/event-auth/authentication-handlers-impl/passcode-only-auth";
import { access } from "fs";
import { setEventUserSession } from "~~/server/utils/event-session";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const body = await readBody(event);
    let { eventId, identifier, password } = body;
    if (!eventId) {
      return createError({
        statusCode: 400,
        statusMessage: "Missing required parameter"
      });
    }
    const eventProfile = await eventStorage.getProfile(eventId);
    if (!eventProfile) {
      return createError({
        statusCode: 404,
        statusMessage: "Event not found"
      });
    }
    const { authPreset, eventCode, registration, onSite } = eventProfile;

    switch (authPreset) {
      case AuthPreset.PUBLIC:
        return createError({
          statusCode: 403,
          statusMessage: "Authentication disallowed"
        });
    }

    if (validateEmail(identifier)) {
      identifier = identifier.toLowerCase();
    }

    const stage = config.public.stage;

    const authHandler = new IdPwAuth()
      .setNext(new IdPasscodeAuth())
      .setNext(new PasscodeOnlyAuth());
    const authResult = await authHandler.handle(
      eventProfile,
      registration,
      authPreset,
      {
        identifier,
        password
      },
      stage
    );

    if (!authResult.success) {
      return createError({
        statusCode: 401,
        statusMessage: "Authentication failed"
      });
    } else {
      await AnalyticsFacade.recordLoginEvent(
        event,
        eventId,
        identifier,
        onSite,
        "Online Check-In"
      );
      console.log("Authresult:", authResult.data);
      try {
        await setEventUserSession(event, {
          user: {
            userId: authResult.data.userId,
            accessToken: authResult.data.token,
            accessTokenExp: authResult.data.expireAt,
            eventId,
            eventCode
          },
          secure: {
            accessToken: authResult.data.token,
            accessTokenExp: authResult.data.expireAt
          }
        });
      } catch (e) {
        console.log("Error setting user session:", e);
      }
      return authResult.data;
    }
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: e
    });
  }
});
