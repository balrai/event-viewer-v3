import { clear } from "console";
import { viewerSessionStorage } from "~~/server/lib/nwv2-api-lib/src/storage/session-storage";

export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event);
    const { userId } = session.user as { userId: string };
    if (userId) {
      viewerSessionStorage.invalidateUserSessions(userId);
    }
    await clearUserSession(event);
    return { success: true };
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: e
    });
  }
});
