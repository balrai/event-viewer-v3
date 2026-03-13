import { getEventUserSession } from "~~/server/utils/event-session";

export default defineEventHandler(async (event) => {
  try {
    const session = await getEventUserSession(event);
    return {
      user: session?.user ?? null,
      loggedIn: !!session?.user
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: error
    });
  }
});
