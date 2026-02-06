import {
  viewerStorage,
  rehearsalViewerStorage
} from "~~/server/lib/nwv2-api-lib/src/storage/viewer-storage";

export default defineEventHandler(async (event) => {
  try {
    const session = await requireUserSession(event);
    const { userId } = session.user as { userId: string };
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
    await setUserSession(event, {
      ...session,
      user: {
        ...session.user,
        locale: user.locale
      }
    });
    setCookie(event, "nova.locale", user.locale || "en-US", {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365
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
