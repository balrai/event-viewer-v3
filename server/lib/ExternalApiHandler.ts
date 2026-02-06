export type HttpMethod =
  | "GET"
  | "HEAD"
  | "PATCH"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "get"
  | "head"
  | "patch"
  | "post"
  | "put"
  | "delete"
  | "connect"
  | "options"
  | "trace";

export class ExternalApiHandler {
  async handle(
    event: any,
    path: string,
    method: HttpMethod,
    query: any,
    accessToken?: string
  ) {
    const config = useRuntimeConfig();
    const baseUrl = config.public.apiEndpoint || "https://dev-api.novaweb.live";
    const url = `${baseUrl}/${Array.isArray(path) ? path.join("/") : path}`;
    console.log("url:", url, method, query, accessToken);
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = accessToken;
    }

    const normalizedMethod = method.toString().toUpperCase() as HttpMethod;

    const response = await $fetch(url, {
      method: normalizedMethod,
      headers,
      params: query,
      body: ["POST", "PUT", "PATCH"].includes(normalizedMethod)
        ? await readBody(event)
        : undefined
    });
    console.log("external api response:", response);
    return response;
  }
}

export default ExternalApiHandler;
