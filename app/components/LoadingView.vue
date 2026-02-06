<template>
  <table>
    <tbody>
      <tr>
        <td>
          <img v-if="imgSrc" :src="imgSrc" />
          <img v-else src="@/assets/spinner.svg" />
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
table {
  width: 100vw;
  height: 100vh;
  position: absolute;
  z-index: -1;
}
td {
  vertical-align: middle;
  text-align: center;
}
img {
  height: 160px;
}
</style>

<script>
import { getEnvVarSync } from "~/lib/nwv2-client-lib/api/env.js";
export default {
  data() {
    let imgSrc;
    try {
      imgSrc = getEnvVarSync("LOGO");
    } catch (e) {
      console.error("Error fetching LOGO environment variable:", e);
      imgSrc = null;
    }
    return { imgSrc };
  }
};
</script>
