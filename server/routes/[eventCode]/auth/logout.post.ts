import { clear } from "console";
import { viewerSessionStorage } from "~~/server/lib/nwv2-api-lib/src/storage/session-storage";
import {
  clearEventUserSession,
  getEventUserSession
} from "~~/server/utils/event-session";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const session = await getEventUserSession(event);
    const { userId } = session.user as { userId: string };
    console.log("Logging out user:", userId);

    if (userId) {
      try {
        viewerSessionStorage.invalidateUserSessions(userId);
      } catch (e) {
        console.error("Error invalidating user sessions:", e);
      }
    }
    try {
      await clearEventUserSession(event);
    } catch (e) {
      console.error("Error clearing user session:", e);
    }
    return { success: true };
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: e
    });
  }
});
