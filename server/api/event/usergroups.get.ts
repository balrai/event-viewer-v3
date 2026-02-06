import { eventStorage } from "~~/server/lib/nwv2-api-lib/src/storage/event-storage";
import { ErrorResponse } from "~~/server/lib/nwv2-api-lib/src/enums/enums";
import EventFacade from "~~/server/lib/nwv2-api-lib/src/facades/event-facade";
import Localization from "~~/server/lib/nwv2-api-lib/src/facades/localization";

export default defineEventHandler(async (event) => {
  try {
    const { eventId } = await requireUserSession(event);
    const query = getQuery(event);
    const eventProfile = await eventStorage.getProfile(eventId);
    if (!eventProfile) {
      return createError({
        statusCode: 404,
        statusMessage: "Event not found"
      });
    }
    // if (!locale) {
    //   locale = await EventFacade.getEventDefaultLocale(eventId);
    // }

    const usergroups = await eventStorage.getUserGroups(eventId);

    // const localizedTracks = await Promise.all(
    //   usergroups
    //     .filter((usg) => usg.show)
    //     .map(async (t) => {
    //       const { userGroupId } = t;
    //       const loc = await eventStorage.getLocalization(eventId, "UserGroup", userGroupId, locale);
    //       return Localization.localizeObject(t, loc?.content);
    //     })
    // );

    return usergroups;
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: e
    });
  }
});
