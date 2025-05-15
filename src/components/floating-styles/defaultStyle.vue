<template>
  <div class="floating-timer-default">
    <img src="../icons/littleLei.png" alt="supervisor" class="supervisor-image" />
    <div
      class="timer-display"
    >{{ formatTime(hours) }}:{{ formatTime(minutes) }}:{{ formatTime(seconds) }}</div>
    <div class="controls">
      <el-button
        type="primary"
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
.floating-timer-default {
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
  color: #409eff;
  text-shadow: 0 0 10px rgba(64, 158, 255, 0.5);
  padding: 5px 15px;
  border-radius: 15px;
  margin-bottom: 2px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
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

.controls .el-button {
  padding: 8px 12px;
  min-width: 60px;
}
</style> 