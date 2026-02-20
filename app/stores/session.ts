interface Session {
  extensions: string[];
  status: string;
  enabled: boolean;
  sessionType: string;
  endAt: number;
  userGroups: string[];
  name: string;
  sessionId: string;
}

export const useSessionStore = defineStore("session", () => {
  const session = useState<Session | null>("session", () => null);

  function setSession(value: Session | null) {
    session.value = value;
  }

  return {
    session,
    setSession
  };
});
