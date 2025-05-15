<template>
  <div>
    <!-- 侧边栏按钮 -->
    <div class="side-button window-style">
      <el-button type="primary" @click="showStyleSelector">
        <el-icon>
          <Brush />
        </el-icon>小窗外观
      </el-button>
    </div>

    <!-- 样式选择弹出框 -->
    <el-dialog
      v-model="isExpanded"
      title="选择小窗外观"
      width="600px"
      :show-close="true"
      :close-on-click-modal="false"
      custom-class="window-style-dialog"
      @close="handleClose"
    >
      <div class="dialog-content">
        <el-carousel :interval="4000" type="card" height="400px" :autoplay="false">
          <el-carousel-item v-for="style in windowStyles" :key="style.id">
            <div class="style-card" :class="{ 'active': currentStyle === style.id }">
              <div class="style-preview">
                <img :src="style.preview" :alt="style.name" />
              </div>
              <div class="style-info">
                <h3>{{ style.name }}</h3>
                <p>{{ style.description }}</p>
                <el-button
                  type="primary"
                  @click="selectStyle(style.id)"
                  :class="{ 'is-selected': currentStyle === style.id }"
                >{{ currentStyle === style.id ? '当前使用' : '使用此样式' }}</el-button>
              </div>
            </div>
          </el-carousel-item>
        </el-carousel>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits, onMounted, onUnmounted } from "vue";
import { Brush } from "@element-plus/icons-vue";
import { ipcRenderer } from "electron";
import path from "path";
import { app } from "@electron/remote";

const isExpanded = ref(false);
const currentStyle = ref("default");

interface WindowStyle {
  id: string;
  name: string;
  description: string;
  preview: string;
}

// 获取图片路径
const getImagePath = (imageName: string) => {
  if (process.env.NODE_ENV === "development") {
    // 在开发环境中使用相对于 public 目录的路径
    return `/image/small-window/${imageName}`;
  } else {
    // 在生产环境中使用 resources 目录的路径
    const { nativeImage } = require("@electron/remote");
    const path = require("path");
    const fs = require("fs");

    try {
      const imagePath = path.join(
        process.resourcesPath,
        "public/image/small-window",
        imageName
      );
      console.log("Loading preview image from:", imagePath);

      if (fs.existsSync(imagePath)) {
        console.log("Preview image file exists, reading...");
        const image = nativeImage.createFromPath(imagePath);
        return image.toDataURL();
      } else {
        console.error("Preview image file not found:", imagePath);
        return "";
      }
    } catch (error) {
      console.error("Error loading preview image:", error);
      return "";
    }
  }
};

// 样式列表
const windowStyles: WindowStyle[] = [
  {
    id: "default",
    name: "默认样式",
    description: "简洁现代的白色主题",
    preview: getImagePath("default.jpg")
  },
  {
    id: "dark",
    name: "暗色主题",
    description: "护眼的深色模式",
    preview: getImagePath("dark.jpg")
  },
  {
    id: "pink",
    name: "粉色少女",
    description: "可爱甜美的粉色主题",
    preview: getImagePath("pink.jpg")
  }
];

const emit = defineEmits<{
  (e: "styleChange", styleId: string): void;
}>();

const showStyleSelector = () => {
  isExpanded.value = true;
};

const handleClose = () => {
  isExpanded.value = false;
};

const selectStyle = (styleId: string) => {
  currentStyle.value = styleId;
  ipcRenderer.send("update-window-style", styleId);
  emit("styleChange", styleId);
};

// 初始化当前样式
onMounted(() => {
  ipcRenderer.send("request-current-style");

  // 监听样式更新
  ipcRenderer.on("style-update", (event, styleId) => {
    currentStyle.value = styleId;
  });
});

onUnmounted(() => {
  ipcRenderer.removeAllListeners("style-update");
});
</script>

<style scoped>
/* 小窗外观按钮 */
.window-style {
  bottom: 650px; /* 距离页面底部距离 */
}

.window-style .el-button {
  width: 145px;
  height: 60px;
  border-radius: 4px 0 0 4px;
  background-color: #ff69b4 !important;
  border-color: #ff69b4 !important;
  color: white;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.window-style .el-button:hover {
  background-color: #ff8dc7 !important;
  border-color: #ff8dc7 !important;
}

/* 继承侧边按钮的基础样式 */
.side-button {
  position: fixed;
  right: -120px;
  transition: right 0.3s ease;
  z-index: 100;
}

.side-button:hover {
  right: 0;
}

/* 弹出框样式 */
:deep(.window-style-dialog) {
  border-radius: 8px;
}

:deep(.el-dialog__body) {
  padding: 30px;
}

/* 修改轮播组件样式 */
:deep(.el-carousel__container) {
  padding: 0;
}

:deep(.el-carousel__item) {
  border-radius: 8px;
  border: none;
  overflow: visible;
}

:deep(.el-carousel__item.is-active) {
  z-index: 2;
}

:deep(.el-carousel__mask) {
  display: none;
}

.style-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  margin: 0 10px;
}

.style-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 优化轮播箭头样式 */
:deep(.el-carousel__arrow) {
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  color: #606266;
}

:deep(.el-carousel__arrow:hover) {
  background-color: #ffffff;
  color: #409eff;
}

:deep(.el-carousel__arrow--left) {
  transform: translateX(-50%);
}

:deep(.el-carousel__arrow--right) {
  transform: translateX(50%);
}

.style-preview {
  height: 250px;
  overflow: hidden;
  background: #f5f7fa;
}

.style-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.style-info {
  padding: 20px;
  text-align: center;
}

.style-info h3 {
  margin: 0 0 10px;
  font-size: 18px;
  color: #303133;
}

.style-info p {
  margin: 0 0 15px;
  color: #606266;
  font-size: 14px;
}

.style-info .el-button {
  width: 120px;
}

.style-info .el-button.is-selected {
  background-color: #67c23a;
  border-color: #67c23a;
}

:deep(.el-dialog__header) {
  margin-right: 0;
  padding: 20px;
  border-bottom: 1px solid #dcdfe6;
}

:deep(.el-dialog__footer) {
  padding: 20px;
  border-top: 1px solid #dcdfe6;
}
</style> 