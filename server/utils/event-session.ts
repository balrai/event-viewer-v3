import { useSession } from "h3";

function getEventCode(event: any): string {
  return (
    event.context.params?.eventCode ||
    (event.path || "").split("/").filter(Boolean)[0] ||
    "default"
  );
}

function buildSessionConfig(event: any) {
  const config = useRuntimeConfig(event);
  const eventCode = getEventCode(event);
  return {
    password: config.session.password as string,
    name: `nuxt-session-${eventCode}`,
    cookie: {
      ...(config.session.cookie as object),
      path: "/"
    }
  };
}

export async function getEventUserSession(event: any) {
  const session = await useSession(event, buildSessionConfig(event));
  return { ...session.data, id: session.id } as any;
}

export async function requireEventUserSession(event: any) {
  const session = await getEventUserSession(event);
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  return session;
}

export async function setEventUserSession(event: any, data: any) {
  const session = await useSession(event, buildSessionConfig(event));
  await session.update(data);
  return session.data;
}

export async function clearEventUserSession(event: any) {
  const session = await useSession(event, buildSessionConfig(event));
  session.clear;
  return true;
}
