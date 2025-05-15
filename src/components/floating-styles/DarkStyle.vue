<template>
  <div class="floating-timer-dark">
    <img src="../icons/littleLei.png" alt="supervisor" class="supervisor-image" />
    <div
      class="timer-display"
    >{{ formatTime(hours) }}:{{ formatTime(minutes) }}:{{ formatTime(seconds) }}</div>
    <div class="controls">
      <el-button
        type="success"
        size="small"
        @click="toggleStart"
        :icon="isRunning ? CircleClose : VideoPlay"
      >{{ isRunning ? '结束' : '开始' }}</el-button>

      <el-button
        type="warning"
        size="small"
        @click="togglePause"
        :icon="isPaused ? VideoPlay : VideoPause"
        :disabled="!isRunning"
      >{{ isPaused ? '继续' : '暂停' }}</el-button>

      <el-button type="danger" size="small" @click="closeWindow">
        <el-icon>
          <Close />
        </el-icon>关闭
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
import {
  VideoPlay,
  VideoPause,
  CircleClose,
  Close
} from "@element-plus/icons-vue";
import { ipcRenderer } from "electron";

interface Props {
  hours: number;
  minutes: number;
  seconds: number;
  isRunning: boolean;
  isPaused: boolean;
}

defineProps<Props>();

// 格式化时间显示
const formatTime = (time: number): string => {
  return time.toString().padStart(2, "0");
};

// 控制按钮事件
const toggleStart = () => {
  ipcRenderer.send("floating-control", "toggle-start");
};

const togglePause = () => {
  ipcRenderer.send("floating-control", "toggle-pause");
};

const closeWindow = () => {
  ipcRenderer.send("floating-control", "close");
  window.close();
};
</script>

<style scoped>
.floating-timer-dark {
  -webkit-app-region: drag;
  background: transparent;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  height: 100vh;
  box-sizing: border-box;
  user-select: none;
  min-width: 200px;
}

.supervisor-image {
  width: 30px;
  height: 30px;
  object-fit: contain;
  -webkit-app-region: drag;
}

.timer-display {
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  padding: 5px 15px;
  border-radius: 15px;
  margin-bottom: 2px;
  background: rgba(45, 45, 45, 0.95);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.controls {
  -webkit-app-region: no-drag;
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: 10px;
  width: 100%;
  justify-content: center;
}

/* 暗色主题按钮样式 */
.floating-timer-dark :deep(.controls .el-button) {
  padding: 8px 12px;
  min-width: 60px;
  --el-button-text-color: #ffffff;
  --el-button-hover-text-color: #ffffff;
  opacity: 0.9;
}

.floating-timer-dark :deep(.controls .el-button--success) {
  --el-button-bg-color: #2b3d2c;
  --el-button-border-color: #2b3d2c;
  --el-button-hover-bg-color: #375539;
  --el-button-hover-border-color: #375539;
}

.floating-timer-dark :deep(.controls .el-button--warning) {
  --el-button-bg-color: #3d3426;
  --el-button-border-color: #3d3426;
  --el-button-hover-bg-color: #554937;
  --el-button-hover-border-color: #554937;
}

.floating-timer-dark :deep(.controls .el-button--danger) {
  --el-button-bg-color: #3d2626;
  --el-button-border-color: #3d2626;
  --el-button-hover-bg-color: #553737;
  --el-button-hover-border-color: #553737;
}

.floating-timer-dark :deep(.controls .el-button:active) {
  opacity: 1;
}
</style> 