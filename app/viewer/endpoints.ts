export const AccountApi = Object.freeze({
  GetAccount: "viewer-auth/account",
  UpdateInfo: "viewer-auth/info",
  UpdateLocale: "viewer-auth/locale",
  GetCountryCode: "viewer-auth/country-code"
});

export const AuthApi = Object.freeze({
  Login: "viewer-auth/login",
  Logout: "viewer-auth/logout",
  Register: "viewer-auth/users",
  ForgotPassword: "viewer-auth/password-reset-trigger",
  ResetPassword: "viewer-auth/password-reset"
});

export const ViewerApi = Object.freeze({
  getEventStatus: (eventId: string) => `viewer-event/${eventId}/event-status`,
  getOnSiteSettings: (eventId: string) =>
    `viewer-event/${eventId}/event-onsite`,
  getELearningSettings: (eventId: string) =>
    `viewer-elearning/${eventId}/event-elearning`,
  getCourseSessions: (eventId: string) =>
    `viewer-elearning/events/${eventId}/sessions`,
  getSessionStatus: (eventId: string, sessionId: string) =>
    `viewer-event/${eventId}/session-status/${sessionId}`,
  GetExtSettings: (eventId: string, extensionType: string) =>
    `viewer-event/events/${eventId}/extensions/settings/${extensionType}`, // by eventId
  GetExtInstance: (eventId: string, sessionId: string, instanceId: string) =>
    `viewer-event/events/${eventId}/sessions/${sessionId}/extensions/instances/${instanceId}`, // by eventId, sessionId, instanceId
  GetExtCompressedInstance: (eventId: string, sessionId: string) =>
    `viewer-event/events/${eventId}/sessions/${sessionId}/files/compressed/slides`,
  GetLiveState: (eventId: string, sessionId: string) =>
    `viewer-event/events/${eventId}/sessions/${sessionId}/live-states/current`, // by eventId, sessionId
  GetSessions: (eventId: string) => `viewer-event/events/${eventId}/sessions`, // by eventId
  GetTracks: (eventId: string) => `viewer-event/events/${eventId}/tracks`, // by eventId
  GetUserGroups: (eventId: string) =>
    `viewer-event/events/${eventId}/usergroups`, // by eventId
  GetUserGroupsLimit: (eventId: string) =>
    `viewer-event/events/${eventId}/usergroups-limit`,
  UploadImage: (eventId: string) =>
    `social-network/viewer/event/${eventId}/uploadImage`,
  DeleteImage: (eventId: string) =>
    `social-network/viewer/event/${eventId}/deleteImage`,
  ListImages: (eventId: string) =>
    `social-network/viewer/event/${eventId}/listImages`,
  Gallery: (eventId: string) =>
    `social-network/viewer/event/${eventId}/gallery`,
  UpdateImageStatus: (eventId: string) =>
    `social-network/viewer/event/${eventId}/updateStatus`,
  compressImage: "social-network/viewer/event/compressImage",
  GetStreamViewInfo: (eventId: string, sessionId: string, instanceId: string) =>
    `/viewer-elearn/events/${eventId}/session/${sessionId}/instance/${instanceId}/view-info`,
  UpdateStreamViewInfo: (
    eventId: string,
    sessionId: string,
    instanceId: string
  ) =>
    `/viewer-elearn/events/${eventId}/session/${sessionId}/instance/${instanceId}/view-info`,
  getUserCourseCompletion: (eventId: string, sessionId: string) =>
    `/viewer-elearning/events/${eventId}/session/${sessionId}/user-course-completion`,
  getCourseQuiz: (eventId: string, sessionId: string) =>
    `/viewer-elearning/events/${eventId}/session/${sessionId}/list-course-quiz`,
  getUserQuizData: (eventId: string, sessionId: string, instanceId: string) =>
    `viewer-elearning/events/${eventId}/sessions/${sessionId}/extensions/instances/${instanceId}/user-submission`,
  checkCertificateEligibility: (eventId: string, sessionId: string) =>
    `/viewer-elearning/events/${eventId}/session/${sessionId}/check-certificate-eligibility`,
  getCertificateIssuingDetails: (eventId: string, sessionId: string) =>
    `/viewer-elearning/events/${eventId}/session/${sessionId}/get-certificate-issuing-details`,
  issueCertificate: (eventId: string, sessionId: string) =>
    `/viewer-elearning/events/${eventId}/session/${sessionId}/issue-certificate`,
  qrCodeEventCheckIn: (eventId: string) =>
    `admin/events/${eventId}/qrEventAttendence`,
  checkCertificateValidation: (eventId: string) =>
    `/viewer-elearning/events/${eventId}/certificate/validate`
});
