<template>
  <div v-if="isConnecting" class="connection-status">
    <p>
      Connecting to server ...
      <span v-if="attempts > 0">#{{ attempts }}</span>
    </p>
    <p v-if="attempts >= 5">
      There seems to be a connection problem. Please check your internet
      connections and reload the browser to try again. If this problem persists,
      please contact your IT supports or our event organizer for help.
    </p>
  </div>
</template>

<style scoped>
.connection-status {
  position: fixed;
  z-index: 999;
  left: 0px;
  right: 0px;
  bottom: 20px;
  /* padding: 0 0.7em;
  border-radius: 0.2rem;
  min-width: 50px; */
  /* height: 20px; */
  line-height: 21px;
  /* background-color: #f83245;
  color: #fff; */
  /* opacity: 0.5; */
  text-transform: uppercase;
  text-align: center;
  vertical-align: baseline;
  font-size: 0.7em;
  font-weight: bold;
  /* transition: opacity 0.25s; */
}
/* .project-stage-badge:hover {
  opacity: 1;
} */
</style>

<script>
export default {
  props: {
    isConnecting: Boolean,
    attempts: Number
  }
};
</script>
