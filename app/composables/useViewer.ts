import { onMounted } from "vue";
import { useNuxtApp } from "#app";

export function useViewer() {
  const nuxtApp = useNuxtApp();
  const viewer =
    (nuxtApp as any).$viewer ||
    (nuxtApp as any)._context?.provides?.["viewer"] ||
    null;

  function ensureClient() {
    if (!import.meta.client) throw new Error("viewer is client-only");
  }

  onMounted(() => {
    ensureClient();
  });

  return { viewer };
}
