<template>
  <div class="points-detail">
    <div class="header">
      <div class="left-section">
        <el-button @click="$router.push('/')" type="primary" :icon="Back">返回</el-button>
      </div>
      <div class="center-section">
        <h1>积分详情</h1>
      </div>
      <div class="right-section">
        <el-button @click="resetAllData" type="danger" :icon="Delete">重置所有数据</el-button>
      </div>
    </div>

    <el-table :data="currentPageData" style="width: 100%">
      <el-table-column prop="type" label="类型" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.item && scope.row.type === 'earn'" type="primary">奖励</el-tag>
          <el-tag
            v-else
            :type="scope.row.type === 'earn' ? 'success' : 'danger'"
          >{{ scope.row.type === 'earn' ? '获取' : '支出' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="points" label="积分" width="100" />
      <el-table-column prop="duration" label="学习时长" width="150">
        <template
          #default="scope"
        >{{ scope.row.type === 'earn' && !scope.row.item ? formatDuration(scope.row.duration) : '-' }}</template>
      </el-table-column>
      <el-table-column prop="item" label="物品" width="200">
        <template #default="scope">{{ scope.row.type === 'spend' ? scope.row.item : '-' }}</template>
      </el-table-column>
      <el-table-column prop="timestamp" label="时间" width="200">
        <template #default="scope">{{ formatTime(scope.row.timestamp) }}</template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model="currentPage"
        :page-size="pageSize"
        :total="pointsHistory.length"
        layout="prev, pager, next"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { Back, Delete } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import { ElMessageBox, ElMessage } from "element-plus";

// 修改每页显示行数
const pageSize = 20;
const currentPage = ref(1);

// 从 localStorage 获取积分历史记录
const pointsHistory = ref([]);
const savedHistory = JSON.parse(localStorage.getItem("pointsHistory") || "[]");
pointsHistory.value = savedHistory;

// 计算当前页数据
const currentPageData = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return pointsHistory.value.slice(start, end);
});

// 处理页码改变
const handlePageChange = page => {
  currentPage.value = page;
};

// 格式化时间
const formatTime = timestamp => {
  return dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss");
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

// 重置所有数据
const resetAllData = async () => {
  try {
    await ElMessageBox.confirm(
      "警告：此操作将彻底清除所有应用数据，包括积分、学习记录、签到、已购商品、角色好感度及所有道具。数据一旦清除将无法恢复。确定要继续吗？",
      "高危操作确认",
      {
        confirmButtonText: "确定清除",
        cancelButtonText: "取消",
        type: "error",
        dangerouslyUseHTMLString: true,
        message:
          "<div style='text-align: left;'>" +
          "<strong>此操作将清除以下所有数据：</strong><br>" +
          "- 所有积分和学习时长记录<br>" +
          "- 每日奖励和签到进度<br>" +
          "- 已购买的所有服装和当前选择<br>" +
          "- 商店商品折扣及购买历史<br>" +
          "- 所有道具（如补签卡、刷新卡）<br>" +
          "- 角色好感度及互动记录<br><br>" +
          "数据清除后无法恢复，请谨慎操作！" +
          "</div>"
      }
    );

    // 定义所有需要清除的 localStorage 键
    const keysToRemove = [
      // 1. 积分、学习时间、每日累计奖励、签到进度
      "timerData",
      "pointsHistory",
      "dailyRewards",
      "monthlySignIn",
      "lastActivityCheck",
      "weeklyActivities",

      // 2. 已购买服装、选择服装数据
      "purchasedOutfits",
      "currentOutfit",
      "shopProducts",
      "productDiscounts",
      "shopDiscount",
      "discountPurchaseHistory",
      "lastOutfitPurchaseTimestamp",

      // 3. 道具数据
      "userData",

      // 4. 好感度数据
      "characterFavor",
      "characterClickData"

      // 5. 其他可能存在的相关数据 (根据实际情况添加)
      // "someOtherKey1",
      // "someOtherKey2"
    ];

    // 清除所有指定的 localStorage 数据
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // 重置当前页面数据 (积分历史)
    pointsHistory.value = [];
    currentPage.value = 1;

    // 清除 IPC 监听器可能依赖的状态 (如果适用，通常在主进程或相关组件卸载时处理)
    // 如果有通过 IPC 更新的状态，也需要通知其他部分重置
    const { ipcRenderer } = require("electron");
    ipcRenderer.send("app-data-reset-completed");

    ElMessageBox.alert("所有应用数据已成功重置。应用即将刷新。", "操作成功", {
      confirmButtonText: "确定",
      callback: () => {
        window.location.reload();
      }
    });
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      console.error("重置数据时发生错误:", error);
      ElMessage.error("数据重置过程中发生意外错误。");
    }
  }
};
</script>

<style scoped>
.points-detail {
  width: 100%;
  max-width: 90vw;
  padding: 2vh 2vw;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 2vh;
  margin: 0 auto; /* 使用margin auto来居中 */
}

.header {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: center;
  width: 100%;
  margin-bottom: 2vh;
}

.left-section {
  justify-self: start;
}

.center-section {
  justify-self: center;
  text-align: center;
}

.right-section {
  justify-self: end;
}

.header h1 {
  margin: 0;
  font-size: calc(16px + 1vw);
  color: #303133;
  font-weight: 600;
}

/* 调整表格高度以适应更多行 */
.el-table {
  flex: 1;
  min-height: 60vh; /* 使用视口高度 */
  max-height: 70vh; /* 限制最大高度 */
}

/* 调整表格行高使其更紧凑 */
:deep(.el-table td) {
  padding: 6px 0;
}

/* 确保表格内容不会溢出 */
:deep(.el-table) {
  width: 100% !important;
}

:deep(.el-table__body-wrapper) {
  overflow-x: hidden;
}

/* 调整表格列的宽度和样式 */
:deep(.el-table .cell) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 调整分页器样式 */
.pagination {
  margin-top: 2vh;
  display: flex;
  justify-content: center;
}

/* 调整按钮样式 */
.el-button {
  padding: 1vh 1.5vw;
  font-size: 14px;
}

.el-button [class*="el-icon"] + span {
  margin-left: 8px;
}
</style> 