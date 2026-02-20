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

  function logout(redirectUrl: string | null = null) {
    user.value = null;
    $fetch("/api/auth/logout", {
      method: "POST"
    })
      .then(() => {
        setViewerLocation((redirectUrl = null));
      })
      .catch((error) => {
        console.error("Error during logout:", error);
      });
  }

  function setViewerLocation(url = null) {
    setTimeout(
      (url) => {
        if (url) {
          if (window.top) {
            window.top.location = url;
          }
        } else if (window && window.NovaViewer && window.NovaViewer.reload) {
          window.NovaViewer.reload();
        } else if (top) {
          top.location.reload();
        }
      },
      100,
      url
    );
  }

  return {
    user,
    setUser,
    logout
  };
});
