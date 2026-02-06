<script lang="ts" setup>
const { title, message } = defineProps({
  title: {
    type: String,
    default: "Event is not available"
  },
  message: {
    type: String,
    default: "Please check if you enter the correct event website."
  }
});
</script>
<template>
  <div id="error">
    <div id="error-container">
      <h1>{{ title }}</h1>
      <h3>{{ message }}</h3>
    </div>
  </div>
</template>

<style scoped>
#error {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background: bottom center no-repeat url(../assets/bg.jpg);
  background-size: cover;
  font-family: Verdana, sans-serif;
}

#error h1 {
  color: #0a586e;
  font-family: Verdana, sans-serif;
  margin-bottom: 10px;
}

#error h3 {
  color: #0a586e;
  font-family: Verdana, sans-serif;
  font-weight: normal;
  margin-top: 0;
}

#error-container {
  margin: 15vh auto 0;
  max-width: 1200px;
  background: top left no-repeat url(../assets/bubble.png);
  background-size: 400px;
  height: 100%;
  padding-top: 100px;
  padding-left: 100px;
  text-align: left;
}

.timer {
  margin-top: 30px;
  font-size: 1.1rem;
  color: #333;
}

#countdown {
  font-weight: bold;
  color: #0a586e;
}

@media (max-width: 576px) {
  #error-container {
    width: 100vw;
    max-width: 100vw;
    background-size: 80vw;
    padding-left: 0px;
    padding-right: 0px;
    padding-top: 70px;
    margin: 10vh 0 0;
    background-position-x: -5vw;
  }

  #error h1,
  #error h3,
  .timer {
    margin: 0px 30px 10px;
  }

  #error h1 {
    font-size: 32px;
  }

  #error h3 {
    font-size: 14px;
  }
}
</style>
