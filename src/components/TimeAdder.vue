<template>
  <div>
    <!-- 侧边栏按钮 -->
    <div class="side-button time-adder">
      <el-button type="primary" @click="showTimeAdder">
        <el-icon>
          <Timer />
        </el-icon>添加时间
      </el-button>
    </div>

    <!-- 添加时间弹出框 -->
    <el-dialog
      v-model="isExpanded"
      title="添加学习时间"
      width="400px"
      :show-close="true"
      :close-on-click-modal="false"
      custom-class="time-adder-dialog"
      @close="handleClose"
    >
      <div class="dialog-content">
        <div class="time-input">
          <el-input-number
            v-model="timeToAdd"
            :min="1"
            :max="1440"
            size="large"
            placeholder="输入分钟数"
            style="width: 200px;"
            controls-position="right"
          />
          <div class="unit">分钟</div>
        </div>

        <div class="quick-times">
          <el-button
            v-for="time in [30, 45, 60]"
            :key="time"
            @click="quickSelect(time)"
            :type="timeToAdd === time ? 'primary' : 'default'"
          >{{ time }}分钟</el-button>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" @click="addTime" :disabled="!timeToAdd">确认添加</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { Timer } from "@element-plus/icons-vue";

const isExpanded = ref(false);
const timeToAdd = ref(null);

const emit = defineEmits(["addTime"]);

const showTimeAdder = () => {
  isExpanded.value = true;
};

const handleClose = () => {
  isExpanded.value = false;
  timeToAdd.value = null;
};

const quickSelect = time => {
  timeToAdd.value = time;
};

const addTime = () => {
  if (timeToAdd.value) {
    emit("addTime", timeToAdd.value);
    handleClose();
  }
};
</script>

<style scoped>
/* 添加时间按钮 */
.time-adder {
  bottom: 700px; /* 距离页面底部距离 *每个测边框相距50px */
}

.time-adder .el-button {
  width: 145px;
  height: 60px;
  border-radius: 4px 0 0 4px;
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: white;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-adder .el-button:hover {
  background-color: #66b1ff !important;
  border-color: #66b1ff !important;
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
:deep(.time-adder-dialog) {
  border-radius: 8px;
}

.dialog-content {
  padding: 20px 0;
}

.time-input {
  margin-bottom: 20px;
  position: relative;
  display: flex;
  justify-content: center;
}

.unit {
  position: absolute;
  right: 65px;
  top: 50%;
  transform: translateY(-50%);
  color: #606266;
  font-size: 14px;
}

.quick-times {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  margin-top: 20px;
}

.quick-times .el-button {
  flex: 1;
  height: 40px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

:deep(.el-dialog__header) {
  margin-right: 0;
  padding: 20px;
  border-bottom: 1px solid #dcdfe6;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  padding: 20px;
  border-top: 1px solid #dcdfe6;
}

:deep(.el-input-number) {
  width: 200px !important;
}

:deep(.el-input-number .el-input__wrapper) {
  padding-right: 50px !important;
}
</style> 