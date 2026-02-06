// https://nuxt.com/docs/api/configuration/nuxt-config
import { nodePolyfills } from "vite-plugin-node-polyfills";
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@pinia/nuxt", "@nuxt/hints", "nuxt-auth-utils"],
  runtimeConfig: {
    public: {
      mqttPoolId: process.env.NOVA_MQTT_POOL_ID || "",
      mqttEndpoint: process.env.NOVA_MQTT_ENDPOINT || "",
      awsRegion: process.env.NOVA_AWS_REGION || "ap-southeast-1",
      projectStageId: process.env.NOVA_PROJECT_STAGE_ID || "novaweb-dev",
      apiEndpoint: process.env.ApiHostname || "",
      stage: process.env.Stage || "dev",
      baseURL: process.env.NOVA_BASE_URL || "https://dev-event.novaweb.live"
    },
    session: {
      password: process.env.NUXT_SESSION_PASSWORD || "",
      cookie: {
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: "lax",
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 2 // 2 days
      }
    }
  },
  vite: {
    plugins: [
      ,
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true
        },
        include: ["buffer", "process", "util", "events"]
      })
    ]
  },
  nitro: {
    preset: "aws-lambda",
    serveStatic: false,
    publicAssets: [
      {
        baseURL: "/_nuxt/",
        dir: "./.output/public/_nuxt",
        maxAge: 172800 // 2 days in seconds
      }
    ]
  },
  ssr: true,
  app: {
    baseURL: process.env.CDN_URL || "/"
  }
});
