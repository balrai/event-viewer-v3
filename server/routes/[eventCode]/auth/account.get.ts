import {
  viewerStorage,
  rehearsalViewerStorage
} from "~~/server/lib/nwv2-api-lib/src/storage/viewer-storage";
import {
  requireEventUserSession,
  setEventUserSession
} from "~~/server/utils/event-session";

export default defineEventHandler(async (event) => {
  try {
    const session = await requireEventUserSession(event);
    const { userId } = session.user as { userId: string };
    if (!userId) {
      return createError({
        statusCode: 401,
        statusMessage: "Unauthorized"
      });
    }
    const query = getQuery(event);
    const rehearsal = query.rehearsal === "true";

    let user;
    if (rehearsal) {
      user = await rehearsalViewerStorage.getProfile(userId);
      if (!user) {
        return createError({
          statusCode: 404,
          statusMessage: "User not found"
        });
      }
    } else {
      user = await viewerStorage.getProfile(userId);
      if (!user) {
        return createError({
          statusCode: 404,
          statusMessage: "User not found"
        });
      }
    }
    await setEventUserSession(event, {
      ...session,
      user: {
        ...session.user,
        locale: user.locale
      }
    });

    return user;
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: e
    });
  }
});
