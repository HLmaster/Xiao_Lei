<template>
  <div class="floating-timer-pink">
    <img src="../icons/littleLei.png" alt="supervisor" class="supervisor-image" />
    <div
      class="timer-display"
    >{{ formatTime(hours) }}:{{ formatTime(minutes) }}:{{ formatTime(seconds) }}</div>
    <div class="controls">
      <el-button
        type="primary"
        size="small"
        @click="toggleStart"
        :icon="isRunning ? CircleCloseFilled : CaretRight"
      >{{ isRunning ? '结束' : '开始' }}</el-button>

      <el-button
        type="warning"
        size="small"
        @click="togglePause"
        :icon="isPaused ? CaretRight : Timer"
        :disabled="!isRunning"
      >{{ isPaused ? '继续' : '暂停' }}</el-button>

      <el-button type="danger" size="small" @click="closeWindow">
        <el-icon>
          <CloseBold />
        </el-icon>关闭
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
import {
  CaretRight,
  CircleCloseFilled,
  Timer,
  CloseBold
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
.floating-timer-pink {
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
  color: #ff69b4; /* 粉色文本 */
  text-shadow: 0 0 10px rgba(255, 105, 180, 0.7); /* 粉色发光效果 */
  padding: 5px 15px;
  border-radius: 15px;
  margin-bottom: 2px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 12px rgba(255, 105, 180, 0.3); /* 粉色阴影 */
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

/* 自定义按钮样式 */
.controls .el-button--primary {
  background-color: #ff69b4;
  border-color: #ff69b4;
}

.controls .el-button--primary:hover {
  background-color: #ff85c2;
  border-color: #ff85c2;
}

.controls .el-button--warning {
  background-color: #ffb6c1;
  border-color: #ffb6c1;
}

.controls .el-button--warning:hover {
  background-color: #ffc1c9;
  border-color: #ffc1c9;
}

.controls .el-button--danger {
  background-color: #ff4081;
  border-color: #ff4081;
}

.controls .el-button--danger:hover {
  background-color: #ff5a8f;
  border-color: #ff5a8f;
}
</style> 