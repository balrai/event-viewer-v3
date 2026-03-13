// import axios from "axios";
import ViewerAPI from "../ViewerApi";

export default class EventLoader {
  api: ViewerAPI;
  constructor() {
    this.api = ViewerAPI.singleton();
    this.setupExternalInterface();
  }

  setupExternalInterface() {
    const self = this;

    this.api.registerExternalInterface("Auth", {
      login(
        username: string,
        password: string,
        langCode: string | null = null,
        redirectUrl: string | null = null
      ) {
        return self.api.login(username, password, langCode, redirectUrl);
      },
      logout(redirectUrl: string | null = null) {
        return self.api.logout(redirectUrl);
      },
      forgotPassword(identifier: string) {
        return self.api.forgotPassword(identifier);
      },
      resetPassword(newPassword: string, resetToken: string | null = null) {
        return self.api.resetPassword(newPassword, resetToken);
      }
    });

    this.api.registerExternalInterface("Registry", {
      async register(values: any, langCode: string | null = null) {
        console.log("langCode in registry => ", langCode);
        return await self.api.register(values, langCode);
      },
      async getSettings() {
        console.log("Getting event settings", self.api.event);
        return await self.api.registrationInfo();
      }
    });

    this.api.registerExternalInterface("User", {
      async changeLanguageWithoutReload(langCode: string) {
        try {
          return await self.api.updateLanguage(langCode);
        } catch (err) {
          return console.log("Error changing language without reload:", err);
        }
      },
      async changeLanguage(langCode: string) {
        console.log("Changing language to:", langCode);
        console.log("self:", self);
        try {
          await self.api.updateLanguage(langCode);
          self.api.setViewerLocation();
        } catch (err) {
          return console.log("Error changing language:", err);
        }
      },
      getCurrentLanguage() {
        return self.api.getCurrentLanguage();
      },
      getAccount() {
        return self.api.getUserAccount();
      },
      getProfile() {
        return self.api.getUserProfile();
      },
      updateProfile(data: any) {
        return self.api.updateUserProfile(data);
      }
      //   getSessions(filters: any = {}) {
      //     return self.api.getMySessions(filters);
      //   },
      //   getOnSiteSettings() {
      //     return self.api.getOnSiteSettings();
      //   },
      //   getELearningSettings() {
      //     return self.api.getELearningSettings();
      //   },
      //   getUserCourseCompletion(sessionId: string) {
      //     return self.api.getUserCourseCompletion(sessionId);
      //   },
      //   getStreamViewInfo() {
      //     return self.api.getStreamViewInfo();
      //   },
      //   getUserQuizData(sessionId: string, instanceId: string) {
      //     return self.api.getUserQuizData(sessionId, instanceId);
      //   },
      //   checkCertificateEligibility(sessionId: string) {
      //     return self.api.checkCertificateEligibility(sessionId);
      //   },
      //   getCertificateIssuingDetails(sessionId: string) {
      //     return self.api.getCertificateIssuingDetails(sessionId);
      //   },
      //   issueCertificate(sessionId: string, data: any) {
      //     return self.api.issueCertificate(sessionId, data);
      //   }
    });
    this.api.registerExternalInterface("Event", {
      // getCourseQuiz(sessionId: string) {
      //   return self.api.getCourseQuiz(sessionId);
      // },
      getLanguages() {
        return new Promise((resolve) => {
          const waitInterval = setInterval(() => {
            const languages = self.api.getLanguages();
            if (languages && languages.length > 0) {
              clearInterval(waitInterval);
              resolve(languages);
            }
          }, 50);
        });
      },

      //   getSessions(filters: any = {}) {
      //     console.log("GET SESSIONS", self.api.getSessions(filters));
      //     return self.api.getSessions(filters);
      //   },
      //   getCourseSessions(filters: any = {}) {
      //     return self.api.getCourseSessions(filters);
      //   },
      //   getCurrentSession() {
      //     return self.api.getCurrentSession();
      //   },
      //   getTracks() {
      //     return self.api.getTracks();
      //   },
      getUserGroups() {
        return self.api.getUserGroups();
      },
      getUserGroupsLimit() {
        return self.api.getUserGroupsLimit();
      }
      //   gallery() {
      //     return self.api.gallery();
      //   },
      //   compressImage(data: any) {
      //     return self.api.compressImage(data);
      //   },
      //   uploadImage(data: any, file: any) {
      //     if (data.fileCategory == undefined) {
      //       data.fileCategory = "user";
      //     }
      //     if (data.isPublic == undefined) {
      //       data.isPublic = false;
      //     }
      //     return self.api.uploadImage(data).then((res: any) => {
      // return axios
      //   .put(res.uploadUrl, file, {
      //     headers: {
      //       "Content-Type": file.type
      //     }
      //   })
      //   .then(() => res)
      //   .catch((err: any) => {
      //     console.error(err);
      //   });
      //     });
      //   },
      //   listAllImages() {
      //   },
      //   approveImage(fileId: string) {
      //   },
      //   rejectImage(fileId: string) {
      //   },
      //   deleteImage(data: any) {
      //   }
    });
  }

  commandHandler(data: any) {
    switch (data.command) {
      case "reload":
        window.location.reload();
        break;
      case "session.ended":
        break;
      case "session.started":
        break;
      case "session.updated":
        break;
    }
  }
}
