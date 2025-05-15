<template>
  <div class="timer-container">
    <div class="background-image" :style="{ backgroundImage: `url(${backgroundImageUrl})` }"></div>
    <ActivityPanel ref="activityPanelRef" />
    <!-- 添加顶部导航栏 -->
    <div class="top-nav">
      <div class="points" @click="$router.push('/points')">
        <el-tag
          size="large"
          type="warning"
          effect="dark"
          class="points-tag"
        >积分：{{ totalPoints.toFixed(2) }}</el-tag>
      </div>
      <button class="shop-button" @click="$router.push('/shop')">
        <el-icon>
          <Shop />
        </el-icon>商城
      </button>
    </div>

    <div
      class="timer"
      v-show="!isFloating"
    >{{ formatTime(hours) }}:{{ formatTime(minutes) }}:{{ formatTime(seconds) }}</div>

    <div class="controls" v-show="!isFloating">
      <el-button
        type="primary"
        @click="toggleStart"
        :icon="isRunning ? CircleClose : VideoPlay"
      >{{ isRunning ? '结束学习' : '开始学习' }}</el-button>

      <el-button
        type="warning"
        @click="togglePause"
        :icon="isPaused ? VideoPlay : VideoPause"
        :disabled="!isRunning"
      >{{ isPaused ? '继续学习' : '暂停学习' }}</el-button>

      <el-button type="info" @click="ignore" :icon="Delete" :disabled="!isRunning">忽略本次</el-button>
    </div>

    <!-- 添加每日奖励组件 -->
    <DailyRewards v-show="!isFloating" />

    <!-- 添加签到组件 -->
    <MonthlySignIn v-show="!isFloating" />

    <!-- 小窗模式按钮 -->
    <div class="side-button pip-button" v-show="!isFloating">
      <el-button type="success" @click="togglePiP" :icon="Crop" :disabled="!isPiPEnabled">小窗模式</el-button>
    </div>

    <!-- 添加时间组件 -->
    <TimeAdder v-show="!isFloating" @addTime="handleTimeAdd" />

    <!-- 小窗外观组件 -->
    <WindowStyle v-show="!isFloating" @styleChange="handleStyleChange" />

    <!-- 隐藏的canvas和video元素 -->
    <div style="display: none;">
      <canvas ref="canvas" width="320" height="180"></canvas>
      <video ref="video" muted playsinline></video>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, h } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import {
  VideoPlay,
  VideoPause,
  CircleClose,
  Delete,
  Shop,
  Crop
} from "@element-plus/icons-vue";
import { ElMessageBox, ElMessage } from "element-plus";
import ActivityPanel from "./ActivityPanel.vue";
import MonthlySignIn from "./MonthlySignIn.vue";
import DailyRewards from "./DailyRewards.vue";
import TimeAdder from "./TimeAdder.vue";
import FloatingTimer from "./FloatingTimer.vue";
import WindowStyle from "./WindowStyle.vue";
import dayjs from "dayjs";
import { ipcRenderer } from "electron";
import path from "path";
import { app, nativeImage } from "@electron/remote";
import fs from "fs";
import { defineComponent } from "vue";
import xiaoleiDevBackgroundImage from "../../image/xiaolei.jpg";

// 背景图片URL
const backgroundImageUrl = ref("");

// 加载背景图片
const loadBackgroundImage = async () => {
  if (process.env.NODE_ENV === "development") {
    backgroundImageUrl.value = xiaoleiDevBackgroundImage;
  } else {
    try {
      const imagePath = path.join(
        process.resourcesPath,
        "image",
        "xiaolei.jpg"
      );
      console.log("Loading image from:", imagePath);

      if (fs.existsSync(imagePath)) {
        console.log("Image file exists, reading...");
        const image = nativeImage.createFromPath(imagePath);
        backgroundImageUrl.value = image.toDataURL();
        console.log("Image loaded successfully");
      } else {
        console.error("Image file not found");
      }
    } catch (error) {
      console.error("Error loading background:", error);
    }
  }
};

onMounted(() => {
  loadBackgroundImage();

  // 检查画中画功能是否可用
  isPiPEnabled.value = document?.pictureInPictureEnabled || false;

  const savedData = JSON.parse(localStorage.getItem("timerData") || "{}");
  totalPoints.value = savedData.totalPoints || 0;
  seconds.value = savedData.seconds || 0;
  minutes.value = savedData.minutes || 0;
  hours.value = savedData.hours || 0;
  isPaused.value = savedData.isPaused || false;
  // 移除isFloating的加载，总是从false开始
  isFloating.value = false;

  // 检查是否需要重置今日学习时间
  const today = dayjs().format("YYYY-MM-DD");
  if (savedData.lastStudyDate !== today) {
    savedData.todayStudyTime = 0;
    savedData.lastStudyDate = today;
    localStorage.setItem("timerData", JSON.stringify(savedData));
  }

  // 如果上次关闭时计时器在运行，则自动开始
  if (savedData.isRunning) {
    startTime = dayjs();
    startTimer();
  }

  // 添加画中画事件监听
  video.value?.addEventListener("leavepictureinpicture", () => {
    isFloating.value = false;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });

  // 添加浮动窗口控制监听
  ipcRenderer.on("floating-control", (event, command) => {
    if (command.type === "toggle-start") {
      toggleStart();
    } else if (command.type === "toggle-pause") {
      togglePause();
    }
  });

  // 监听浮动窗口关闭事件
  ipcRenderer.on("floating-window-closed", () => {
    isFloating.value = false;
  });

  // 加载保存的窗口样式
  const savedStyle = localStorage.getItem("windowStyle");
  if (savedStyle) {
    currentWindowStyle.value = savedStyle;
  }
});

// 状态变量
const isRunning = ref(false);
const isPaused = ref(false);
const isFloating = ref(false);
const seconds = ref(0);
const minutes = ref(0);
const hours = ref(0);
const totalPoints = ref(0);
const isPiPEnabled = ref(true);
let timer = null;
let floatingWindow = null;

// 活动面板引用
const activityPanelRef = ref(null);

// 记录开始时间
let startTime = null;

// 添加refs
const canvas = ref(null);
const video = ref(null);
let pipWindow = null;
let animationFrame = null;

// 在 script setup 中添加
const currentWindowStyle = ref("default");

// 背景图片组件
const BackgroundImage = defineComponent({
  name: "BackgroundImage",
  setup() {
    const style = ref({});

    onMounted(async () => {
      if (process.env.NODE_ENV !== "development") {
        try {
          const imagePath = path.join(
            process.resourcesPath,
            "image",
            "xiaolei.jpg"
          );
          console.log("Loading image from:", imagePath);

          if (fs.existsSync(imagePath)) {
            console.log("Image file exists, reading...");
            const image = nativeImage.createFromPath(imagePath);
            const dataUrl = image.toDataURL();
            console.log("Image loaded successfully, size:", image.getSize());

            style.value = {
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundImage: `url("${dataUrl}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              zIndex: -1,
              opacity: 1
            };
          }
        } catch (error) {
          console.error("Error loading background:", error);
        }
      } else {
        style.value = {
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: 'url("../../image/xiaolei.jpg")',
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          zIndex: -1,
          opacity: 1
        };
      }
    });

    return () => h("div", { style: style.value });
  }
});

// 保存数据到localStorage
const saveData = () => {
  const savedData = JSON.parse(localStorage.getItem("timerData") || "{}");
  localStorage.setItem(
    "timerData",
    JSON.stringify({
      ...savedData,
      totalPoints: totalPoints.value,
      seconds: seconds.value,
      minutes: minutes.value,
      hours: hours.value,
      isRunning: isRunning.value,
      isPaused: isPaused.value
    })
  );
};

// 获取今日学习时间（秒）
const getTodayStudyTime = () => {
  const savedData = JSON.parse(localStorage.getItem("timerData") || "{}");
  const today = dayjs().format("YYYY-MM-DD");
  const lastStudyDate = savedData.lastStudyDate;

  // 如果是新的一天，重置今日学习时间
  if (lastStudyDate !== today) {
    return hours.value * 3600 + minutes.value * 60 + seconds.value;
  }

  // 否则返回累计时间
  return savedData.todayStudyTime || 0;
};

// 监听数据变化并保存
watch(
  [totalPoints, seconds, minutes, hours, isRunning, isPaused, isFloating],
  saveData
);

// 格式化时间显示
const formatTime = time => {
  return time.toString().padStart(2, "0");
};

// 格式化学习时长
const formatDuration = seconds => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// 计时器逻辑
const startTimer = () => {
  if (timer) return;
  timer = setInterval(() => {
    if (!isPaused.value) {
      seconds.value++;
      if (seconds.value >= 60) {
        seconds.value = 0;
        minutes.value++;
        if (minutes.value >= 60) {
          minutes.value = 0;
          hours.value++;
        }
      }

      // 更新今日学习时间
      const savedData = JSON.parse(localStorage.getItem("timerData") || "{}");
      const today = dayjs().format("YYYY-MM-DD");

      // 如果是新的一天，重置学习时间
      if (savedData.lastStudyDate !== today) {
        savedData.todayStudyTime = 1;
        savedData.lastStudyDate = today;
      } else {
        // 更新总学习时间
        savedData.todayStudyTime = (savedData.todayStudyTime || 0) + 1;
      }

      // 保存所有更新
      localStorage.setItem(
        "timerData",
        JSON.stringify({
          ...savedData,
          totalPoints: totalPoints.value,
          seconds: seconds.value,
          minutes: minutes.value,
          hours: hours.value,
          isRunning: isRunning.value,
          isPaused: isPaused.value,
          lastStudyDate: today
        })
      );
    }
  }, 1000);
};

const stopTimer = () => {
  clearInterval(timer);
  timer = null;
};

// 开始/结束按钮处理
const toggleStart = () => {
  if (!isRunning.value) {
    const savedData = JSON.parse(localStorage.getItem("timerData") || "{}");
    startTime = dayjs();
    isRunning.value = true;
    isPaused.value = savedData.isPaused || false; // 恢复保存的暂停状态
    startTimer();
  } else {
    isRunning.value = false;
    isPaused.value = false;
    stopTimer();
    calculatePoints();
    resetTimer();
    startTime = null;
  }
};

// 暂停/继续按钮处理
const togglePause = () => {
  isPaused.value = !isPaused.value;
  saveData(); // 使用已有的 saveData 函数保存状态
};

// 忽略本次
const ignore = () => {
  isRunning.value = false;
  isPaused.value = false;
  stopTimer();
  resetTimer();
};

// 重置计时器
const resetTimer = () => {
  seconds.value = 0;
  minutes.value = 0;
  hours.value = 0;
  isPaused.value = false;
  saveData(); // 使用已有的 saveData 函数保存状态
};

// 计算积分（考虑活动加成）
const calculatePoints = () => {
  const endTime = dayjs();
  const totalSeconds = hours.value * 3600 + minutes.value * 60 + seconds.value;
  let points = 0;

  // 计算每一秒的积分（考虑活动时间段）
  for (let i = 0; i < totalSeconds; i++) {
    const currentTime = startTime.add(i, "second");
    const multiplier = activityPanelRef.value?.getCurrentMultiplier() || 1;
    points += (1 / 60) * multiplier; // 每秒积分 = 1/60 * 倍率
  }

  // 保留两位小数，不四舍五入
  points = Math.floor(points * 100) / 100;

  // 显示完成学习提示框
  ElMessageBox.alert(
    `<div style="text-align: center;">
      <h2 style="margin: 0 0 30px 0; font-size: 24px;">恭喜完成本次学习</h2>
      <div style="display: flex; justify-content: space-between; margin: 0 40px 30px 40px;">
        <div style="font-size: 18px;">学习时长：${formatDuration(
          totalSeconds
        )}</div>
        <div style="font-size: 18px;">获得积分：${points.toFixed(2)}</div>
      </div>
    </div>`,
    "",
    {
      dangerouslyUseHTMLString: true,
      showClose: false,
      confirmButtonText: "确定",
      customClass: {
        container: "study-complete-dialog"
      }
    }
  );

  totalPoints.value += points;

  // 记录历史
  const history = JSON.parse(localStorage.getItem("pointsHistory") || "[]");
  history.unshift({
    type: "earn",
    points: points,
    duration: totalSeconds,
    timestamp: new Date().getTime()
  });
  localStorage.setItem("pointsHistory", JSON.stringify(history));
};

// 处理添加时间
const handleTimeAdd = minutesToAdd => {
  // 将分钟转换为秒
  const secondsToAdd = minutesToAdd * 60;

  // 计算新的总秒数
  let totalSeconds =
    hours.value * 3600 + minutes.value * 60 + seconds.value + secondsToAdd;

  // 更新时、分、秒
  hours.value = Math.floor(totalSeconds / 3600);
  minutes.value = Math.floor((totalSeconds % 3600) / 60);
  seconds.value = totalSeconds % 60;

  // 更新计时器状态和开始时间
  isRunning.value = true;
  isPaused.value = true;
  startTime = dayjs().subtract(totalSeconds, "second");

  // 更新今日学习时间
  const savedData = JSON.parse(localStorage.getItem("timerData") || "{}");
  const today = dayjs().format("YYYY-MM-DD");

  if (savedData.lastStudyDate !== today) {
    savedData.todayStudyTime = totalSeconds;
    savedData.lastStudyDate = today;
  } else {
    savedData.todayStudyTime = (savedData.todayStudyTime || 0) + secondsToAdd;
  }

  // 保存更新后的数据
  localStorage.setItem(
    "timerData",
    JSON.stringify({
      ...savedData,
      totalPoints: totalPoints.value,
      seconds: seconds.value,
      minutes: minutes.value,
      hours: hours.value,
      isRunning: true,
      isPaused: true,
      lastStudyDate: today
    })
  );

  // 启动计时器（但因为isPaused为true，所以不会实际计时）
  if (!timer) {
    startTimer();
  }
};

// 绘制计时器到canvas
const drawTimer = () => {
  const ctx = canvas.value.getContext("2d");
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);

  // 设置背景
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);

  // 设置文本样式
  ctx.fillStyle = "#303133";
  ctx.font = "bold 48px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 绘制时间
  const timeText = `${formatTime(hours.value)}:${formatTime(
    minutes.value
  )}:${formatTime(seconds.value)}`;
  ctx.fillText(timeText, canvas.value.width / 2, canvas.value.height / 2);

  // 如果在PiP模式中，继续动画
  if (document.pictureInPictureElement) {
    animationFrame = requestAnimationFrame(drawTimer);
  }
};

// 供浮动窗口调用的函数
const toggleStartFromFloat = () => {
  toggleStart();
};

const togglePauseFromFloat = () => {
  togglePause();
};

const updateFloatingWindow = () => {
  if (floatingWindow && !floatingWindow.closed) {
    try {
      floatingWindow.updateTimer(hours.value, minutes.value, seconds.value);
      floatingWindow.updateButtons(isRunning.value, isPaused.value);
    } catch (error) {
      console.error("更新浮动窗口失败:", error);
      handleFloatingWindowClose();
    }
  }
};

// 切换浮动窗口模式
const togglePiP = () => {
  isFloating.value = !isFloating.value;
  ipcRenderer.send("toggle-floating-window");

  // 立即同步当前状态到浮动窗口
  if (isFloating.value) {
    const currentState = {
      hours: hours.value,
      minutes: minutes.value,
      seconds: seconds.value,
      isRunning: isRunning.value,
      isPaused: isPaused.value,
      startTime: startTime ? startTime.valueOf() : null
    };
    console.log("Sending state to floating window:", currentState); // 添加日志
    ipcRenderer.send("update-timer", currentState);
  }
};

// 监听浮动窗口的控制命令
ipcRenderer.on("floating-control", (event, command) => {
  console.log("Received floating control command:", command); // 添加日志
  switch (command) {
    case "toggle-start":
      toggleStart();
      break;
    case "toggle-pause":
      togglePause();
      break;
    case "close":
      isFloating.value = false;
      break;
  }
});

// 在计时器状态更新时同步到浮动窗口
watch(
  [hours, minutes, seconds, isRunning, isPaused],
  () => {
    if (isFloating.value) {
      const currentState = {
        hours: hours.value,
        minutes: minutes.value,
        seconds: seconds.value,
        isRunning: isRunning.value,
        isPaused: isPaused.value,
        startTime: startTime ? startTime.valueOf() : null
      };
      console.log("State updated, sending to floating window:", currentState); // 添加日志
      ipcRenderer.send("update-timer", currentState);
    }
  },
  { deep: true, immediate: true }
);

// 监听浮动窗口关闭事件
ipcRenderer.on("floating-window-closed", () => {
  console.log("Floating window closed"); // 添加日志
  isFloating.value = false;
});

// 清理资源
const cleanup = () => {
  // 清理浮动窗口
  if (floatingWindow && !floatingWindow.closed) {
    floatingWindow.close();
  }
  floatingWindow = null;
  isFloating.value = false;

  // 停止计时器
  stopTimer();

  // 移除事件监听
  ipcRenderer.removeAllListeners("floating-control");
  ipcRenderer.removeAllListeners("floating-window-closed");
};

// 清理浮动窗口
const handleFloatingWindowClose = () => {
  cleanup();
};

// 组件卸载时清理
onUnmounted(() => {
  cleanup();
});

// 添加路由离开守卫
onBeforeRouteLeave((to, from, next) => {
  cleanup();
  next();
});

// 在 script setup 中添加
const handleStyleChange = styleId => {
  currentWindowStyle.value = styleId;
  // 保存样式选择到本地存储
  localStorage.setItem("windowStyle", styleId);

  // 如果当前在小窗模式，立即应用新样式
  if (isFloating.value && floatingWindow) {
    ipcRenderer.send("update-window-style", styleId);
  }
};
</script>

<style scoped>
/* 主容器样式 */
.timer-container {
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  box-sizing: border-box;
  z-index: 1;
}

/* 背景图片样式 */
.background-image {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  background-attachment: fixed;
  z-index: -1;
  pointer-events: none;
}

/* 半透明遮罩 */
.background-image::after {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.1);
  pointer-events: none;
  z-index: 0;
}

/* 内容层样式 */
.content-layer {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 确保其他元素在背景之上 */
.timer,
.controls,
.points,
.shop-button,
.daily-rewards,
.monthly-signin,
.side-button {
  position: relative;
  z-index: 2;
}

/* 添加一个半透明的遮罩层，提高内容可读性 */
.timer-container::after {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.1);
  z-index: -1;
  pointer-events: none;
}

/* 创建顶部导航栏容器 */
.top-nav {
  position: fixed;
  top: 20px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.points {
  position: static; /* 移除绝对定位 */
  cursor: pointer;
  transition: transform 0.2s;
  user-select: none;
  outline: none;
}

.points:hover {
  transform: scale(1.05);
}

.points-tag {
  font-size: 1.2rem;
  padding: 8px 15px;
  border-radius: 20px;
  outline: none;
  user-select: none;
}

.shop-button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  border: none;
  border-radius: 20px;
  background-color: #409eff;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 1.1rem;
}

.shop-button:hover {
  background-color: #66b1ff;
  transform: scale(1.05);
}

.shop-button .el-icon {
  font-size: 1.2em;
}

/* 增加内容的可读性 */
.timer {
  font-size: 6rem;
  font-weight: bold;
  font-family: monospace;
  margin: 2rem 0;
  padding: 2rem;
  border-radius: 1rem;
  background: rgba(245, 247, 250, 0.9); /* 保持计时器背景的透明度以确保可读性 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  user-select: none;
  outline: none;
}

/* 调整其他组件的背景透明度 */
.daily-rewards,
.monthly-signin {
  background: rgba(255, 255, 255, 0.9) !important;
}

.controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.controls .el-button {
  padding: 12px 24px;
  font-size: 1.1rem;
}

/* 自定义对话框样式 */
.study-complete-dialog {
  text-align: center;
  min-width: 400px !important;
}

.study-complete-dialog .el-message-box__header {
  padding-right: 0;
  display: none;
}

.study-complete-dialog .el-message-box__headerbtn {
  display: none;
}

.study-complete-dialog .el-message-box__title {
  display: none;
}

.study-complete-dialog .el-message-box__content {
  padding: 30px 20px;
  font-size: 16px;
}

.study-complete-dialog .el-message-box__btns {
  justify-content: center;
  padding: 20px 0;
}

.study-complete-dialog .el-button {
  padding: 12px 60px;
  font-size: 16px;
  margin: 0;
}

.study-complete-dialog .el-message-box__status {
  display: none;
}

/* 悬浮窗样式 */
.floating-window {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 300px;
  height: 200px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 10px;
  cursor: move;
}

.floating-window .timer-display {
  font-size: 2rem;
  font-weight: bold;
  font-family: monospace;
  margin-bottom: 10px;
}

.floating-window .controls {
  display: flex;
  gap: 8px;
}

.floating-window .controls .el-button {
  padding: 8px 16px;
  font-size: 1rem;
}

/* 侧边按钮基础样式 */
.side-button {
  position: fixed;
  right: -120px;
  transition: right 0.3s ease;
  z-index: 100;
}

.side-button:hover {
  right: 0;
}

/* 小窗模式按钮特定样式 */
.pip-button {
  bottom: 750px; /* 距离页面底部距离 *每个测边框相距50px */
}

.pip-button .el-button {
  width: 145px;
  height: 60px;
  border-radius: 4px 0 0 4px;
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: white;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pip-button .el-button:hover {
  background-color: #85ce61 !important;
  border-color: #85ce61 !important;
}

.pip-button .el-button:disabled {
  background-color: #c0c4cc !important;
  border-color: #c0c4cc !important;
  cursor: not-allowed;
}
</style> 