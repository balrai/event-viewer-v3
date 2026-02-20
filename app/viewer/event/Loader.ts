// import axios from "axios";
import ExtensionLoader from "@/lib/nwv2-client-lib/classes/Viewer/Extension/Loader";

export default class EventLoader extends ExtensionLoader {
  constructor() {
    super("Event", true);
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
        const authStore = useAuthStore();
        return authStore.logout(redirectUrl);
        // return self.api.logout(redirectUrl);
      },
      forgotPassword(identifier: string) {
        return self.api.forgotPassword(identifier);
      },
      resetPassword(newPassword: string, resetToken: string | null = null) {
        return self.api.resetPassword(newPassword, resetToken);
      }
    });

    this.api.registerExternalInterface("Registry", {
      register(values: any, langCode: string | null = null) {
        return self.api.register(values, langCode);
      },
      getSettings() {
        console.log("Getting event settings", self.api.event);
        return Promise.any([
          self.api.registerInfo(),
          self.api.event.registration.formFields,
          Promise.reject("Event information not available")
        ]);
      }
    });

    this.api.registerExternalInterface("User", {
      changeLanguageWithoutReload(langCode: string) {
        return self.api
          .updateLanguage(langCode)
          .catch((err: any) =>
            console.log("Error changing language without reload:", err)
          );
      },
      changeLanguage(langCode: string) {
        console.log("Changing language to:", langCode);
        console.log("self:", self);
        return self.api
          .updateLanguage(langCode)
          .then(() => {
            self.api.setViewerLocation();
          })
          .catch((err: any) => console.log("Error changing language:", err));
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
      },
      getSessions(filters: any = {}) {
        return self.api.getMySessions(filters);
      },
      getOnSiteSettings() {
        return self.api.getOnSiteSettings();
      },
      getELearningSettings() {
        return self.api.getELearningSettings();
      },
      getUserCourseCompletion(sessionId: string) {
        return self.api.getUserCourseCompletion(sessionId);
      },
      getStreamViewInfo() {
        return self.api.getStreamViewInfo();
      },
      getUserQuizData(sessionId: string, instanceId: string) {
        return self.api.getUserQuizData(sessionId, instanceId);
      },
      checkCertificateEligibility(sessionId: string) {
        return self.api.checkCertificateEligibility(sessionId);
      },
      getCertificateIssuingDetails(sessionId: string) {
        return self.api.getCertificateIssuingDetails(sessionId);
      },
      issueCertificate(sessionId: string, data: any) {
        return self.api.issueCertificate(sessionId, data);
      }
    });
    this.api.registerExternalInterface("Event", {
      getCourseQuiz(sessionId: string) {
        return self.api.getCourseQuiz(sessionId);
      },
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

      getSessions(filters: any = {}) {
        console.log("GET SESSIONS", self.api.getSessions(filters));
        return self.api.getSessions(filters);
      },
      getCourseSessions(filters: any = {}) {
        return self.api.getCourseSessions(filters);
      },
      getCurrentSession() {
        return self.api.getCurrentSession();
      },
      getTracks() {
        return self.api.getTracks();
      },
      getUserGroups() {
        return self.api.getUserGroups();
      },
      getUserGroupsLimit() {
        return self.api.getUserGroupsLimit();
      },
      gallery() {
        return self.api.gallery();
      },
      compressImage(data: any) {
        return self.api.compressImage(data);
      },
      uploadImage(data: any, file: any) {
        if (data.fileCategory == undefined) {
          data.fileCategory = "user";
        }
        if (data.isPublic == undefined) {
          data.isPublic = false;
        }
        return self.api.uploadImage(data).then((res: any) => {
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
        });
      },
      listAllImages() {
        return self.api.listAllImages();
      },
      approveImage(fileId: string) {
        return self.api.updateImageStatus({ fileId, status: "approved" });
      },
      rejectImage(fileId: string) {
        return self.api.updateImageStatus({ fileId, status: "rejected" });
      },
      deleteImage(data: any) {
        return self.api.deleteImage(data);
      }
    });
  }

  override commandHandler(data: any) {
    super.commandHandler(data);
    switch (data.command) {
      case "reload":
        window.location.reload();
        break;
      case "session.ended":
        this.dispatchExtensionEvent("nova.event.session.ended", {
          sessionId: data.sessionId
        });
        break;
      case "session.started":
        this.dispatchExtensionEvent("nova.event.session.started", {
          sessionId: data.sessionId
        });
        break;
      case "session.updated":
        this.dispatchExtensionEvent("nova.event.session.updated", {
          sessionId: data.sessionId
        });
        break;
    }
  }
}
