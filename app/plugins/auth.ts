// plugins/auth.ts
import { useAuthStore } from "~/stores/auth";

export default defineNuxtPlugin(async () => {
  const { user, loggedIn, fetch } = useUserSession();
  const authStore = useAuthStore();

  // 1. Fetch current session (works on both SSR and Client)
  // This calls the internal /api/_auth/session endpoint
  await fetch();

  // 2. If user exists, sync it to Pinia
  if (loggedIn.value && user.value) {
    authStore.setUser(user.value);
  }
});
