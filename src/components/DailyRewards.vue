<template>
  <div class="daily-rewards" :class="{ 'collapsed': isCollapsed }">
    <!-- 收起状态显示的内容 -->
    <div class="rewards-collapsed" v-if="isCollapsed" @click="toggleCollapse">
      <span class="collapsed-text">每日</span>
    </div>

    <!-- 展开状态显示的内容 -->
    <div class="rewards-expanded" v-else>
      <div class="rewards-header">
        <h3>每日学习奖励</h3>
        <el-button class="collapse-button" type="text" @click="toggleCollapse" :icon="ArrowUp"></el-button>
      </div>

      <div class="rewards-container">
        <div class="rewards-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
            <!-- 奖励节点 -->
            <div
              v-for="(reward, index) in rewards"
              :key="index"
              class="reward-node"
              :class="{
                'achieved': todayStudyHours >= reward.hours,
                'claimed': isRewardClaimed(reward.hours)
              }"
              :style="getNodeStyle(reward, index)"
              @click="claimReward(reward)"
            >
              <el-tooltip
                :content="getRewardTooltip(reward)"
                placement="top"
                :disabled="isRewardClaimed(reward.hours)"
              >
                <div class="reward-icon">
                  <el-icon v-if="isRewardClaimed(reward.hours)">
                    <Check />
                  </el-icon>
                  <el-icon v-else-if="todayStudyHours >= reward.hours">
                    <Present />
                  </el-icon>
                  <span v-else>{{ reward.hours }}h</span>
                </div>
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import dayjs from "dayjs";
import { ElMessage } from "element-plus";
import { Check, Present, ArrowUp } from "@element-plus/icons-vue";

// 奖励配置
const rewards = [
  { hours: 1, points: 10, type: "points" },
  { hours: 2, points: 20, type: "points" },
  { hours: 3, points: 30, type: "points" },
  { hours: 4, points: 40, type: "points" },
  { hours: 5, reward: 1, type: "refresh_card" },
  { hours: 6, points: 60, type: "points" },
  { hours: 7, points: 70, type: "points" },
  { hours: 8, points: 80, type: "points" },
  { hours: 9, points: 90, type: "points" },
  { hours: 10, reward: 1, type: "makeup_card" }
];

// 收起状态控制
const isCollapsed = ref(false);

// 今日学习时间（小时）
const todayStudyHours = computed(() => {
  try {
    const timerData = JSON.parse(localStorage.getItem("timerData") || "{}");
    return (timerData.todayStudyTime || 0) / 3600;
  } catch (e) {
    console.error("获取学习时间失败:", e);
    return 0;
  }
});

// 计算进度条百分比
const progressPercentage = computed(() => {
  return Math.min((todayStudyHours.value / 10) * 100, 100);
});

// 从localStorage加载面板状态
const loadPanelState = () => {
  try {
    const savedState = localStorage.getItem("dailyRewardsPanelState");
    if (savedState) {
      const state = JSON.parse(savedState);
      const today = dayjs().format("YYYY-MM-DD");

      // 如果是新的一天，重置状态
      if (state.lastDate !== today) {
        isCollapsed.value = false;
        savePanelState(false);
        return;
      }

      isCollapsed.value = state.isCollapsed;
    } else {
      isCollapsed.value = false;
      savePanelState(false);
    }
  } catch (e) {
    console.error("加载面板状态失败:", e);
    isCollapsed.value = false;
  }
};

// 保存面板状态到localStorage
const savePanelState = collapsed => {
  try {
    const state = {
      isCollapsed: collapsed,
      lastDate: dayjs().format("YYYY-MM-DD")
    };
    localStorage.setItem("dailyRewardsPanelState", JSON.stringify(state));
  } catch (e) {
    console.error("保存面板状态失败:", e);
  }
};

// 切换收起/展开状态
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  savePanelState(isCollapsed.value);
};

// 获取节点样式
const getNodeStyle = (reward, index) => {
  return {
    left: (reward.hours / 10) * 100 + "%"
  };
};

// 获取奖励提示文本
const getRewardTooltip = reward => {
  if (reward.type === "points") {
    return `${reward.hours}小时：${reward.points}积分`;
  } else if (reward.type === "refresh_card") {
    return `${reward.hours}小时：刷新卡x${reward.reward}`;
  } else if (reward.type === "makeup_card") {
    return `${reward.hours}小时：补签卡x${reward.reward}`;
  }
  return "";
};

// 检查奖励是否已领取
const isRewardClaimed = hours => {
  try {
    const claimedRewards = JSON.parse(
      localStorage.getItem("dailyRewardsClaimed") || "{}"
    );
    const today = dayjs().format("YYYY-MM-DD");
    return claimedRewards[today]?.includes(hours) || false;
  } catch (e) {
    console.error("检查奖励状态失败:", e);
    return false;
  }
};

// 领取奖励
const claimReward = reward => {
  if (todayStudyHours.value < reward.hours) {
    ElMessage.warning(`需要学习${reward.hours}小时才能领取该奖励`);
    return;
  }

  if (isRewardClaimed(reward.hours)) {
    ElMessage.warning("该奖励已领取");
    return;
  }

  try {
    // 记录领取状态
    const today = dayjs().format("YYYY-MM-DD");
    const claimedRewards = JSON.parse(
      localStorage.getItem("dailyRewardsClaimed") || "{}"
    );
    if (!claimedRewards[today]) {
      claimedRewards[today] = [];
    }
    claimedRewards[today].push(reward.hours);
    localStorage.setItem("dailyRewardsClaimed", JSON.stringify(claimedRewards));

    // 根据奖励类型处理
    if (reward.type === "points") {
      // 添加积分
      const timerData = JSON.parse(localStorage.getItem("timerData") || "{}");
      timerData.totalPoints = (timerData.totalPoints || 0) + reward.points;
      localStorage.setItem("timerData", JSON.stringify(timerData));

      // 记录积分历史
      const history = JSON.parse(localStorage.getItem("pointsHistory") || "[]");
      history.unshift({
        type: "earn",
        points: reward.points,
        item: `${reward.hours}小时学习奖励`,
        timestamp: new Date().getTime()
      });
      localStorage.setItem("pointsHistory", JSON.stringify(history));

      ElMessage.success(`恭喜获得${reward.points}积分奖励！`);
    } else if (reward.type === "refresh_card") {
      // 添加刷新卡
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      userData.refreshCards = (userData.refreshCards || 0) + reward.reward;
      localStorage.setItem("userData", JSON.stringify(userData));

      ElMessage.success(`恭喜获得${reward.reward}张刷新卡！`);
    } else if (reward.type === "makeup_card") {
      // 添加补签卡
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      userData.makeupCards = (userData.makeupCards || 0) + reward.reward;
      localStorage.setItem("userData", JSON.stringify(userData));

      ElMessage.success(`恭喜获得${reward.reward}张补签卡！`);
    }
  } catch (e) {
    console.error("领取奖励失败:", e);
    ElMessage.error("领取奖励失败，请重试");
  }
};

// 组件挂载时加载状态
onMounted(() => {
  loadPanelState();
});
</script>

<style scoped>
.daily-rewards {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  width: 463px;
  box-sizing: border-box;
  transition: all 0.3s ease;
}

/* 收起状态的样式 */
.daily-rewards.collapsed {
  padding: 0;
  width: 463px;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
}

.rewards-collapsed {
  background-color: #67c23a;
  color: white;
  padding: 12px 0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  transition: all 0.3s ease;
  width: 463px;
  height: 46px;
  box-sizing: border-box;
}

.rewards-collapsed:hover {
  background-color: #85ce61;
  transform: scale(1.01);
}

.collapsed-text {
  margin: 0;
  white-space: nowrap;
  font-weight: 500;
}

/* 展开状态的样式 */
.rewards-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  width: 100%;
}

.rewards-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2em;
}

.collapse-button {
  padding: 0;
  font-size: 20px;
  color: #909399;
}

.collapse-button:hover {
  color: #67c23a;
}

.rewards-container {
  width: 100%;
}

.rewards-progress {
  padding: 0 10px;
}

.progress-bar {
  height: 8px;
  background-color: #e4e7ed;
  border-radius: 4px;
  position: relative;
  margin: 40px 0;
  overflow: visible;
  padding-right: 22px;
}

.progress-fill {
  height: 100%;
  background-color: #67c23a;
  border-radius: 4px;
  transition: width 0.3s ease;
  max-width: calc(100% - 22px);
}

.reward-node {
  position: absolute;
  top: -35px;
  transform: translateX(-50%);
  cursor: pointer;
  z-index: 1;
}

.reward-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #fff;
  border: 2px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #606266;
  transition: all 0.3s;
  padding: 2px;
  min-width: 40px;
  white-space: nowrap;
}

.reward-icon :deep(.el-icon) {
  font-size: 18px;
}

.reward-node.achieved .reward-icon {
  border-color: #67c23a;
  color: #67c23a;
}

.reward-node.claimed .reward-icon {
  background-color: #67c23a;
  border-color: #67c23a;
  color: #fff;
}

.reward-node:hover .reward-icon {
  transform: scale(1.1);
}

.reward-node:not(.achieved) {
  cursor: not-allowed;
}

.reward-node:not(.achieved) .reward-icon {
  background-color: #f5f7fa;
}
</style> 