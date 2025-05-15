<template>
  <div class="character-container" :class="{ 'minimized': isMinimized }">
    <!-- 好感度提示 -->
    <div v-if="showFavorTip" class="favor-tip">
      <div class="cloud-dialog">{{ currentDialogText }}</div>
      <div class="favor-value">好感度: {{ favorLevel }}</div>
    </div>

    <!-- 人物图片区域 -->
    <div
      class="character-image"
      @click="handleCharacterClick"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <img :src="currentOutfit" alt="character" />

      <!-- 爱心动画容器 -->
      <div class="hearts-container">
        <transition-group name="heart">
          <div
            v-for="heart in hearts"
            :key="heart.id"
            class="heart"
            :style="{ left: heart.x + 'px', top: heart.y + 'px' }"
          >❤️</div>
        </transition-group>
      </div>
    </div>

    <!-- 功能按钮组 -->
    <div class="action-buttons" v-if="!isMinimized">
      <div class="button-group">
        <el-button type="primary" circle @click="showDialog">
          <el-icon class="chat-line-round">
            <ChatLineRound />
          </el-icon>
        </el-button>
        <el-button type="warning" circle @click="showOutfitSelect">
          <el-icon>
            <SwitchButton />
          </el-icon>
        </el-button>
        <el-button type="success" circle @click="showGiftSelect">
          <el-icon>
            <Present />
          </el-icon>
        </el-button>
        <el-button type="info" circle @click="toggleMinimize">
          <el-icon>
            <Hide />
          </el-icon>
        </el-button>
      </div>
    </div>
    <div class="expand-button" v-else @click="toggleMinimize">
      <el-icon>
        <Expand />
      </el-icon>
    </div>

    <!-- 换装对话框 -->
    <el-dialog v-model="outfitDialogVisible" title="更换装扮" width="50%">
      <div class="outfit-grid">
        <div
          v-for="outfit in ownedOutfits"
          :key="outfit.id"
          class="outfit-item"
          :class="{
            'active': outfit.image === currentOutfit && !outfit.isLocked,
            'locked': outfit.isLocked
          }"
          @click="outfit.isLocked ? showLockedOutfitMessage() : changeOutfit(outfit.image, outfit.isLocked)"
          :title="outfit.isLocked ? '请先到商店购买此服装' : outfit.name"
        >
          <img :src="outfit.image" :alt="outfit.name" />
          <div class="outfit-name">{{ outfit.name }}</div>
          <div v-if="outfit.isLocked" class="locked-overlay">
            <el-icon>
              <Lock />
            </el-icon>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 送礼对话框 -->
    <el-dialog v-model="giftDialogVisible" title="赠送礼物" width="50%">
      <div class="gift-grid">
        <div
          v-for="gift in ownedGifts"
          :key="gift.id"
          class="gift-item"
          :class="{ 'disabled': gift.count <= 0 }"
          @click="gift.count > 0 ? giveGift(gift) : showGiftEmptyTip()"
        >
          <img :src="gift.image" :alt="gift.name" />
          <div class="gift-name">{{ gift.name }}</div>
          <div class="gift-favor">剩余：{{ gift.count }} 个</div>
          <div v-if="isFavoriteGift(gift.id)" class="favorite-gift-tip">今日最喜爱</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import {
  Expand,
  ChatLineRound,
  SwitchButton,
  Present,
  Hide,
  Lock
} from "@element-plus/icons-vue";
import dayjs from "dayjs";
import path from "path";
import fs from "fs";
import { app, nativeImage } from "@electron/remote";
import { ipcRenderer } from "electron";

// 获取图片路径的函数
const getImagePath = imageRelativePath => {
  if (process.env.NODE_ENV === "development") {
    try {
      return require("../../image/" + imageRelativePath);
    } catch (e) {
      console.error(
        `Error requiring image in dev: ../../image/${imageRelativePath}`,
        e
      );
      return "";
    }
  } else {
    try {
      const imagePath = path.join(
        process.resourcesPath,
        "image",
        imageRelativePath
      );
      if (fs.existsSync(imagePath)) {
        const image = nativeImage.createFromPath(imagePath);
        return image.toDataURL();
      } else {
        console.error(
          "Character model image file not found in production:",
          imagePath
        );
        return "";
      }
    } catch (error) {
      console.error(
        "Error loading character model image in production:",
        error
      );
      return "";
    }
  }
};

// 状态变量
const isMinimized = ref(false);
const showFavorTip = ref(false);
const outfitDialogVisible = ref(false);
const giftDialogVisible = ref(false);
const favorLevel = ref(0);
const currentOutfit = ref(
  getImagePath("xiaolei-model/role_xiaolei_xiaofu.png")
);
const hearts = ref([]);
const nextHeartId = ref(0);
const outfitDataVersion = ref(0);
const purchasedGiftsVersion = ref(0); // Forcing reactivity for ownedGifts
const isGiftInteractionActive = ref(false); // To prevent hover interference

// 对话文本库
const dialogTexts = {
  low: [
    "开始学习吧！",
    "你在看什么？",
    "呜...不要一直看我啦...",
    "现在，立刻，马上进入学习状态！",
    "周末不要忘记来赴约哦。"
  ],
  medium: [
    "见到你真高兴！",
    "要一起去学习吗？",
    "今天过得怎么样？",
    "你最近在忙什么呢？",
    "要不要一起去图书馆？"
  ],
  high: [
    "等你很久了！",
    "今天也要加油哦！",
    "有你在真是太好了~",
    "一起努力吧！",
    "你总是能让我充满动力呢！"
  ],
  touch: {
    low: [
      "哎？怎么了？",
      "呜...不要一直戳我啦...",
      "不要再戳了...",
      "再戳我就要生气了！",
      "我...我要躲起来了！"
    ],
    medium: [
      "啊...痒痒的~",
      "轻点啦~",
      "你在干什么呀？",
      "不要乱摸啦！",
      "真是的...太顽皮了~"
    ],
    high: [
      "喜欢摸摸我吗？",
      "你好温柔呢~",
      "这样很舒服呢~",
      "再摸摸我吧~",
      "可以也让我摸摸你吗~"
    ]
  }
};

// 当前显示的对话文本
const currentDialogText = ref("");

// 获取当前对话文本
const getDialogText = (isTouch = false) => {
  if (isTouch) {
    // 触摸相关对话
    if (favorLevel.value < 120) {
      if (
        clickCount.value > 0 &&
        clickCount.value <= dialogTexts.touch.low.length
      ) {
        return dialogTexts.touch.low[clickCount.value - 1];
      }
      return dialogTexts.touch.low[0];
    } else if (favorLevel.value < 240) {
      return dialogTexts.touch.medium[
        Math.floor(Math.random() * dialogTexts.touch.medium.length)
      ];
    } else {
      return dialogTexts.touch.high[
        Math.floor(Math.random() * dialogTexts.touch.high.length)
      ];
    }
  } else {
    // 普通对话
    if (favorLevel.value < 120) {
      // 低好感度时随机选择一条对话
      return dialogTexts.low[
        Math.floor(Math.random() * dialogTexts.low.length)
      ];
    } else if (favorLevel.value < 240) {
      return dialogTexts.medium[
        Math.floor(Math.random() * dialogTexts.medium.length)
      ];
    } else {
      return dialogTexts.high[
        Math.floor(Math.random() * dialogTexts.high.length)
      ];
    }
  }
};

// 1. 更新 baseCharacterOutfits 定义
const baseCharacterOutfits = [
  {
    id: 0,
    name: "小学校服",
    modelImagePath: "xiaolei-model/role_xiaolei_xiaofu.png"
  }, // 新增的小学校服，没有 shopId，将特殊处理
  {
    id: 1,
    name: "小学常服",
    modelImagePath: "xiaolei-model/role_xiaolei.png",
    shopId: 6
  },
  {
    id: 2,
    name: "中学校服",
    modelImagePath: "xiaolei-model/role_xiaolei2_xiaofu.png",
    shopId: 7
  },
  {
    id: 3,
    name: "中学常服",
    modelImagePath: "xiaolei-model/role_xiaolei2.png",
    shopId: 8
  },
  {
    id: 4,
    name: "礼服",
    modelImagePath: "xiaolei-model/role_xiaolei2_oufeng.png",
    shopId: 9
  },
  {
    id: 5,
    name: "眼镜装",
    modelImagePath: "xiaolei-model/role_xiaolei2_yanjing.png",
    shopId: 10
  },
  {
    id: 6,
    name: "制服",
    modelImagePath: "xiaolei-model/role_xiaolei2_zhifu.png",
    shopId: 11
  }
];

const forceOutfitRefresh = () => {
  outfitDataVersion.value++;
};

// 2. 修改 ownedOutfits 计算属性
const ownedOutfits = computed(() => {
  const _version = outfitDataVersion.value; // 依赖响应式触发器
  let purchasedShopOutfitIds = [];
  try {
    const purchasedData = JSON.parse(
      localStorage.getItem("purchasedOutfits") || "[]"
    );
    purchasedShopOutfitIds = purchasedData.map(item => item.id);
  } catch (e) {
    console.error(
      "Error reading purchasedOutfits from localStorage for CharacterDisplay:",
      e
    );
  }

  return baseCharacterOutfits.map(baseOutfit => {
    let isPurchased = false;
    // 特殊处理小学校服 (id: 0)，使其默认解锁
    if (baseOutfit.id === 0) {
      isPurchased = true;
    } else if (baseOutfit.shopId) {
      // 其他有 shopId 的服装检查购买状态
      isPurchased = purchasedShopOutfitIds.includes(baseOutfit.shopId);
    } else {
      // 如果有其他没有 shopId 且 id 不为 0 的基础服装，它们将默认是锁定的
      // 除非您希望它们也默认解锁，那么这里可以设置为 isPurchased = true;
      isPurchased = false;
    }

    return {
      ...baseOutfit,
      image: getImagePath(baseOutfit.modelImagePath),
      isLocked: !isPurchased
    };
  });
});

// ownedGifts返回带count
const ownedGifts = computed(() => {
  const _version = purchasedGiftsVersion.value; // Depend on this ref
  return JSON.parse(localStorage.getItem("purchasedGifts") || "[]");
});

// 检查今日点击次数
const checkDailyClicks = () => {
  const today = dayjs().format("YYYY-MM-DD");
  const clickData = JSON.parse(
    localStorage.getItem("characterClickData") || "{}"
  );

  if (clickData.date !== today) {
    clickData.date = today;
    clickData.clicks = 0;
  }

  if (clickData.clicks < 3) {
    clickData.clicks++;
    localStorage.setItem("characterClickData", JSON.stringify(clickData));
    return true;
  }

  return false;
};

// 创建爱心动画
const createHeart = (x, y) => {
  const heart = {
    id: nextHeartId.value++,
    x,
    y
  };
  hearts.value.push(heart);
  setTimeout(() => {
    hearts.value = hearts.value.filter(h => h.id !== heart.id);
  }, 1000);
};

// 增加好感度
const increaseFavor = (amount = 1, showHearts = true) => {
  favorLevel.value += amount;
  localStorage.setItem("characterFavor", favorLevel.value.toString());

  if (showHearts) {
    // 创建多个爱心动画
    for (let i = 0; i < 3; i++) {
      const randomX = Math.random() * 100 - 50;
      const randomY = Math.random() * 50;
      createHeart(randomX, randomY);
    }
  }
};

// 点击相关状态
const clickCount = ref(0);
const clickTimer = ref(null);
const clickStartTime = ref(null);

// 处理点击事件
const handleCharacterClick = () => {
  // 检查是否是低好感度状态
  if (favorLevel.value < 120) {
    const now = Date.now();

    // 如果是第一次点击或者超过10秒，重置计数器
    if (!clickStartTime.value || now - clickStartTime.value > 10000) {
      clickCount.value = 1;
      clickStartTime.value = now;

      // 设置10秒后重置的定时器
      if (clickTimer.value) {
        clearTimeout(clickTimer.value);
      }
      clickTimer.value = setTimeout(() => {
        clickCount.value = 0;
        clickStartTime.value = null;
      }, 10000);
    } else {
      // 在10秒内的后续点击
      clickCount.value++;

      // 如果10秒内点击达到5次
      if (clickCount.value >= 5) {
        currentDialogText.value =
          dialogTexts.touch.low[dialogTexts.touch.low.length - 1];
        showFavorTip.value = true;
        setTimeout(() => {
          ElMessage({
            message: "小蕾伤心地躲起来了...",
            type: "warning",
            duration: 3000
          });
          isMinimized.value = true;
          clickCount.value = 0;
          clickStartTime.value = null;
          showFavorTip.value = false;
        }, 2000);
        if (clickTimer.value) {
          clearTimeout(clickTimer.value);
          clickTimer.value = null;
        }
        return;
      }
    }

    // 更新对话文本
    currentDialogText.value = getDialogText(true);
    showFavorTip.value = true;
  } else {
    // 正常的点击处理逻辑
    if (checkDailyClicks()) {
      increaseFavor(1);
      currentDialogText.value = getDialogText(true);
      showFavorTip.value = true;
    } else {
      // 当超过每日点击次数限制时，也显示对话但不增加好感度
      currentDialogText.value = getDialogText(true);
      //showFavorTip.value = true;
      /* ElMessage({
        message: "今天的互动次数已经用完啦，明天再来吧！",
        type: "info",
        duration: 3000
      }); */
    }
  }
};

// 处理鼠标进入事件
const handleMouseEnter = () => {
  if (isGiftInteractionActive.value) return; // Skip if gift message is active
  // 每次鼠标进入时强制更新对话文本
  currentDialogText.value = getDialogText(false);
  showFavorTip.value = true;
};

// 处理鼠标离开事件
const handleMouseLeave = () => {
  if (isGiftInteractionActive.value) return; // Skip if gift message is active
  showFavorTip.value = false;
};

// 组件卸载时清理定时器
onUnmounted(() => {
  if (clickTimer.value) {
    clearTimeout(clickTimer.value);
    clickTimer.value = null;
  }
});

// 显示对话
const showDialog = () => {
  currentDialogText.value = getDialogText(false);
  showFavorTip.value = true;
  setTimeout(() => {
    showFavorTip.value = false;
  }, 3000);
};

// 显示换装选择
const showOutfitSelect = () => {
  outfitDialogVisible.value = true;
};

// 更换装扮
const changeOutfit = (outfitImage, isLocked) => {
  if (isLocked) {
    ElMessage.info("请先到商店购买此服装哦！");
    return;
  }
  currentOutfit.value = outfitImage;
  localStorage.setItem("currentOutfit", outfitImage);
  outfitDialogVisible.value = false;
};

// 显示礼物选择
const showGiftSelect = () => {
  console.log("Owned Gifts:", ownedGifts.value); // 调试日志
  giftDialogVisible.value = true;
};

// 最喜爱礼物机制，每天刷新
function refreshFavoriteGift() {
  const today = dayjs().format("YYYY-MM-DD");
  let favoriteGift = JSON.parse(localStorage.getItem("favoriteGift") || "{}");
  if (favoriteGift.date !== today) {
    const gifts = ownedGifts.value;
    if (gifts.length > 0) {
      const randomGift = gifts[Math.floor(Math.random() * gifts.length)];
      favoriteGift = { id: randomGift.id, date: today };
      localStorage.setItem("favoriteGift", JSON.stringify(favoriteGift));
    }
  }
  return favoriteGift;
}
const favoriteGift = ref(refreshFavoriteGift());
function isFavoriteGift(id) {
  return favoriteGift.value && favoriteGift.value.id === id;
}

// 赠送礼物逻辑完善
const giveGift = gift => {
  if (gift.count <= 0) {
    showGiftEmptyTip();
    return;
  }
  // 判断最喜爱礼物
  const isFav = isFavoriteGift(gift.id);
  // 修改本地数据
  const purchasedGifts = JSON.parse(
    localStorage.getItem("purchasedGifts") || "[]"
  );
  const idx = purchasedGifts.findIndex(g => g.id === gift.id);
  if (idx !== -1 && purchasedGifts[idx].count > 0) {
    purchasedGifts[idx].count -= 1;
    localStorage.setItem("purchasedGifts", JSON.stringify(purchasedGifts));
    purchasedGiftsVersion.value++; // Increment to trigger re-computation
  } else {
    // Fallback or error if gift not found or count already zero, though we check gift.count earlier.
    // This path should ideally not be hit if gift.count > 0 check passes.
    console.warn(
      "Gift not found in purchasedGifts or count issue during update."
    );
    return;
  }
  // 增加好感度
  increaseFavor(isFav ? 3 : 1);
  // 弹出对话
  const dialog = getGiftDialogText(isFav);
  currentDialogText.value = dialog;
  showFavorTip.value = true;
  isGiftInteractionActive.value = true; // Set flag
  setTimeout(() => {
    showFavorTip.value = false;
    isGiftInteractionActive.value = false; // Reset flag
  }, 2500);
  ElMessage.success(`送出礼物: ${gift.name}，好感度 +${isFav ? 3 : 1}`);
  giftDialogVisible.value = false;
};
function showGiftEmptyTip() {
  ElMessage.warning("该礼物已用完，无法赠送");
}

// 赠礼对话库
const giftDialogTexts = {
  low: [
    "谢谢你...虽然有点突然...",
    "你为什么要送我这个？",
    "呜...其实不用特意送礼物的...",
    "我会收下的...谢谢..."
  ],
  medium: [
    "哇，谢谢你的礼物！",
    "你总是这么贴心~",
    "今天心情变好了！",
    "收到你的礼物好开心！"
  ],
  high: [
    "你送的礼物我很喜欢！",
    "有你真好~",
    "谢谢你一直陪着我~",
    "我会一直珍惜你的礼物的！"
  ],
  favorite: "这是我最喜欢的礼物！你怎么知道的？"
};
function getGiftDialogText(isFavorite) {
  if (isFavorite) return giftDialogTexts.favorite;
  if (favorLevel.value < 120) {
    return giftDialogTexts.low[
      Math.floor(Math.random() * giftDialogTexts.low.length)
    ];
  } else if (favorLevel.value < 240) {
    return giftDialogTexts.medium[
      Math.floor(Math.random() * giftDialogTexts.medium.length)
    ];
  } else {
    return giftDialogTexts.high[
      Math.floor(Math.random() * giftDialogTexts.high.length)
    ];
  }
}

// 切换最小化状态
const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value;
};

// 组件挂载时
onMounted(() => {
  forceOutfitRefresh(); // 初始加载时刷新一次
  favoriteGift.value = refreshFavoriteGift(); // Initialize favorite gift

  ipcRenderer.on("refresh-character-outfits", () => {
    forceOutfitRefresh();
  });

  // Listen for gift updates
  ipcRenderer.on("purchased-gifts-updated", () => {
    purchasedGiftsVersion.value++;
  });
  ipcRenderer.on("purchased-outfits-updated", () => {
    // Also listen for outfit updates from shop if needed
    forceOutfitRefresh();
  });

  // 加载好感度和当前服装 (这部分逻辑可以保留)
  favorLevel.value = parseInt(localStorage.getItem("characterFavor") || "0");
  const savedOutfit = localStorage.getItem("currentOutfit");
  if (savedOutfit) {
    currentOutfit.value = savedOutfit;
  } else {
    const firstAvailable = ownedOutfits.value.find(o => !o.isLocked);
    if (firstAvailable) {
      currentOutfit.value = firstAvailable.image;
    } else {
      currentOutfit.value = getImagePath(
        baseCharacterOutfits[0].modelImagePath
      );
    }
  }
});

// 组件卸载时
onUnmounted(() => {
  ipcRenderer.removeAllListeners("refresh-character-outfits");
  ipcRenderer.removeAllListeners("purchased-gifts-updated"); // Clean up listener
  ipcRenderer.removeAllListeners("purchased-outfits-updated");
  // 移除之前可能添加的其他 window 监听器
});

// In a real app with complex routing/keep-alive, would also use onActivated with forceOutfitRefresh().

// 修改好感度（用于测试）
const changeFavor = amount => {
  // 确保好感度不会小于0
  const newFavor = Math.max(0, favorLevel.value + amount);
  favorLevel.value = newFavor;
  localStorage.setItem("characterFavor", newFavor.toString());

  // 显示提示信息
  ElMessage({
    message: `好感度${amount > 0 ? "增加" : "减少"}了${Math.abs(amount)}点`,
    type: amount > 0 ? "success" : "warning",
    duration: 2000
  });

  // 更新对话显示
  currentDialogText.value = getDialogText(false);
  showFavorTip.value = true;
  setTimeout(() => {
    showFavorTip.value = false;
  }, 2000);
};

const showLockedOutfitMessage = () => {
  ElMessage.info("请先到商店购买此服装！");
};
</script>

<style scoped>
.character-container {
  position: fixed;
  left: 20px;
  bottom: 20px;
  border-radius: 12px;
  padding: 15px;
  transition: all 0.3s ease;
  z-index: 100;
}

.character-container.minimized {
  width: 40px;
  height: 40px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.character-image {
  width: 200px;
  height: 300px;
  position: relative;
  cursor: pointer;
}

.character-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.action-buttons {
  position: absolute;
  right: -40px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.button-group .el-button {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: unset;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

/* 特别处理对话按钮 - 第一个按钮 */
.button-group .el-button:first-child {
  margin-left: 12px; /* 可以通过调整这个值来微调按钮的水平位置 */
}

.button-group .el-button :deep(.el-icon) {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.button-group .el-button:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* 调整图标大小 */
.button-group .el-button :deep(i) {
  font-size: 20px;
}

.expand-button {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.favor-tip {
  position: absolute;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  min-width: 150px;
}

.cloud-dialog {
  background: white;
  padding: 10px 15px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 8px;
  position: relative;
  white-space: nowrap;
}

.cloud-dialog::after {
  content: "";
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}

.favor-value {
  color: #ff69b4;
  font-weight: bold;
}

.hearts-container {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.heart {
  position: absolute;
  font-size: 20px;
  color: #ff69b4;
  transition: all 1s ease;
}

.heart-enter-active {
  animation: float-up 1s ease-out forwards;
}

.heart-leave-active {
  animation: fade-out 0.3s ease-out forwards;
}

@keyframes float-up {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) scale(1.5);
    opacity: 0;
  }
}

@keyframes fade-out {
  to {
    opacity: 0;
  }
}

.outfit-grid,
.gift-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  padding: 15px;
}

.outfit-item,
.gift-item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.outfit-item:hover,
.gift-item:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.outfit-item.active {
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.1);
}

.outfit-item img,
.gift-item img {
  width: 100px;
  height: 100px;
  object-fit: contain;
  margin-bottom: 8px;
}

.outfit-name,
.gift-name {
  font-size: 14px;
  margin-bottom: 4px;
}

.gift-favor {
  color: #ff69b4;
  font-size: 12px;
}

.test-buttons {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.test-buttons .el-button {
  width: 80px;
  height: 32px;
  font-size: 12px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.test-buttons .el-button:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
</style> 