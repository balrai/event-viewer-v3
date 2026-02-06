<template>
  <div v-if="projectStage" class="project-stage-badge" variant="danger">
    {{ projectStage }}
  </div>
</template>

<style scoped>
.project-stage-badge {
  position: fixed;
  z-index: 999;
  right: 20px;
  bottom: 20px;
  padding: 0 0.7em;
  border-radius: 0.2rem;
  min-width: 50px;
  height: 20px;
  line-height: 21px;
  background-color: #f83245;
  color: #fff;
  opacity: 0.5;
  text-transform: uppercase;
  text-align: center;
  vertical-align: baseline;
  font-size: 0.7em;
  font-weight: bold;
  transition: opacity 0.25s;
}
.project-stage-badge:hover {
  opacity: 1;
}
</style>

<script>
import { getEnvVarSync } from "@/lib/nwv2-client-lib/api/env";
export default {
  data() {
    return {
      projectStage: ""
    };
  },
  mounted() {
    var projectId = getEnvVarSync("projectId");
    var projectStageId = getEnvVarSync("projectStageId");
    var projectStage = projectStageId
      .replace(projectId, "")
      .replace(/(^-|-$)/g, "");
    if (projectStage != "prod" && projectStage != "live")
      this.projectStage = projectStage;
  }
};
</script>
