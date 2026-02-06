import {
  viewerSessionStorage,
  rehearsalViewerSessionStorage
} from "~~/server/lib/nwv2-api-lib/src/storage/session-storage";
import ViewerFacade from "~~/server/lib/nwv2-api-lib/src/facades/viewer-facade";
import {
  viewerStorage,
  rehearsalViewerStorage
} from "~~/server/lib/nwv2-api-lib/src/storage/viewer-storage";

export async function tryGetUserProfileWithToken(accessToken, rehearsal) {
  if (accessToken) {
    // console.log("tryGetUserProfileWithToken =>", accessToken, rehearsal, typeof rehearsal);
    let userSession;
    if (rehearsal == "true") {
      userSession =
        await rehearsalViewerSessionStorage.tryGetSession(accessToken);
    } else {
      userSession = await viewerSessionStorage.tryGetSession(accessToken);
    }
    // console.log("userSession =>", userSession);
    if (userSession) {
      if (ViewerFacade.validateSession(userSession)) {
        const { userId } = userSession;
        if (rehearsal == "true") {
          return await rehearsalViewerStorage.getProfile(userId);
        }
        return await viewerStorage.getProfile(userId);
      }
    }
  }
}
