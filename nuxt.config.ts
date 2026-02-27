// https://nuxt.com/docs/api/configuration/nuxt-config

import { nodePolyfills } from "vite-plugin-node-polyfills";

const isDev = process.env.NODE_ENV !== "production";
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@pinia/nuxt", "@nuxt/hints", "nuxt-auth-utils"],
  runtimeConfig: {
    public: {
      cognitoIdentityPoolId: process.env.COGNITO_IDENTITY_POOL_ID || "",
      awsRegion: process.env.NOVA_AWS_REGION || "ap-southeast-1",
      projectStageId: process.env.NOVA_PROJECT_STAGE_ID || "novaweb-dev",
      apiEndpoint: process.env.ApiHostname || "",
      stage: process.env.Stage || "dev",
      baseURL: process.env.NOVA_BASE_URL || "https://dev-event.novaweb.live",
      appSyncEndpoint: process.env.NOVA_APPSYNC_ENDPOINT
    },
    session: {
      password: process.env.NUXT_SESSION_PASSWORD || "",
      cookie: {
        domain: isDev ? "localhost" : ".novaweb.live",
        secure: !isDev,
        sameSite: isDev ? "lax" : "none",
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 2, // 2 days
        path: "/"
      }
    },
    aws: {
      region: "ap-southeast-1"
    }
  },
  vite: {
    define: {
      global: "window"
    },
    // optimizeDeps: {
    //   exclude: ["amazon-ivs-player"] // Exclude IVS Player and Video.js from pre-bundling
    // },
    plugins: [
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true
        },
        include: ["buffer", "process", "util", "fs", "path"]
      })
    ]
  },

  nitro: {
    preset: "aws-lambda",
    externals: {
      external: ["aws-sdk"]
    },
    serveStatic: false,
    minify: true,
    sourceMap: false,
    compressPublicAssets: true,
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
