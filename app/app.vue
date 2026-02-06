<script lang="ts" setup>
const liveState = useState("live", () => false);
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
