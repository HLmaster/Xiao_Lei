<template>
  <div class="monthly-signin" :class="{ 'collapsed': isCollapsed }">
    <!-- 收起状态显示的内容 -->
    <div class="signin-collapsed" v-if="isCollapsed" @click="toggleCollapse">
      <span class="collapsed-text">签到</span>
    </div>

    <!-- 展开状态显示的内容 -->
    <div v-else>
      <div class="signin-expanded" @click.stop>
        <div class="calendar-header">
          <h3>{{ currentYear }}年{{ currentMonth + 1 }}月签到记录</h3>
          <el-button class="collapse-button" type="text" @click="toggleCollapse" :icon="ArrowUp"></el-button>
        </div>
        <div class="calendar-container">
          <div class="calendar-grid">
            <div
              v-for="day in daysInMonth"
              :key="day"
              class="calendar-day"
              :class="{
                'signed': isSignedIn(day),
                'expired': isExpired(day),
                'future': isFuture(day),
                'today': isToday(day)
              }"
              @click="isExpired(day) ? handleMakeup(day) : null"
            >{{ day }}</div>
          </div>

          <!-- 添加签到奖励进度条 -->
          <div class="rewards-container">
            <div class="rewards-title">本月累计签到奖励</div>
            <div class="rewards-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
                <!-- 奖励节点 -->
                <div
                  v-for="(reward, index) in sortedRewards"
                  :key="index"
                  class="reward-node"
                  :class="{
                    'achieved': currentSignInDays >= reward.days,
                    'claimed': isRewardClaimed(reward.days)
                  }"
                  :style="getNodeStyle(reward, index)"
                  @click="claimReward(reward)"
                >
                  <el-tooltip
                    :content="reward.days + '天：' + reward.points + '积分'"
                    placement="top"
                    :disabled="isRewardClaimed(reward.days)"
                  >
                    <div class="reward-icon">
                      <el-icon v-if="isRewardClaimed(reward.days)">
                        <Check />
                      </el-icon>
                      <el-icon v-else-if="currentSignInDays >= reward.days">
                        <Present />
                      </el-icon>
                      <span v-else>{{ reward.days }}天</span>
                    </div>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>

          <div class="signin-footer">
            <el-button
              type="primary"
              :disabled="!canSignIn"
              @click="handleSignIn"
              class="signin-button"
            >{{ signInButtonText }}</el-button>
          </div>
        </div>
      </div>
      <!-- 添加一个透明遮罩层用于处理点击外部 -->
      <div class="overlay" @click="handleClickOutside"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import dayjs from "dayjs";
import { ElMessage, ElMessageBox } from "element-plus";
import { Check, Present, ArrowUp } from "@element-plus/icons-vue";

// 当前年月
const currentYear = ref(dayjs().year());
const currentMonth = ref(dayjs().month());

// 签到记录
const signInRecords = ref([]);

// 今日学习时间
const todayStudyTime = computed(() => {
  const timerData = JSON.parse(localStorage.getItem("timerData") || "{}");
  const today = dayjs().format("YYYY-MM-DD");

  // 如果是新的一天，只计算当前计时器的时间
  if (timerData.lastStudyDate !== today) {
    return (
      timerData.hours * 3600 + timerData.minutes * 60 + timerData.seconds || 0
    );
  }

  // 计算当前计时器的时间
  const currentTime =
    timerData.hours * 3600 + timerData.minutes * 60 + timerData.seconds || 0;

  // 如果计时器在运行，使用计时器时间，否则使用保存的时间
  return timerData.isRunning ? currentTime : timerData.todayStudyTime || 0;
});

// 计算当月天数
const daysInMonth = computed(() => {
  return dayjs()
    .year(currentYear.value)
    .month(currentMonth.value)
    .daysInMonth();
});

// 检查是否已签到
const isSignedIn = day => {
  const date = dayjs()
    .year(currentYear.value)
    .month(currentMonth.value)
    .date(day)
    .format("YYYY-MM-DD");
  return signInRecords.value.includes(date);
};

// 检查日期是否已过期（过去的日期且未签到）
const isExpired = day => {
  const currentDate = dayjs();
  const checkDate = dayjs()
    .year(currentYear.value)
    .month(currentMonth.value)
    .date(day);
  return checkDate.isBefore(currentDate, "day") && !isSignedIn(day);
};

// 检查是否是未来日期
const isFuture = day => {
  const currentDate = dayjs();
  const checkDate = dayjs()
    .year(currentYear.value)
    .month(currentMonth.value)
    .date(day);
  return checkDate.isAfter(currentDate, "day");
};

// 检查是否是今天
const isToday = day => {
  const today = dayjs();
  const checkDate = dayjs()
    .year(currentYear.value)
    .month(currentMonth.value)
    .date(day);
  return checkDate.format("YYYY-MM-DD") === today.format("YYYY-MM-DD");
};

// 检查今日是否可以签到
const canSignIn = computed(() => {
  // 检查今日是否已签到
  const today = dayjs().format("YYYY-MM-DD");
  if (signInRecords.value.includes(today)) {
    return false;
  }

  // 检查学习时间是否达到1小时
  return todayStudyTime.value >= 3600;
});

// 签到按钮文本
const signInButtonText = computed(() => {
  const today = dayjs().format("YYYY-MM-DD");
  if (signInRecords.value.includes(today)) {
    return "今日已签到";
  }

  if (todayStudyTime.value < 3600) {
    const minutes = Math.floor(todayStudyTime.value / 60);
    const seconds = todayStudyTime.value % 60;
    return `今日学习时间不足1小时（${minutes}分${seconds}秒）`;
  }

  return "立即签到";
});

// 签到奖励配置
const baseRewards = [
  { days: 1, points: 10 },
  { days: 5, points: 66 },
  { days: 15, points: 200 },
  { days: 25, points: 350 }
];

// 计算所有奖励（包括全勤奖励）
const rewards = computed(() => [
  ...baseRewards,
  { days: daysInMonth.value, points: 666 } // 全勤奖励
]);

// 已领取的奖励记录
const claimedRewards = ref([]);

// 从localStorage加载已领取的奖励记录
const loadClaimedRewards = () => {
  try {
    const claimed = localStorage.getItem("signInRewards");
    if (claimed) {
      claimedRewards.value = JSON.parse(claimed);
    }
  } catch (e) {
    console.error("加载奖励记录失败:", e);
  }
};

// 保存已领取的奖励记录
const saveClaimedRewards = () => {
  try {
    localStorage.setItem("signInRewards", JSON.stringify(claimedRewards.value));
  } catch (e) {
    console.error("保存奖励记录失败:", e);
  }
};

// 计算当前月份的签到天数
const currentSignInDays = computed(() => {
  const currentMonth = dayjs().format("YYYY-MM");
  return signInRecords.value.filter(date => date.startsWith(currentMonth))
    .length;
});

// 计算进度条百分比
const progressPercentage = computed(() => {
  return (currentSignInDays.value / daysInMonth.value) * 100;
});

// 检查奖励是否已领取
const isRewardClaimed = days => {
  const currentMonth = dayjs().format("YYYY-MM");
  return claimedRewards.value.some(
    reward => reward.month === currentMonth && reward.days === days
  );
};

// 领取奖励
const claimReward = reward => {
  const currentMonth = dayjs().format("YYYY-MM");

  // 检查是否达到领取条件
  if (currentSignInDays.value < reward.days) {
    ElMessage.warning(`需要签到${reward.days}天才能领取该奖励`);
    return;
  }

  // 检查是否已领取
  if (isRewardClaimed(reward.days)) {
    ElMessage.warning("该奖励已领取");
    return;
  }

  // 添加积分
  try {
    const timerData = JSON.parse(localStorage.getItem("timerData") || "{}");
    timerData.totalPoints = (timerData.totalPoints || 0) + reward.points;
    localStorage.setItem("timerData", JSON.stringify(timerData));

    // 记录奖励领取
    claimedRewards.value.push({
      month: currentMonth,
      days: reward.days,
      points: reward.points,
      claimedAt: new Date().getTime()
    });
    saveClaimedRewards();

    // 添加积分历史记录
    const history = JSON.parse(localStorage.getItem("pointsHistory") || "[]");
    history.unshift({
      type: "earn",
      points: reward.points,
      item: `${reward.days}天签到奖励`,
      timestamp: new Date().getTime()
    });
    localStorage.setItem("pointsHistory", JSON.stringify(history));

    ElMessage.success(`恭喜获得${reward.points}积分奖励！`);
  } catch (e) {
    console.error("领取奖励失败:", e);
    ElMessage.error("领取奖励失败，请重试");
  }
};

// 从localStorage加载签到记录
const loadSignInRecords = () => {
  try {
    const records = localStorage.getItem("signInRecords");
    if (records) {
      signInRecords.value = JSON.parse(records);
    }
  } catch (e) {
    console.error("加载签到记录失败:", e);
  }
};

// 保存签到记录到localStorage
const saveSignInRecords = () => {
  try {
    localStorage.setItem("signInRecords", JSON.stringify(signInRecords.value));
  } catch (e) {
    console.error("保存签到记录失败:", e);
  }
};

// 按天数排序的奖励列表
const sortedRewards = computed(() => {
  const allRewards = [
    ...baseRewards,
    { days: daysInMonth.value, points: 666 } // 全勤奖励
  ];
  return allRewards.sort((a, b) => a.days - b.days);
});

// 获取节点样式
const getNodeStyle = (reward, index) => {
  // 全勤奖励（最后一个节点）
  if (reward.days === daysInMonth.value) {
    return {
      left: "97%" // 固定在进度条最右侧
    };
  }

  // 25天奖励（倒数第二个节点）
  if (reward.days === 25) {
    return {
      left: "85%" // 固定25天奖励在85%的位置
    };
  }

  // 其他节点根据天数比例计算位置
  return {
    left: (reward.days / daysInMonth.value) * 80 + "%" // 压缩到80%范围内，给最后两个节点留出空间
  };
};

// 收起状态控制
const isCollapsed = ref(false);

// 从localStorage加载面板状态
const loadPanelState = () => {
  try {
    const savedState = localStorage.getItem("signInPanelState");
    if (savedState) {
      const state = JSON.parse(savedState);
      const today = dayjs().format("YYYY-MM-DD");

      // 如果是新的一天且未签到，展开面板
      if (state.lastDate !== today && !isTodaySigned.value) {
        isCollapsed.value = false;
        savePanelState(false);
        return;
      }

      // 如果是当天，使用保存的状态
      isCollapsed.value = state.isCollapsed;
    } else {
      // 如果没有保存的状态，根据签到状态决定是否展开
      isCollapsed.value = isTodaySigned.value;
      savePanelState(isTodaySigned.value);
    }
  } catch (e) {
    console.error("加载面板状态失败:", e);
    isCollapsed.value = true; // 默认收起
  }
};

// 保存面板状态到localStorage
const savePanelState = collapsed => {
  try {
    const state = {
      isCollapsed: collapsed,
      lastDate: dayjs().format("YYYY-MM-DD")
    };
    localStorage.setItem("signInPanelState", JSON.stringify(state));
  } catch (e) {
    console.error("保存面板状态失败:", e);
  }
};

// 切换收起/展开状态
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  savePanelState(isCollapsed.value);
};

// 检查今日是否已签到
const isTodaySigned = computed(() => {
  const today = dayjs().format("YYYY-MM-DD");
  return signInRecords.value.includes(today);
});

// 监听签到状态变化
watch(isTodaySigned, newValue => {
  if (newValue) {
    // 完成签到后自动收起
    isCollapsed.value = true;
    savePanelState(true);
  }
});

// 修改处理签到函数
const handleSignIn = async () => {
  if (!canSignIn.value) return;

  const today = dayjs().format("YYYY-MM-DD");
  signInRecords.value.push(today);
  saveSignInRecords();

  try {
    const timerData = JSON.parse(localStorage.getItem("timerData") || "{}");
    timerData.totalPoints = (timerData.totalPoints || 0) + 10;
    localStorage.setItem("timerData", JSON.stringify(timerData));

    const history = JSON.parse(localStorage.getItem("pointsHistory") || "[]");
    history.unshift({
      type: "earn",
      points: 10,
      item: "每日签到奖励",
      timestamp: new Date().getTime()
    });
    localStorage.setItem("pointsHistory", JSON.stringify(history));

    ElMessage.success("签到成功！获得10积分奖励");

    // 签到成功后延迟收起面板
    setTimeout(() => {
      isCollapsed.value = true;
      savePanelState(true);
    }, 1500); // 延迟1.5秒收起，让用户看到签到成功的提示
  } catch (e) {
    console.error("签到失败:", e);
    ElMessage.error("签到失败，请重试");
  }
};

// 获取补签卡数量
const makeupCards = computed(() => {
  try {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    return userData.makeupCards || 0;
  } catch (e) {
    console.error("获取补签卡数量失败:", e);
    return 0;
  }
});

// 处理补签
const handleMakeup = async day => {
  if (makeupCards.value <= 0) {
    ElMessage.warning("没有可用的补签卡");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要使用一张补签卡进行补签吗？\n剩余补签卡：${makeupCards.value}张`,
      "补签确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    // 扣除补签卡
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    userData.makeupCards = (userData.makeupCards || 0) - 1;
    localStorage.setItem("userData", JSON.stringify(userData));

    // 添加签到记录
    const makeupDate = dayjs()
      .year(currentYear.value)
      .month(currentMonth.value)
      .date(day)
      .format("YYYY-MM-DD");
    signInRecords.value.push(makeupDate);
    saveSignInRecords();

    // 添加积分
    const timerData = JSON.parse(localStorage.getItem("timerData") || "{}");
    timerData.totalPoints = (timerData.totalPoints || 0) + 10;
    localStorage.setItem("timerData", JSON.stringify(timerData));

    // 记录积分历史
    const history = JSON.parse(localStorage.getItem("pointsHistory") || "[]");
    history.unshift({
      type: "earn",
      points: 10,
      item: "补签奖励",
      timestamp: new Date().getTime()
    });
    localStorage.setItem("pointsHistory", JSON.stringify(history));

    ElMessage.success("补签成功！获得10积分奖励");
  } catch (e) {
    if (e !== "cancel") {
      console.error("补签失败:", e);
      ElMessage.error("补签失败，请重试");
    }
  }
};

// 添加点击外部关闭的处理函数
const handleClickOutside = () => {
  isCollapsed.value = true;
  savePanelState(true);
};

// 组件挂载时加载数据和状态
onMounted(() => {
  loadSignInRecords();
  loadClaimedRewards();
  loadPanelState();
});
</script>

<style scoped>
.monthly-signin {
  width: 463px;
  max-width: 100%;
  box-sizing: border-box;
  position: relative;
}

/* 收起状态的样式 */
.monthly-signin.collapsed {
  padding: 0;
  width: 463px;
  cursor: pointer;
  overflow: hidden;
  border-radius: 4px;
  transition: transform 0.3s ease;
}

.monthly-signin.collapsed:hover {
  transform: scale(1.01);
}

.signin-collapsed {
  background-color: #409eff;
  color: white;
  padding: 12px 0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  transition: background-color 0.3s ease;
  width: 100%;
  height: 46px;
  box-sizing: border-box;
  position: relative;
  z-index: 2;
}

.signin-collapsed:hover {
  background-color: #66b1ff;
}

.signin-collapsed::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #409eff;
  border-radius: 4px;
  z-index: -1;
  transition: background-color 0.3s ease;
}

.signin-collapsed:hover::before {
  background-color: #66b1ff;
}

.collapsed-text {
  margin: 0;
  white-space: nowrap;
  font-weight: 500;
}

/* 展开状态的样式 */
.signin-expanded {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: #ffffff;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  width: min(900px, 95vw);
  z-index: 1001;
  display: flex;
  flex-direction: column;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  width: 100%;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.calendar-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.3em;
  font-weight: 600;
}

.collapse-button {
  transform: rotate(-90deg);
}

.calendar-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  margin: 10px 0 20px;
  width: 100%;
  padding: 5px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 15px;
  cursor: default;
  transition: all 0.3s;
  border: 1px solid #eee;
  width: min(45px, 9vw);
  height: min(45px, 9vw);
  min-width: 32px;
  min-height: 32px;
  font-weight: 500;
}

.calendar-day.signed {
  background-color: #67c23a;
  color: white;
  border-color: #67c23a;
}

.calendar-day.expired {
  background-color: #f5f7fa;
  color: #909399;
  border-color: #ebeef5;
  cursor: pointer;
}

.calendar-day.expired:hover {
  background-color: #e4e7ed;
  transform: scale(1.05);
}

.calendar-day.future {
  background-color: white;
  color: #303133;
}

.calendar-day.today {
  background-color: #409eff;
  color: white;
  border-color: #409eff;
}

.calendar-day.today.signed {
  background-color: #67c23a;
  border-color: #67c23a;
}

.rewards-container {
  width: 100%;
  padding: 20px 0;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 15px 0;
}

.rewards-title {
  text-align: center;
  font-size: 17px;
  color: #303133;
  margin-bottom: 25px;
  font-weight: 500;
}

.rewards-progress {
  padding: 0 25px;
  margin: 25px 0;
}

.progress-bar {
  height: 12px;
  background-color: #e4e7ed;
  border-radius: 6px;
  position: relative;
  margin: 40px 0;
  overflow: visible;
  padding-right: 3%;
}

.progress-fill {
  height: 100%;
  background-color: #409eff;
  border-radius: 6px;
  transition: width 0.3s ease;
  max-width: 97%;
}

.reward-node {
  position: absolute;
  top: -35px;
  transform: translateX(-50%);
  cursor: pointer;
  z-index: 1;
}

.reward-icon {
  width: 42px;
  height: 42px;
  min-width: 42px;
  min-height: 42px;
  border-radius: 50%;
  background-color: #fff;
  border: 2px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #606266;
  transition: all 0.3s;
  padding: 2px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* New style for claimed reward icon */
.reward-node.claimed .reward-icon {
  background-color: #409eff; /* Blue background */
  border-color: #409eff; /* Blue border */
  color: white; /* White icon/text color for better contrast */
}

.reward-node.claimed .reward-icon .el-icon svg,
.reward-node.claimed .reward-icon span {
  color: white !important; /* Ensure text/icon inside is white */
}

.signin-footer {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.signin-button {
  min-width: 220px;
  height: 44px;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.signin-button:disabled {
  cursor: not-allowed;
}

/* 遮罩层样式 */
.overlay {
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
}
</style> 