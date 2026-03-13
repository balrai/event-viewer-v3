import HttpClient from "./HttpClient";

type NovaViewerType = {
  [namespace: string]: any;
};
type EventType = {
  eventId: string;
  locales: string[];
  [key: string]: any;
};

interface Window {
  NovaViewer?: NovaViewerType;
}

export default class ViewerAPI {
  private static _instance: ViewerAPI | null = null;
  eventId: string;
  sessionId: string;
  accessToken: string;
  accessTokenExpiry: number | null = null;
  event: EventType;
  session: any;
  user: any;
  isLoggedIn: boolean;
  rehearsal: boolean;
  client: HttpClient;
  account: any;
  langCodeCookieName = "nova.locale";
  constructor(
    accessToken: string = "",
    eventId: string = "",
    sessionId: string = "",
    rehearsal: boolean = false
  ) {
    this.eventId = eventId;
    this.sessionId = sessionId;
    this.accessToken = accessToken;
    this.rehearsal = rehearsal;
    const viewerStore = useViewerStore();
    const { event } = storeToRefs(viewerStore);
    this.event = event.value as unknown as EventType;
    const { loggedIn, user, session } = useUserSession();
    this.user = user.value;
    this.session = session.value;
    this.isLoggedIn = loggedIn.value;
    this.setupExternalInterface();
    this.client = new HttpClient();
  }

  get isReady() {
    if (!this.accessToken) return false;
    if (!this.eventId) return false;
    return true;
  }

  get initParams() {
    return (
      (window as any)._NovaViewerParams ||
      Object.fromEntries(new URLSearchParams(location.search)) ||
      {}
    );
  }

  get callerURL() {
    return this.initParams.callerURL || null;
  }

  get languages() {
    return this.event?.locales || [];
  }

  setupExternalInterface() {
    const self = this;

    this.registerExternalInterface(null, {
      onReady(func = null) {
        return self.onViewerReady(func);
      }
    });
    this.init();
  }
  init() {
    window.dispatchEvent(new CustomEvent("nova.viewer.api.ready"));
  }
  onViewerReady(func: ((ready: boolean) => void) | null = null) {
    const self = this;
    return new Promise((resolve: (value: boolean) => void) => {
      let resolved = false;
      const resolveNow = (ready: boolean) => {
        clearTimeout(timeout);
        clearInterval(interval);
        if (!resolved) {
          resolved = true;
          resolve(!!ready);
          if (func) func(!!ready);
        }
      };
      let timeout = setTimeout(() => {
        resolveNow(false);
      }, 1000);
      let interval = setInterval(() => {
        if (this.isReady) {
          resolveNow(true);
        }
      }, 50);
    });
  }

  registerExternalInterface(
    namespace: string | null,
    interfaces: Record<string, any>
  ) {
    if (!window) return;
    window.NovaViewer = window.NovaViewer || ({} as NovaViewerType);
    if (namespace) {
      console.log("Nmspace", namespace, "Interfaces:", interfaces);
      (window.NovaViewer as NovaViewerType)[namespace] =
        (window.NovaViewer as NovaViewerType)[namespace] || {};
      Object.assign(
        (window.NovaViewer as NovaViewerType)[namespace],
        interfaces
      );
    } else {
      Object.assign(window.NovaViewer, interfaces);
    }
  }

  // ------ Authentication Methods -----
  async register(values: Record<string, any>, lang: string | null = null) {
    console.log("locale => ", lang);
    console.log("languages => ", this.languages);
    if (lang) {
      if (!this.languages.includes(lang)) {
        return new Error("Language not supported");
      }
      cookieStore.set(this.langCodeCookieName, lang);
    }
    return await this.client.register(this.eventId, {
      ...values,
      locale: lang
    });
  }

  registrationInfo() {
    if (this.event?.registration) {
      return this.event.registration;
    }
  }

  async login(
    username: string,
    password: string,
    langCode: string | null = null,
    redirectUrl: string | boolean | null = null
  ) {
    try {
      const res = (await this.client.login(
        this.event?.eventCode,
        this.eventId,
        username,
        password
      )) as unknown as { accessToken: string; expireAt: number };
      this.accessToken = res.accessToken;
      this.accessTokenExpiry = res.expireAt;
      const next = () => {
        if (redirectUrl === false) return;
        if (typeof redirectUrl === "string") {
          window.location.href = redirectUrl;
          return;
        }
        if (this.callerURL) {
          console.log("Redirecting to caller URL:", this.callerURL);
          window.location.href = this.callerURL;
          return;
        }
        window.location.reload();
      };
      if (langCode) {
        try {
          await this.updateLanguage(langCode);
        } catch (err) {
          console.error("Error updating language after login:", err);
        }
      }
      next();
      return res;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async logout(redirectUrl: string | null = null) {
    try {
      const response = await this.client.logout(this.event.eventCode);
      console.log("Logout response:", response);
      return this.setViewerLocation(redirectUrl);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  async forgotPassword(identifier: string) {
    try {
      const response = await this.client.forgotPassword(
        this.eventId,
        identifier
      );
      return response;
    } catch (error) {
      console.error("Forgot password error:", error);
      throw error;
    }
  }

  async resetPassword(newPassword: string, resetToken: string | null = null) {
    try {
      const response = await this.client.resetPassword(
        resetToken || this.initParams.secret,
        newPassword
      );
      return response;
    } catch (error) {
      console.error("Reset password error:", error);
      throw error;
    }
  }
  // ------ End of Authentication Methods -----

  // ------ User Methods -----
  async getUserProfile() {
    try {
      const account: any = await this.getUserAccount();
      const profile = account?.info;
      return profile;
    } catch (error) {
      console.error("Get user profile error:", error);
      throw error;
    }
  }

  async getUserAccount() {
    if (this.account) Promise.resolve(this.account);
    try {
      const result = await this.client.getUserAccount(this.accessToken);
      this.account = result;
      return result;
    } catch (error) {
      console.error("Error fetching user account:", error);
      throw error;
    }
  }

  async updateLanguage(langCode: string) {
    if (this.languages.includes(langCode)) {
      cookieStore.set(this.langCodeCookieName, langCode);
      if (this.isLoggedIn) {
        await this.client.updateLocale(
          this.accessToken,
          langCode,
          this.rehearsal
        );
        this.account = null;
        return Promise.resolve();
      } else {
        return Promise.resolve();
      }
    }
  }

  async updateUserProfile(data: any) {
    const account = await this.client.updateUserProfile(this.accessToken, data);
    this.account = account;
    return this.account.info;
  }

  async getUserGroups(locale: string | null = null) {
    try {
      const userGroups = await this.client.getUserGroups(
        this.eventId,
        locale || (await this.getCurrentLanguage())
      );
      return userGroups;
    } catch (error) {
      console.error("Error fetching user groups:", error);
      throw error;
    }
  }

  async getUserGroupsLimit() {
    try {
      const result = await this.client.getUserGroupsLimit(this.eventId);
      return result;
    } catch (error) {
      console.error("Error fetching user groups limit:", error);
      throw error;
    }
  }
  // ------ End of User Methods -----

  getLanguages() {
    return this.languages;
  }

  async getCurrentLanguage() {
    let locale = null;
    let url = new URL(location.toString());
    if (url && url.searchParams && url.searchParams.has("locale")) {
      locale = url.searchParams.get("locale");
    }
    if (!locale && this.account && this.account.locale)
      locale = this.account.locale;
    if (!locale) {
      const cookie = await cookieStore.get(this.langCodeCookieName);
      locale = cookie?.value;
    }
    if (!locale && this.languages && this.languages.length > 0)
      locale = this.languages[0];
    return locale;
  }

  setViewerLocation(url: string | null = null) {
    setTimeout(
      (url) => {
        if (url) {
          location.href = url;
        } else if (window && window.NovaViewer && window.NovaViewer.reload) {
          window.NovaViewer.reload();
        } else {
          location.reload();
        }
      },
      100,
      url
    );
  }

  static singleton() {
    if (!ViewerAPI._instance) {
      const { user } = storeToRefs(useAuthStore());
      const viewerStore = useViewerStore();
      const {
        event,
        session
      }: {
        event: Ref<{ eventId?: string } | null>;
        session: Ref<{ sessionId?: string } | null>;
      } = storeToRefs(viewerStore);
      ViewerAPI._instance = new ViewerAPI(
        user.value?.accessToken,
        event.value?.eventId,
        session.value?.sessionId
      );
    }
    return ViewerAPI._instance;
  }

  static boot() {
    return ViewerAPI.singleton();
  }
}
