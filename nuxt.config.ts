// https://nuxt.com/docs/api/configuration/nuxt-config

import { nodePolyfills } from "vite-plugin-node-polyfills";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";

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
      appSyncEndpoint: process.env.NOVA_APPSYNC_ENDPOINT,
      mqttEndpoint: process.env.NOVA_MQTT_ENDPOINT,
      mqttPoolId: process.env.NOVA_MQTT_POOL_ID,
      domain: process.env.NOVA_DOMAIN || ".dev-event.novaweb.live"
    },
    session: {
      password: process.env.NUXT_SESSION_PASSWORD || "",
      cookie: {
        domain: isDev ? undefined : ".novaweb.live",
        secure: true,
        sameSite: isDev ? "lax" : "none",
        httpOnly: true,
        maxAge: 60 * 60 * 24, // 1 day
        path: "/"
      }
    },
    aws: {
      region: "ap-southeast-1"
    }
  },
  vite: {
    define: {
      global: "globalThis"
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: "globalThis"
        },
        plugins: [
          NodeGlobalsPolyfillPlugin({
            buffer: true,
            process: true
          })
        ]
      }
    },
    plugins: [
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true
        },
        include: ["buffer", "process", "util", "fs", "path", "events"]
      })
    ]
    // build: {
    //   chunkSizeWarningLimit: 1000,
    //   rollupOptions: {
    //     output: {
    //       manualChunks: {
    //         "amazon-ivs-player": ["amazon-ivs-player"],
    //         "video.js": ["video.js"]
    //       }
    //     }
    //   }
    // }
  },

  nitro: {
    preset: "aws-lambda",
    externals: {
      external: ["aws-sdk", "@aws-sdk/*"]
    },
    serveStatic: false,
    minify: true,
    sourceMap: false,
    compressPublicAssets: true,
    publicAssets: isDev
      ? []
      : [
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
