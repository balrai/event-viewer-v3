export function useAPI() {
  async function getRealtimeSubscribeToken(
    instanceId: string,
    locale: string | null = null
  ) {
    const response = await fetch(
      `/api/ivs/subscribe-token?instanceId=${instanceId}&locale=${locale || ""}`
    );
    if (!response.ok) {
      throw new Error(`Failed to get subscribe token: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("Received subscribe token:", data);
    return data.token;
  }

  return {
    getRealtimeSubscribeToken
  };
}
