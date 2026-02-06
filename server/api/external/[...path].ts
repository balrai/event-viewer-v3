import ExternalApiHandler, {
  type HttpMethod
} from "../../lib/ExternalApiHandler";

export default defineEventHandler(async (event) => {
  try {
    const {
      secure: { accessToken }
    } = (await getUserSession(event)) as { secure: { accessToken?: string } };
    console.log("external api handler called");
    const path = event.context.params?.path;
    const query = getQuery(event);
    const method = event.node.req.method || "GET";

    const externalApiHandler = new ExternalApiHandler();
    const result = await externalApiHandler.handle(
      event,
      path as string,
      method as HttpMethod,
      query,
      accessToken
    );
    return result;
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: e
    });
  }
});
