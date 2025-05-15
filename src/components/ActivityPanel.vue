<template>
  <div class="activity-panel">
    <div class="activity-container">
      <el-popover
        placement="bottom-start"
        :width="400"
        trigger="click"
        popper-class="activity-popover"
        @show="handlePopoverShow"
      >
        <template #reference>
          <div class="calendar-icon">
            <el-icon size="24">
              <Calendar />
            </el-icon>
          </div>
        </template>

        <template #default>
          <div class="activity-content">
            <div class="header-with-refresh">
              <h3>本周活动</h3>
              <el-tooltip content="刷新本周活动" placement="top" :hide-after="2000">
                <el-button
                  type="primary"
                  :icon="Refresh"
                  circle
                  size="small"
                  @click="refreshActivities"
                  :loading="isRefreshing"
                />
              </el-tooltip>
            </div>
            <div class="week-buttons">
              <div
                v-for="day in 7"
                :key="day"
                class="day-button"
                :class="{
                  'has-activity': hasActivityOnDay(day - 1),
                  'selected': selectedDay === day - 1
                }"
                @click="selectDay(day - 1)"
              >{{ getDayLabel(day - 1) }}</div>
            </div>

            <div v-if="selectedDayActivities.length > 0" class="activity-list">
              <div
                v-for="(activity, index) in selectedDayActivities"
                :key="index"
                class="activity-item"
                :class="{ 'active': activity.isActive }"
              >
                <div class="activity-header">
                  <span class="activity-title">{{ activity.title }}</span>
                  <el-tag
                    size="small"
                    :type="activity.isActive ? 'success' : 'info'"
                  >{{ activity.isActive ? '进行中' : '未开始' }}</el-tag>
                </div>
                <template v-if="activity.type === 'WEEKEND_BOOST'">
                  <div
                    v-for="(timeRange, idx) in activity.timeRanges"
                    :key="idx"
                    class="boost-time-range"
                    :class="{ 'active': isTimeRangeActive(timeRange) }"
                  >
                    <div class="time-range-header">
                      <span class="time">{{ timeRange.start }} - {{ timeRange.end }}</span>
                      <span class="multiplier">{{ timeRange.multiplier }}倍积分</span>
                    </div>
                    <div class="time-range-status">{{ getTimeRangeStatus(timeRange) }}</div>
                  </div>
                </template>
                <template v-else>
                  <div class="activity-description">{{ activity.description }}</div>
                </template>
              </div>
            </div>
            <div v-else class="no-activity">该日期暂无活动</div>
          </div>
        </template>
      </el-popover>

      <!-- 今日活动信息展示 -->
      <div v-if="todayActivities.length > 0" class="today-activities">
        <div
          v-for="(activity, index) in todayActivities"
          :key="index"
          class="today-activity-item"
          :class="{ 'active': activity.isActive }"
        >
          <div class="activity-info">
            <span class="activity-title">{{ activity.title }}</span>
            <el-tag
              size="small"
              :type="activity.isActive ? 'success' : 'info'"
            >{{ activity.isActive ? '进行中' : '未开始' }}</el-tag>
          </div>
          <template v-if="activity.type === ActivityType.WEEKEND_BOOST">
            <div
              v-for="(timeRange, idx) in activity.timeRanges"
              :key="idx"
              class="today-time-range"
              :class="{ 'active': isTimeRangeActive(timeRange) }"
            >{{ timeRange.start }}-{{ timeRange.end }} ({{ timeRange.multiplier }}倍)</div>
          </template>
          <div v-else class="activity-desc">{{ activity.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Calendar, Refresh } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
import localeData from "dayjs/plugin/localeData";
import { ElMessage } from "element-plus";
import { useRouter } from "vue-router";

// 配置 dayjs
dayjs.extend(weekday);
dayjs.extend(localeData);

// 设置周一为一周的第一天
dayjs.locale({
  name: "zh-cn",
  weekStart: 1
});

// 活动类型枚举
const ActivityType = {
  SHOP_DISCOUNT: "SHOP_DISCOUNT",
  POINTS_BOOST: "POINTS_BOOST",
  WEEKEND_BOOST: "WEEKEND_BOOST"
};

// 获取本周的随机活动
const generateWeeklyActivities = () => {
  const activities = [];
  const now = dayjs();
  const weekStart = now.startOf("week"); // 现在会从周一开始

  // 商城大促（随机一天）
  activities.push({
    type: ActivityType.SHOP_DISCOUNT,
    title: "商城大促",
    description: "本日所有物品8折出售",
    date: weekStart
      .add(Math.floor(Math.random() * 7), "day")
      .format("YYYY-MM-DD"),
    isAllDay: true
  });

  // 学无止境（随机一天）
  activities.push({
    type: ActivityType.POINTS_BOOST,
    title: "学无止境",
    description: "本日获取积分比例为1.2",
    date: weekStart
      .add(Math.floor(Math.random() * 7), "day")
      .format("YYYY-MM-DD"),
    isAllDay: true
  });

  // 精进不休（固定周日）
  activities.push({
    type: ActivityType.WEEKEND_BOOST,
    title: "精进不休",
    description: "特定时段积分翻倍",
    date: weekStart.add(6, "day").format("YYYY-MM-DD"), // 周日
    timeRanges: [
      { start: "06:00", end: "08:00", multiplier: 2 },
      { start: "08:00", end: "11:00", multiplier: 1.5 }
    ]
  });

  return activities;
};

// 检查并更新每周活动
const checkAndUpdateWeeklyActivities = () => {
  const lastUpdate = localStorage.getItem("lastActivityUpdate");
  const now = dayjs();

  if (!lastUpdate || now.startOf("week").isAfter(dayjs(lastUpdate))) {
    const newActivities = generateWeeklyActivities();
    localStorage.setItem("weeklyActivities", JSON.stringify(newActivities));
    localStorage.setItem("lastActivityUpdate", now.format());
    return newActivities;
  }

  return JSON.parse(localStorage.getItem("weeklyActivities") || "[]");
};

// 获取当前活动状态
const currentActivities = computed(() => {
  const now = dayjs();
  return weeklyActivities.value.map(activity => {
    const activityDate = dayjs(activity.date);
    const isToday = now.format("YYYY-MM-DD") === activity.date;
    const isThisWeek = activityDate.isSame(now, "week");
    let isActive = false;
    let timeRange = "";

    if (activity.type === ActivityType.WEEKEND_BOOST && isToday && isThisWeek) {
      const timeRanges = activity.timeRanges
        .map(range => `${range.start}-${range.end} (${range.multiplier}倍)`)
        .join("\n");
      timeRange = timeRanges;

      isActive = activity.timeRanges.some(range => {
        const start = dayjs(`${activity.date} ${range.start}`);
        const end = dayjs(`${activity.date} ${range.end}`);
        return now.isAfter(start) && now.isBefore(end);
      });
    } else {
      isActive = isToday;
    }

    return {
      ...activity,
      isActive,
      timeRange
    };
  });
});

// 检查某天是否有活动
const hasActivityOnDay = dayIndex => {
  const weekStart = dayjs().startOf("week");
  const targetDate = weekStart.add(dayIndex, "day").format("YYYY-MM-DD");
  return weeklyActivities.value.some(activity => activity.date === targetDate);
};

// 是否有活动正在进行
const hasActiveEvents = computed(() => {
  const now = dayjs();
  const today = now.format("YYYY-MM-DD");

  return weeklyActivities.value.some(activity => {
    if (activity.date !== today) return false;

    if (activity.type === ActivityType.WEEKEND_BOOST) {
      return activity.timeRanges.some(range => {
        const start = dayjs(`${activity.date} ${range.start}`);
        const end = dayjs(`${activity.date} ${range.end}`);
        return now.isAfter(start) && now.isBefore(end);
      });
    }

    return true;
  });
});

// 获取当前积分倍率
const getCurrentMultiplier = () => {
  const now = dayjs();
  let multiplier = 1;

  for (const activity of weeklyActivities.value) {
    const activityDate = dayjs(activity.date);
    const isToday = now.isSame(activityDate, "day");
    const isThisWeek = activityDate.isSame(now, "week");

    if (!isToday || !isThisWeek) continue;

    if (activity.type === ActivityType.POINTS_BOOST) {
      multiplier *= 1.2;
    } else if (activity.type === ActivityType.WEEKEND_BOOST) {
      for (const range of activity.timeRanges) {
        const start = dayjs(now.format("YYYY-MM-DD ") + range.start);
        const end = dayjs(now.format("YYYY-MM-DD ") + range.end);
        if (now.isAfter(start) && now.isBefore(end)) {
          multiplier *= range.multiplier;
          break;
        }
      }
    }
  }

  return multiplier;
};

// 初始化活动数据
const weeklyActivities = ref([]);
onMounted(() => {
  weeklyActivities.value = checkAndUpdateWeeklyActivities();
});

// 选中的日期（0-6，对应周一到周日）
const selectedDay = ref(0);

// 处理弹出框显示事件
const handlePopoverShow = () => {
  // 获取当前是周几（1-7，对应周一到周日）
  const today = dayjs().day() || 7;
  // 转换为我们的格式（0-6是周一到周日）
  selectedDay.value = today - 1;
};

// 获取日期标签
const getDayLabel = dayIndex => {
  return `周${dayIndex === 6 ? "日" : dayIndex + 1}`;
};

// 选择日期
const selectDay = dayIndex => {
  selectedDay.value = dayIndex;
};

// 获取选中日期的活动
const selectedDayActivities = computed(() => {
  const weekStart = dayjs().startOf("week");
  const targetDate = weekStart.add(selectedDay.value, "day");

  return currentActivities.value.filter(activity =>
    dayjs(activity.date).isSame(targetDate, "day")
  );
});

// 检查时间段是否激活
const isTimeRangeActive = timeRange => {
  const now = dayjs();
  const start = dayjs(now.format("YYYY-MM-DD ") + timeRange.start);
  const end = dayjs(now.format("YYYY-MM-DD ") + timeRange.end);
  return now.isAfter(start) && now.isBefore(end);
};

// 获取时间段状态
const getTimeRangeStatus = timeRange => {
  const now = dayjs();
  const start = dayjs(now.format("YYYY-MM-DD ") + timeRange.start);
  const end = dayjs(now.format("YYYY-MM-DD ") + timeRange.end);

  if (now.isBefore(start)) {
    return `距离开始还有 ${now.to(start)}`;
  } else if (now.isAfter(end)) {
    return "已结束";
  } else {
    return "进行中";
  }
};

// 刷新状态
const isRefreshing = ref(false);

// 刷新活动
const refreshActivities = async () => {
  isRefreshing.value = true;

  try {
    // 模拟网络请求延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 生成新的活动
    const newActivities = generateWeeklyActivities();
    weeklyActivities.value = newActivities;

    // 更新存储
    localStorage.setItem("weeklyActivities", JSON.stringify(newActivities));
    localStorage.setItem("lastActivityUpdate", dayjs().format());

    ElMessage({
      type: "success",
      message: "活动已刷新",
      duration: 2000
    });
  } catch (error) {
    ElMessage({
      type: "error",
      message: "刷新失败，请重试",
      duration: 2000
    });
  } finally {
    isRefreshing.value = false;
  }
};

// 获取今天的活动数量
const todayActivitiesCount = computed(() => {
  const today = dayjs().format("YYYY-MM-DD");
  return weeklyActivities.value.filter(activity => activity.date === today)
    .length;
});

// 获取今天的活动
const todayActivities = computed(() => {
  const today = dayjs().format("YYYY-MM-DD");
  return currentActivities.value.filter(activity => activity.date === today);
});

// 导出给父组件使用的方法
defineExpose({
  getCurrentMultiplier
});
</script>

<style scoped>
.activity-container {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.calendar-icon {
  cursor: pointer;
  padding: 8px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.calendar-icon:hover {
  transform: scale(1.05);
}

.today-activities {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 12px;
  min-width: 200px;
}

.today-activity-item {
  padding: 8px;
  border-radius: 6px;
  background: #f5f7fa;
  transition: all 0.3s;
}

.today-activity-item + .today-activity-item {
  margin-top: 8px;
}

.today-activity-item.active {
  background: #f0f9eb;
}

.activity-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.activity-title {
  font-weight: bold;
  color: #303133;
  margin-right: 8px;
}

.activity-desc {
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
}

.today-time-range {
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
  padding: 4px 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.today-time-range.active {
  color: #67c23a;
  background: #f0f9eb;
}

.activity-content {
  padding: 20px;
  user-select: none; /* 防止文本被选中 */
  outline: none; /* 移除焦点轮廓 */
}

.header-with-refresh {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-with-refresh h3 {
  margin: 0;
  text-align: center;
  color: #303133;
  font-size: 18px;
}

.week-buttons {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 8px;
}

.day-button {
  flex: 1;
  padding: 8px 0;
  text-align: center;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  color: #606266;
  user-select: none; /* 防止文本被选中 */
  outline: none; /* 移除焦点轮廓 */
}

.day-button:focus {
  outline: none; /* 移除焦点轮廓 */
}

.day-button:hover {
  border-color: #409eff;
  color: #409eff;
}

.day-button.has-activity {
  background: #67c23a;
  border-color: #67c23a;
  color: #fff;
}

.day-button.selected {
  border-color: #409eff;
  background-color: #ecf5ff;
  color: #409eff;
}

.day-button.has-activity.selected {
  background: #85ce61;
  border-color: #85ce61;
  color: #fff;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  padding: 12px;
  border-radius: 8px;
  background: #f5f7fa;
  transition: background-color 0.3s;
}

.activity-item.active {
  background: #ecf5ff;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.activity-title {
  font-weight: bold;
  color: #303133;
}

.activity-time {
  font-size: 0.9em;
  color: #606266;
  margin: 4px 0;
  white-space: pre-line;
}

.activity-description {
  font-size: 0.9em;
  color: #606266;
}

.no-activity {
  text-align: center;
  color: #909399;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.boost-time-range {
  margin: 8px 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  transition: all 0.3s;
}

.boost-time-range.active {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
}

.time-range-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.time-range-header .time {
  font-weight: bold;
  color: #303133;
}

.time-range-header .multiplier {
  color: #67c23a;
  font-weight: bold;
}

.time-range-status {
  font-size: 0.9em;
  color: #909399;
}

.boost-time-range.active .time-range-status {
  color: #67c23a;
}
</style> 