import auth from "~/plugins/auth";
import { AccountApi, AuthApi, ViewerApi } from "./endpoints";

export default class HttpClient {
  baseURL: string;
  constructor() {
    const runtimeConfig = useRuntimeConfig();
    this.baseURL = runtimeConfig.public.apiEndpoint || "";
  }

  // ------ Authentication APIs ------
  register = async (eventId: string, data: Record<string, any>) => {
    try {
      const response = await $fetch(`${this.baseURL}/${AuthApi.Register}`, {
        method: "POST",
        body: {
          eventId,
          ...data
        }
      });
      return response;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  login = async (
    eventCode: string,
    eventId: string,
    identifier: string,
    password: string
  ) => {
    try {
      const response = await $fetch(`/${eventCode}/auth/login`, {
        method: "POST",
        body: {
          eventId,
          identifier,
          password
        }
      });
      return response;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  logout = async (eventCode: string) => {
    const authStore = useAuthStore();
    const { user } = authStore;
    try {
      await $fetch(`/${eventCode}/auth/logout`, {
        method: "POST",
        body: {
          eventCode,
          userId: user.userId
        }
      });
      authStore.setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  forgotPassword = async (eventId: string, identifier: string) => {
    return await $fetch(`${this.baseURL}/${AuthApi.ForgotPassword}`, {
      method: "POST",
      body: {
        eventId,
        identifier
      }
    });
  };
  resetPassword = async (secret: string, password: string) => {
    return await $fetch(`${this.baseURL}/${AuthApi.ResetPassword}`, {
      method: "POST",
      body: {
        secret,
        password
      }
    });
  };
  // ------ End of Authentication APIs ------

  // ------ User APIs ------
  updateUserProfile = async (accessToken: string, data: any) => {
    const result = await $fetch(`${this.baseURL}/${AccountApi.UpdateInfo}`, {
      method: "POST",
      body: data,
      headers: {
        Authorization: accessToken
      }
    });
    return result;
  };

  getUserGroups = (eventId: string, locale: string) => {
    return $fetch(`${this.baseURL}/${ViewerApi.GetUserGroups(eventId)}`, {
      method: "GET",
      params: {
        locale
      }
    });
  };

  getUserGroupsLimit = (eventId: string) => {
    return $fetch(`${this.baseURL}/${ViewerApi.GetUserGroupsLimit(eventId)}`, {
      method: "GET"
    });
  };

  // ------ End of User APIs -----

  updateLocale = async (
    accessToken: string,
    locale: string,
    rehearsal: boolean
  ) => {
    const result = await $fetch(`${this.baseURL}/${AccountApi.UpdateLocale}`, {
      method: "POST",
      body: {
        locale
      },
      params: {
        rehearsal
      },
      headers: {
        Authorization: accessToken
      }
    });
    console.log("Locale update result:", result);
    return result;
  };

  getUserAccount = async (accessToken: string) => {
    try {
      const result = await $fetch(`${this.baseURL}/${AccountApi.GetAccount}`, {
        method: "GET",
        headers: {
          Authorization: accessToken
        }
      });
      return result;
    } catch (error) {
      console.error("Error fetching user account:", error);
      throw error;
    }
  };
}
