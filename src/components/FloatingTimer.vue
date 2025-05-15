<template>
  <DefaultStyle
    v-if="currentStyle === 'default'"
    :hours="hours"
    :minutes="minutes"
    :seconds="seconds"
    :isRunning="isRunning"
    :isPaused="isPaused"
  />
  <DarkStyle
    v-else-if="currentStyle === 'dark'"
    :hours="hours"
    :minutes="minutes"
    :seconds="seconds"
    :isRunning="isRunning"
    :isPaused="isPaused"
  />
  <PinkStyle
    v-else-if="currentStyle === 'pink'"
    :hours="hours"
    :minutes="minutes"
    :seconds="seconds"
    :isRunning="isRunning"
    :isPaused="isPaused"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { ipcRenderer } from "electron";
import DefaultStyle from "./floating-styles/defaultStyle.vue";
import DarkStyle from "./floating-styles/DarkStyle.vue";
import PinkStyle from "./floating-styles/pinkstyle.vue";

const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);
const isRunning = ref(false);
const isPaused = ref(false);
const currentStyle = ref("default");

// 监听来自主进程的更新
onMounted(() => {
  ipcRenderer.send("request-initial-state");
  ipcRenderer.send("request-current-style");

  ipcRenderer.on("timer-update", (event, data) => {
    hours.value = data.hours;
    minutes.value = data.minutes;
    seconds.value = data.seconds;
    isRunning.value = data.isRunning;
    isPaused.value = data.isPaused;
  });

  // 监听样式更新
  ipcRenderer.on("style-update", (event, styleId) => {
    try {
      currentStyle.value = styleId;
    } catch (error) {
      currentStyle.value = "default";
    }
  });
});

// 清理事件监听
onUnmounted(() => {
  ipcRenderer.removeAllListeners("timer-update");
  ipcRenderer.removeAllListeners("style-update");
});
</script>

<style>
/* 移除body的margin，使窗口完全透明 */
body {
  margin: 0;
  padding: 0;
  background: transparent !important;
  background-color: transparent !important;
  overflow: hidden;
}

#app {
  background: transparent !important;
}
</style> 