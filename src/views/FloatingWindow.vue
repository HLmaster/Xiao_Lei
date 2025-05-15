<template>
  <div class="floating-window">
    <div
      class="timer-display"
    >{{ formatTime(hours) }}:{{ formatTime(minutes) }}:{{ formatTime(seconds) }}</div>
    <div class="controls">
      <el-button
        type="primary"
        size="small"
        @click="sendControl('START')"
        :icon="isRunning ? CircleClose : VideoPlay"
      >{{ isRunning ? '结束' : '开始' }}</el-button>

      <el-button
        type="warning"
        size="small"
        @click="sendControl('PAUSE')"
        :icon="isPaused ? VideoPlay : VideoPause"
        :disabled="!isRunning"
      >{{ isPaused ? '继续' : '暂停' }}</el-button>

      <el-button
        type="info"
        size="small"
        @click="sendControl('IGNORE')"
        :icon="Delete"
        :disabled="!isRunning"
      >忽略</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import {
  VideoPlay,
  VideoPause,
  CircleClose,
  Delete
} from "@element-plus/icons-vue";

const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);
const isRunning = ref(false);
const isPaused = ref(false);

// 格式化时间显示
const formatTime = time => {
  return time.toString().padStart(2, "0");
};

// 发送控制命令到主窗口
const sendControl = action => {
  window.opener.postMessage(
    {
      type: "TIMER_CONTROL",
      action
    },
    "*"
  );
};

// 监听来自主窗口的更新
const handleMessage = event => {
  if (event.data.type === "TIMER_UPDATE") {
    const { data } = event.data;
    hours.value = data.hours;
    minutes.value = data.minutes;
    seconds.value = data.seconds;
    isRunning.value = data.isRunning;
    isPaused.value = data.isPaused;
  }
};

onMounted(() => {
  window.addEventListener("message", handleMessage);
  // 设置窗口标题
  document.title = "计时器";
});

onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
});
</script>

<style scoped>
.floating-window {
  padding: 15px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: 100vh;
  box-sizing: border-box;
}

.timer-display {
  font-family: monospace;
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
  color: #303133;
  margin-top: 10px;
}

.controls {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.controls .el-button {
  margin: 0;
}
</style> 