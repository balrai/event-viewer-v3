declare global {
  interface Window {
    NovaViewer?: {
      reload?: () => void;
    };
  }
}

export const useAuthStore = defineStore("auth", () => {
  const user = useState("user", () => null as any);

  function setUser(value: any) {
    user.value = value;
  }

  return {
    user,
    setUser
  };
});
