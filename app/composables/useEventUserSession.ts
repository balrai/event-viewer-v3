export function useEventUserSession() {
  const route = useRoute();
  const eventCode = computed(() => route.params.eventCode as string);
  console.log("Using event user session for event code:", eventCode.value);

  const user = useState<any>(
    `event-user-session-${eventCode.value}`,
    () => null
  );
  const loggedIn = computed(() => !!user.value);

  async function fetch() {
    if (!eventCode.value) return;
    try {
      const data = await $fetch<{ user: any; loggedIn: boolean }>(
        `/${eventCode.value}/auth/session`
      );
      user.value = data.user ?? null;
    } catch {
      user.value = null;
    }
  }

  return { user, loggedIn, fetch };
}
