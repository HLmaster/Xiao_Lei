<template>
  <div class="shop-container">
    <!-- 返回按钮 -->
    <div class="back-button-container">
      <el-button type="primary" size="large" round @click="goBack" class="back-button">
        <el-icon>
          <ArrowLeft />
        </el-icon>返回首页
      </el-button>
    </div>

    <!-- 当前积分显示 -->
    <div class="current-points-display">
      <div class="points-card">
        <div class="points-title">当前积分</div>
        <div class="points-value">{{ Math.floor(currentPoints * 100) / 100 }}</div>
        <el-button
          type="primary"
          size="small"
          class="points-history-btn"
          @click="goToPointsHistory"
        >查看明细</el-button>
      </div>
    </div>

    <!-- 测试工具栏 -->
    <div class="test-toolbar">
      <el-button
        type="warning"
        size="small"
        @click="refreshDiscounts"
        :disabled="refreshCards <= 0"
      >刷新折扣 (x{{ refreshCards }})</el-button>
    </div>

    <div class="shop-content">
      <div class="products-container" ref="productsContainer">
        <div v-for="product in filteredProducts" :key="product.id" class="product-item">
          <div class="product-main">
            <div class="product-image">
              <!-- 实现图片显示逻辑 -->
              <img
                v-if="product.image"
                :src="product.image"
                :alt="product.name"
                class="product-img"
                @error="handleImageError"
              />
              <div v-else class="image-placeholder">图片</div>
            </div>
            <div class="product-info">
              <h3 class="product-name">{{ product.name }}</h3>
              <p class="product-description">• {{ product.description }}</p>
              <div
                v-if="product.category === 'gift' && isFavoriteGift(product.id)"
                class="favorite-gift-tip"
              >今日最喜爱的礼物！</div>
              <!-- 打折标识 -->
              <div
                v-if="product.isOnSale"
                class="discount-tag"
                :class="{ 'bargained': product.appliedDiscount }"
              >
                <el-icon>
                  <Sell />
                </el-icon>
                <span v-if="!product.appliedDiscount">限时特价，议价可享{{ getMaxDiscount() }}折优惠！</span>
                <span v-else>已成功议价获得{{ getDiscountText(product.appliedDiscount) }}优惠！</span>
              </div>
            </div>
          </div>
          <div class="price-section">
            <button
              class="price-button"
              :class="{ 
                'on-sale': product.isOnSale,
                'purchased': product.category === 'clothes' && isClothPurchased(product.id),
                'favorite-gift': product.category === 'gift' && isFavoriteGift(product.id)
              }"
              @click="product.category === 'clothes' && isClothPurchased(product.id) ? null : handlePurchase(product)"
              :disabled="product.category === 'clothes' && isClothPurchased(product.id)"
            >{{ product.category === 'clothes' && isClothPurchased(product.id) ? '已购买' : formatPrice(product) }}</button>
          </div>
          <div class="delete-section">
            <el-button type="danger" :icon="Delete" circle @click="handleDelete(product)" />
          </div>
        </div>

        <!-- 添加滚动指示器 -->
        <div v-if="showScrollIndicator" class="scroll-indicator" @click="scrollToBottom">
          <el-icon>
            <ArrowDown />
          </el-icon>
        </div>
      </div>

      <!-- 添加分类按钮组 -->
      <div class="category-buttons">
        <div
          v-for="category in categories"
          :key="category.id"
          class="category-button"
          :class="{ 'active': selectedCategory === category.id }"
          @click="selectCategory(category.id)"
        >
          <img :src="category.icon" :alt="category.name" class="category-icon" />
          <span class="category-name" v-show="selectedCategory === category.id">{{ category.name }}</span>
        </div>
      </div>

      <div class="add-product-section">
        <el-button
          type="primary"
          class="add-product-button"
          @click="showAddProductDialog = true"
        >新增商品</el-button>
      </div>
    </div>

    <!-- 购买确认对话框 -->
    <el-dialog v-model="purchaseDialog.visible" title="确认购买" width="30%" :show-close="false">
      <span>确定要购买 {{ purchaseDialog.product && purchaseDialog.product.name }} 吗？将消耗 {{ purchaseDialog.product && getActualPrice(purchaseDialog.product) }} 积分</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="purchaseDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="confirmPurchase">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新增商品对话框 -->
    <el-dialog v-model="showAddProductDialog" title="新增商品" width="40%">
      <el-form :model="newProduct" label-width="80px">
        <el-form-item label="商品名称">
          <el-input v-model="newProduct.name" />
        </el-form-item>
        <el-form-item label="商品描述">
          <el-input v-model="newProduct.description" type="textarea" />
        </el-form-item>
        <el-form-item label="商品价格">
          <el-input-number v-model="newProduct.price" :min="1" />
        </el-form-item>
        <el-form-item label="商品分类">
          <el-select v-model="newProduct.category">
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="商品图片">
          <el-input v-model="newProduct.image" placeholder="输入图片URL地址" />
          <div class="image-preview">
            <img
              v-if="newProduct.image"
              :src="newProduct.image"
              alt="预览"
              class="preview-img"
              @error="handlePreviewError"
            />
            <div v-else class="no-preview">无图片预览</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddProductDialog = false">取消</el-button>
          <el-button type="primary" @click="addProduct">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog v-model="deleteDialog.visible" title="确认删除" width="30%" :show-close="false">
      <span>确定要删除商品 "{{ deleteDialog.product && deleteDialog.product.name }}" 吗？此操作不可恢复。</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialog.visible = false">取消</el-button>
          <el-button type="danger" @click="confirmDelete">确认删除</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 议价小游戏对话框 -->
    <el-dialog
      v-model="bargainDialog.visible"
      title="商品议价"
      width="70%"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      class="bargain-dialog"
    >
      <div class="bargain-game">
        <h3>为 {{ bargainDialog.product && bargainDialog.product.name }} 讨价还价</h3>
        <p>点击"议价"按钮停止指示条，命中绿色区域获得折扣！</p>
        <p>剩余机会：{{ 3 - bargainDialog.attempts }}</p>

        <div class="bargain-progress">
          <div class="bargain-bar">
            <!-- 绿色区域 -->
            <div
              v-for="(zone, index) in bargainDialog.zones"
              :key="index"
              class="bargain-zone"
              :style="{ 
                left: zone.position + '%', 
                width: zone.width + '%',
                display: zone.active ? 'block' : 'none'
              }"
            ></div>

            <!-- 指示针 -->
            <div class="bargain-indicator" :style="{ left: bargainDialog.indicatorPosition + '%' }"></div>
          </div>
        </div>

        <div class="bargain-result" v-if="bargainDialog.successCount > 0">
          <p>已获得折扣：{{ 10 - bargainDialog.successCount }}折</p>
        </div>

        <div class="bargain-actions">
          <el-button type="primary" @click="handleBargain" :disabled="bargainDialog.bargaining">议价</el-button>

          <el-button
            v-if="bargainDialog.attempts >= 3 || !bargainDialog.zones.some(z => z.active)"
            type="success"
            @click="finishBargain"
          >完成议价</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  onMounted,
  computed,
  watch,
  onUnmounted,
  nextTick
} from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Sell, ArrowLeft, ArrowDown } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import dayjs from "dayjs";
import path from "path";
import { app, nativeImage } from "@electron/remote";
import fs from "fs";
import { ipcRenderer } from "electron"; // Import ipcRenderer

const router = useRouter();

// Helper to check if a cloth item is purchased
const isClothPurchased = productId => {
  try {
    const purchased = JSON.parse(
      localStorage.getItem("purchasedOutfits") || "[]"
    );
    return purchased.some(item => item.id === productId);
  } catch (e) {
    console.error("Error reading purchasedOutfits from localStorage:", e);
    return false;
  }
};

// 获取图片路径
const getImagePath = imageRelativePath => {
  // imageRelativePath is expected to be like "xiaolei-clothing/role_xiaolei.png" or "Agold.png"
  if (process.env.NODE_ENV === "development") {
    try {
      // For development, webpack requires a more static path for analysis.
      // We assume imageRelativePath will be something like 'Agold.png' or 'xiaolei-clothing/role_xiaolei.png'
      return require(`../../image/${imageRelativePath}`);
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
        console.error("Shop image file not found:", imagePath);
        return "";
      }
    } catch (error) {
      console.error("Error loading shop image in prod:", error);
      return "";
    }
  }
};

// 商品列表
const defaultProducts = [
  {
    id: 1,
    name: "金币 X 1",
    description: "一枚闪闪发光的金币",
    price: 10,
    image: getImagePath("Agold.png"),
    category: "coins"
  },
  {
    id: 2,
    name: "金币 X 5",
    description: "五枚闪闪发光的金币",
    price: 50,
    image: getImagePath("Agold.png"),
    category: "coins"
  },
  {
    id: 3,
    name: "金币 X 10",
    description: "十枚闪闪发光的金币",
    price: 100,
    image: getImagePath("Agold.png"),
    category: "coins"
  },
  {
    id: 4,
    name: "金币 X 20",
    description: "二十枚闪闪发光的金币",
    price: 200,
    image: getImagePath("Agold.png"),
    category: "coins"
  },
  {
    id: 5,
    name: "金币 X 50",
    description: "一堆闪闪发光的金币",
    price: 500,
    image: getImagePath("golds.png"),
    category: "coins"
  },
  {
    id: 6,
    name: "小学-常服",
    description: "小学时期小蕾的常服",
    price: 1000,
    image: getImagePath("xiaolei-clothing/role_xiaolei.png"),
    category: "clothes"
  },
  {
    id: 7,
    name: "中学-校服",
    description: "中学时期小蕾的校服",
    price: 1000,
    image: getImagePath("xiaolei-clothing/role_xiaolei2_xiaofu.png"),
    category: "clothes"
  },
  {
    id: 8,
    name: "中学-常服",
    description: "中学时期小蕾的常服",
    price: 1000,
    image: getImagePath("xiaolei-clothing/role_xiaolei2.png"),
    category: "clothes"
  },
  {
    id: 9,
    name: "礼服",
    description: "小蕾的礼服",
    price: 1000,
    image: getImagePath("xiaolei-clothing/role_xiaolei2_oufeng.png"),
    category: "clothes"
  },
  {
    id: 10,
    name: "眼睛装",
    description: "小蕾的眼睛装",
    price: 1000,
    image: getImagePath("xiaolei-clothing/role_xiaolei2_yanjing.png"),
    category: "clothes"
  },
  {
    id: 11,
    name: "制服",
    description: "小蕾的制服",
    price: 1000,
    image: getImagePath("xiaolei-clothing/role_xiaolei2_zhifu.png"),
    category: "clothes"
  },
  {
    id: 12,
    name: "粉色丝带",
    description: "可爱的粉色蝴蝶结丝带",
    price: 100,
    image: getImagePath("gift/PinkRibbon.png"),
    category: "gift"
  },
  {
    id: 13,
    name: "春日桃花",
    description: "桃之夭夭，灼灼其华",
    price: 100,
    image: getImagePath("gift/PeachBlossom.png"),
    category: "gift"
  },
  {
    id: 14,
    name: "爱心巧克力",
    description: "似乎是适合在某些特殊日子送出的礼物...",
    price: 100,
    image: getImagePath("gift/LoveHeartChocolate.png"),
    category: "gift"
  },
  {
    id: 15,
    name: "奥数真题",
    description: "和小蕾一起努力学习吧！",
    price: 100,
    image: getImagePath("gift/AaoShu.png"),
    category: "gift"
  },
  {
    id: 16,
    name: "漫画书",
    description: "偶尔也要放松一下哦！",
    price: 100,
    image: getImagePath("gift/OIP.png"),
    category: "gift"
  }
];

// 从 localStorage 加载商品数据
const loadProducts = () => {
  try {
    const savedProducts = localStorage.getItem("shopProducts");
    if (savedProducts) {
      const parsedProducts = JSON.parse(savedProducts);
      // 检查是否需要添加新的默认商品
      const existingIds = new Set(parsedProducts.map(p => p.id));
      const newDefaultProducts = defaultProducts.filter(
        p => !existingIds.has(p.id)
      );

      if (newDefaultProducts.length > 0) {
        // 合并新的默认商品
        const mergedProducts = [...parsedProducts, ...newDefaultProducts];
        // 保存合并后的商品列表
        saveProducts(mergedProducts);
        return mergedProducts;
      }

      return parsedProducts;
    }
  } catch (e) {
    console.error("加载商品数据失败:", e);
  }
  return defaultProducts;
};

// 保存商品数据到 localStorage
const saveProducts = products => {
  try {
    localStorage.setItem("shopProducts", JSON.stringify(products));
  } catch (e) {
    console.error("保存商品数据失败:", e);
  }
};

const products = ref(loadProducts());

// 购买对话框状态
const purchaseDialog = reactive({
  visible: false,
  product: null
});

// 新增商品对话框状态
const showAddProductDialog = ref(false);
const newProduct = reactive({
  name: "",
  description: "",
  price: 1,
  image: "",
  category: "coins"
});

// 删除对话框状态
const deleteDialog = reactive({
  visible: false,
  product: null
});

// 当前积分
const currentPoints = ref(0);

// 打折系统相关状态
const discountState = reactive({
  discountProductId: null,
  lastUpdateDate: null,
  appliedDiscount: 1 // 默认不打折
});

// 当前活动是否有商店打折
const hasShopDiscount = ref(false);

// 议价小游戏对话框
const bargainDialog = reactive({
  visible: false,
  product: null,
  indicatorPosition: 0,
  indicatorMoving: false,
  indicatorDirection: 1, // 1 向右, -1 向左
  indicatorSpeed: 1, // 移动速度
  zones: [
    { position: 10, width: 15, active: true }, // 小区域
    { position: 40, width: 10, active: true }, // 小区域
    { position: 70, width: 20, active: true } // 大区域
  ],
  attempts: 0,
  successCount: 0,
  bargaining: false,
  animationId: null
});

// 刷新状态
const isRefreshing = ref(false);

// 获取刷新卡数量
const refreshCards = computed(() => {
  try {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    return userData.refreshCards || 0;
  } catch (e) {
    console.error("获取刷新卡数量失败:", e);
    return 0;
  }
});

// 返回首页
const goBack = () => {
  router.push("/");
};

// 获取当前积分
const loadCurrentPoints = () => {
  // 从 localStorage 读取积分
  try {
    // 先尝试从 timerData 中读取积分
    const timerData = localStorage.getItem("timerData");
    if (timerData) {
      const parsedData = JSON.parse(timerData);
      if (parsedData && typeof parsedData.totalPoints !== "undefined") {
        currentPoints.value = parsedData.totalPoints;
        return;
      }
    }

    // 如果 timerData 中没有积分，尝试直接读取 totalPoints
    const points = localStorage.getItem("totalPoints");
    if (points) {
      currentPoints.value = parseFloat(points);
    }
  } catch (e) {
    console.error("读取积分数据失败:", e);
    currentPoints.value = 0;
  }
};

// 跳转到积分明细页面
const goToPointsHistory = () => {
  router.push("/points");
};

// 检查特定商品是否打折
const isProductOnSale = productId => {
  return productId === discountState.discountProductId;
};

// 根据打折情况格式化商品价格
const formatPrice = product => {
  let price = getActualPrice(product);
  return `${price}`;
};

// 获取商品的实际价格（考虑活动和打折）
const getActualPrice = product => {
  let price = product.price;
  if (product.category !== "gift") {
    if (hasShopDiscount.value) {
      price = price * 0.8;
    }
    if (product.isOnSale && product.appliedDiscount) {
      price = price * product.appliedDiscount;
    }
  }
  return Math.floor(price);
};

// 获取最大折扣
const getMaxDiscount = () => {
  return 7; // 最大7折
};

// 处理购买点击
const handlePurchase = product => {
  if (product.category === "clothes" && isClothPurchased(product.id)) {
    ElMessage.info("您已经拥有这件服装了。");
    return;
  }
  // If it's a sale item and not yet bargained, start bargain game
  if (product.isOnSale && !product.appliedDiscount) {
    startBargainGame(product);
  } else {
    purchaseDialog.product = product;
    purchaseDialog.visible = true;
  }
};

// 开始议价小游戏
const startBargainGame = product => {
  bargainDialog.product = product;
  bargainDialog.visible = true;
  bargainDialog.attempts = 0;
  bargainDialog.successCount = 0;
  bargainDialog.indicatorPosition = 0;
  bargainDialog.bargaining = false;

  // 重置绿色区域
  bargainDialog.zones.forEach(zone => {
    zone.active = true;
  });

  // 开始指示针动画
  startIndicatorAnimation();
};

// 开始指示针动画
const startIndicatorAnimation = () => {
  if (bargainDialog.animationId) {
    cancelAnimationFrame(bargainDialog.animationId);
    bargainDialog.animationId = null;
  }

  let lastTimestamp = 0;
  const animate = timestamp => {
    // 控制帧率，避免过快更新
    if (timestamp - lastTimestamp > 16) {
      // 约60fps
      lastTimestamp = timestamp;

      // 更新指示针位置
      bargainDialog.indicatorPosition +=
        bargainDialog.indicatorSpeed * bargainDialog.indicatorDirection;

      // 处理边界反弹
      if (bargainDialog.indicatorPosition >= 100) {
        bargainDialog.indicatorPosition = 100;
        bargainDialog.indicatorDirection = -1;
      } else if (bargainDialog.indicatorPosition <= 0) {
        bargainDialog.indicatorPosition = 0;
        bargainDialog.indicatorDirection = 1;
      }
    }

    // 只有当动画没有被取消时才继续
    if (bargainDialog.animationId) {
      bargainDialog.animationId = requestAnimationFrame(animate);
    }
  };

  bargainDialog.animationId = requestAnimationFrame(animate);
};

// 处理议价按钮点击
const handleBargain = () => {
  if (bargainDialog.attempts >= 3) return;

  bargainDialog.bargaining = true;

  // 立即取消动画并清除ID
  if (bargainDialog.animationId) {
    const currentPosition = bargainDialog.indicatorPosition;
    cancelAnimationFrame(bargainDialog.animationId);
    bargainDialog.animationId = null;

    // 确保位置保持不变（防止取消后位置变化）
    bargainDialog.indicatorPosition = currentPosition;
  }

  // 检查是否命中绿色区域
  const hitZone = bargainDialog.zones.findIndex(
    zone =>
      zone.active &&
      bargainDialog.indicatorPosition >= zone.position &&
      bargainDialog.indicatorPosition <= zone.position + zone.width
  );

  if (hitZone !== -1) {
    // 命中绿色区域
    bargainDialog.successCount++;
    bargainDialog.zones[hitZone].active = false;
    ElMessage.success("讨价还价成功！");
  } else {
    ElMessage.info("没有命中折扣区域");
  }

  bargainDialog.attempts++;

  // 如果还有机会，继续游戏
  if (bargainDialog.attempts < 3 && bargainDialog.zones.some(z => z.active)) {
    setTimeout(() => {
      bargainDialog.bargaining = false;
      startIndicatorAnimation();
    }, 1000);
  } else {
    // 显示完成议价按钮
    bargainDialog.bargaining = false;
  }
};

// 完成议价
const finishBargain = () => {
  // 确保动画已停止
  if (bargainDialog.animationId) {
    cancelAnimationFrame(bargainDialog.animationId);
    bargainDialog.animationId = null;
  }

  if (!bargainDialog.product) return;

  // 根据成功次数设置折扣
  let discount = 1;
  let discountText = "";
  switch (bargainDialog.successCount) {
    case 1:
      discount = 0.9; // 9折
      discountText = "9折";
      break;
    case 2:
      discount = 0.8; // 8折
      discountText = "8折";
      break;
    case 3:
      discount = 0.7; // 7折
      discountText = "7折";
      break;
    default:
      discountText = "无折扣";
  }

  // 应用折扣
  const index = products.value.findIndex(
    p => p.id === bargainDialog.product.id
  );
  if (index !== -1) {
    products.value[index].appliedDiscount = discount;

    // 保存折扣到localStorage
    try {
      const today = dayjs().format("YYYY-MM-DD");
      const savedDiscounts = JSON.parse(
        localStorage.getItem("productDiscounts") || "{}"
      );
      if (!savedDiscounts[today]) {
        savedDiscounts[today] = {};
      }
      savedDiscounts[today][bargainDialog.product.id] = discount;
      localStorage.setItem("productDiscounts", JSON.stringify(savedDiscounts));
    } catch (e) {
      console.error("保存折扣数据失败:", e);
    }
  }

  // 计算原价和折后价
  const originalPrice = bargainDialog.product.price;
  const discountedPrice = Math.floor(originalPrice * discount);
  const savedPoints = originalPrice - discountedPrice;

  // 显示议价结果消息
  if (bargainDialog.successCount > 0) {
    ElMessage({
      type: "success",
      message: `恭喜！您成功讨价还价获得了${discountText}优惠，节省了${savedPoints}积分！`,
      duration: 3000
    });
  } else {
    ElMessage({
      type: "info",
      message: "很遗憾，您没有获得任何折扣",
      duration: 3000
    });
  }

  // 关闭议价对话框，打开购买确认对话框
  bargainDialog.visible = false;
  purchaseDialog.product = bargainDialog.product;
  purchaseDialog.visible = true;
};

// 确认购买
const confirmPurchase = () => {
  // 检查积分是否足够
  const actualPrice = getActualPrice(purchaseDialog.product);
  if (currentPoints.value < actualPrice) {
    ElMessage.error("积分不足，无法购买！");
    purchaseDialog.visible = false;
    return;
  }

  // 扣除积分
  currentPoints.value -= actualPrice;

  // 更新 localStorage 中的积分
  try {
    // 先尝试更新 timerData
    const timerData = localStorage.getItem("timerData");
    if (timerData) {
      const parsedData = JSON.parse(timerData);
      parsedData.totalPoints = currentPoints.value;
      localStorage.setItem("timerData", JSON.stringify(parsedData));
    } else {
      // 如果没有 timerData，直接设置 totalPoints
      localStorage.setItem("totalPoints", currentPoints.value.toString());
    }

    // 添加购买记录到积分历史
    const history = JSON.parse(localStorage.getItem("pointsHistory") || "[]");
    history.unshift({
      type: "spend",
      points: -actualPrice,
      item: purchaseDialog.product.name,
      timestamp: new Date().getTime()
    });
    localStorage.setItem("pointsHistory", JSON.stringify(history));

    // 处理装扮和礼物的购买
    if (purchaseDialog.product.category === "clothes") {
      // 保存已购买的装扮
      const purchasedOutfits = JSON.parse(
        localStorage.getItem("purchasedOutfits") || "[]"
      );
      purchasedOutfits.push({
        id: purchaseDialog.product.id,
        name: purchaseDialog.product.name,
        image: purchaseDialog.product.image
      });
      localStorage.setItem(
        "purchasedOutfits",
        JSON.stringify(purchasedOutfits)
      );

      // 发送 IPC 信号通知主进程服装已购买
      ipcRenderer.send("purchased-outfits-updated");
    } else if (purchaseDialog.product.category === "gift") {
      // 保存已购买的礼物
      const purchasedGifts = JSON.parse(
        localStorage.getItem("purchasedGifts") || "[]"
      );
      const idx = purchasedGifts.findIndex(
        g => g.id === purchaseDialog.product.id
      );
      if (idx !== -1) {
        purchasedGifts[idx].count = (purchasedGifts[idx].count || 0) + 1;
      } else {
        purchasedGifts.push({
          id: purchaseDialog.product.id,
          name: purchaseDialog.product.name,
          image: purchaseDialog.product.image,
          favorIncrease: 1, // 赠送时统一+1，最喜爱礼物特殊处理
          count: 1
        });
      }
      localStorage.setItem("purchasedGifts", JSON.stringify(purchasedGifts));
      ipcRenderer.send("purchased-gifts-updated");
    }

    // 如果是打折商品，购买后重置折扣状态
    if (purchaseDialog.product.isOnSale) {
      // 重置商品的折扣状态
      const index = products.value.findIndex(
        p => p.id === purchaseDialog.product.id
      );
      if (index !== -1) {
        products.value[index].isOnSale = false;
        products.value[index].appliedDiscount = null;
      }

      // 更新 discountState
      discountState.discountProductId = null;
      localStorage.setItem("shopDiscount", JSON.stringify(discountState));

      // 记录今天已购买打折商品
      const today = dayjs().format("YYYY-MM-DD");
      const purchaseHistory = JSON.parse(
        localStorage.getItem("discountPurchaseHistory") || "{}"
      );
      purchaseHistory[today] = true;
      localStorage.setItem(
        "discountPurchaseHistory",
        JSON.stringify(purchaseHistory)
      );

      // 从 localStorage 中移除该商品的折扣记录
      try {
        const savedDiscounts = JSON.parse(
          localStorage.getItem("productDiscounts") || "{}"
        );
        if (savedDiscounts[today]) {
          delete savedDiscounts[today][purchaseDialog.product.id];
          localStorage.setItem(
            "productDiscounts",
            JSON.stringify(savedDiscounts)
          );
        }
      } catch (e) {
        console.error("移除折扣记录失败:", e);
      }
    }

    ElMessage.success("购买成功！");
  } catch (e) {
    console.error("保存积分数据失败:", e);
    ElMessage.error("购买失败，请重试！");
  }

  purchaseDialog.visible = false;
};

// 处理图片加载错误
const handleImageError = event => {
  const imgElement = event.target;
  const container = imgElement.parentNode;

  // 隐藏图片元素
  imgElement.style.display = "none";

  // 创建或显示占位符
  let placeholder = container.querySelector(".image-placeholder");
  if (!placeholder) {
    placeholder = document.createElement("div");
    placeholder.className = "image-placeholder";
    placeholder.textContent = "图片加载失败";
    container.appendChild(placeholder);
  } else {
    placeholder.style.display = "flex";
  }

  // 记录错误
  console.error("Image load failed:", event.target.src);
};

// 处理预览图片加载错误
const handlePreviewError = event => {
  const imgElement = event.target;
  imgElement.style.display = "none";

  const noPreview = event.target.parentNode.querySelector(".no-preview");
  if (noPreview) {
    noPreview.style.display = "flex";
    noPreview.textContent = "图片加载失败";
  }
};

// 添加新商品
const addProduct = () => {
  newProduct.category = selectedCategory.value;

  const newProductData = {
    id: Date.now(),
    name: newProduct.name,
    description: newProduct.description,
    price: newProduct.price,
    image: newProduct.image,
    category: newProduct.category
  };

  products.value.push(newProductData);

  // 保存更新后的商品列表
  saveProducts(products.value);

  showAddProductDialog.value = false;
  ElMessage.success("商品添加成功！");

  // 重置表单
  newProduct.name = "";
  newProduct.description = "";
  newProduct.price = 1;
  newProduct.image = "";
  newProduct.category = selectedCategory.value;
};

// 处理删除点击
const handleDelete = product => {
  deleteDialog.product = product;
  deleteDialog.visible = true;
};

// 确认删除
const confirmDelete = () => {
  const index = products.value.findIndex(p => p.id === deleteDialog.product.id);
  if (index !== -1) {
    products.value.splice(index, 1);
    // 保存更新后的商品列表
    saveProducts(products.value);
    ElMessage.success("商品已删除");
  }
  deleteDialog.visible = false;
};

// 每日随机选择打折商品
const selectDailyDiscountProduct = () => {
  const today = dayjs().format("YYYY-MM-DD");

  // 检查是否需要更新
  if (discountState.lastUpdateDate === today) {
    // 今天已经设置过了，应用保存的状态
    applyDiscountState();
    return;
  }

  // 如果是新的一天，重置折扣状态
  discountState.lastUpdateDate = today;

  // 检查今天是否已经购买过打折商品
  const purchaseHistory = JSON.parse(
    localStorage.getItem("discountPurchaseHistory") || "{}"
  );
  if (purchaseHistory[today]) {
    // 今天已经购买过打折商品，不再提供新的打折商品
    discountState.discountProductId = null;
  } else {
    // 新的一天，随机选择一个商品进行打折
    const randomIndex = Math.floor(Math.random() * products.value.length);
    const randomProductId = products.value[randomIndex].id;
    discountState.discountProductId = randomProductId;
  }

  // 保存状态
  localStorage.setItem("shopDiscount", JSON.stringify(discountState));

  // 应用状态
  applyDiscountState();
};

// 应用打折状态
const applyDiscountState = () => {
  // 先重置所有商品的打折状态
  products.value.forEach(product => {
    product.isOnSale = false;
    product.appliedDiscount = null;
  });

  // 从localStorage加载已应用的折扣
  try {
    const savedDiscounts = JSON.parse(
      localStorage.getItem("productDiscounts") || "{}"
    );
    const today = dayjs().format("YYYY-MM-DD");
    const todayDiscounts = savedDiscounts[today] || {};

    // 设置打折商品
    if (discountState.discountProductId) {
      const index = products.value.findIndex(
        p => p.id === discountState.discountProductId
      );
      if (index !== -1) {
        products.value[index].isOnSale = true;
        // 如果有保存的折扣，应用它
        if (todayDiscounts[discountState.discountProductId]) {
          products.value[index].appliedDiscount =
            todayDiscounts[discountState.discountProductId];
        }
      }
    }
  } catch (e) {
    console.error("加载折扣数据失败:", e);
  }
};

// 检查是否有商城大促活动
const checkShopDiscountActivity = () => {
  // 获取活动数据
  const activitiesData = localStorage.getItem("weeklyActivities");
  if (!activitiesData) return;

  try {
    const activities = JSON.parse(activitiesData);
    const today = dayjs().format("YYYY-MM-DD");

    // 查找今天的商城大促活动
    const shopDiscountActivity = activities.find(
      activity => activity.type === "SHOP_DISCOUNT" && activity.date === today
    );

    hasShopDiscount.value = !!shopDiscountActivity;
  } catch (e) {
    console.error("解析活动数据失败:", e);
  }
};

// 使用刷新卡刷新商品折扣
const refreshDiscounts = async () => {
  if (refreshCards.value <= 0) {
    ElMessage.warning("没有可用的刷新卡");
    return;
  }

  // 检查是否存在打折商品
  const hasDiscountedItem = products.value.some(
    p => p.isOnSale || p.appliedDiscount
  );

  if (hasDiscountedItem) {
    try {
      // 显示确认对话框
      await ElMessageBox.confirm(
        "当前存在打折商品，使用刷新卡将使其恢复原价。是否继续？",
        "确认刷新",
        {
          confirmButtonText: "确认",
          cancelButtonText: "取消",
          type: "warning"
        }
      );
    } catch (e) {
      // 用户取消操作
      return;
    }
  }

  try {
    // 扣除刷新卡
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    userData.refreshCards = (userData.refreshCards || 0) - 1;
    localStorage.setItem("userData", JSON.stringify(userData));

    // 重置所有商品的打折状态
    products.value.forEach(product => {
      product.isOnSale = false;
      product.appliedDiscount = null;
    });

    // 重置今天的购买记录，允许重新出现打折商品
    const today = dayjs().format("YYYY-MM-DD");
    const purchaseHistory = JSON.parse(
      localStorage.getItem("discountPurchaseHistory") || "{}"
    );
    delete purchaseHistory[today];
    localStorage.setItem(
      "discountPurchaseHistory",
      JSON.stringify(purchaseHistory)
    );

    // 清除已有的折扣记录
    const savedDiscounts = JSON.parse(
      localStorage.getItem("productDiscounts") || "{}"
    );
    if (savedDiscounts[today]) {
      savedDiscounts[today] = {};
      localStorage.setItem("productDiscounts", JSON.stringify(savedDiscounts));
    }

    // 随机选择新的打折商品
    const randomIndex = Math.floor(Math.random() * products.value.length);
    const randomProductId = products.value[randomIndex].id;
    discountState.discountProductId = randomProductId;
    localStorage.setItem("shopDiscount", JSON.stringify(discountState));

    // 应用新的折扣状态
    applyDiscountState();

    ElMessage.success("商品折扣已刷新");
  } catch (e) {
    console.error("刷新折扣失败:", e);
    ElMessage.error("刷新失败，请重试");
  }
};

// 获取折扣文本
const getDiscountText = discount => {
  if (!discount || discount >= 1) return "";

  if (discount === 0.9) return "9折";
  if (discount === 0.8) return "8折";
  if (discount === 0.7) return "7折";

  // 如果是其他折扣值，直接计算
  return `${Math.round(discount * 10)}折`;
};

// 确保在对话框关闭时清理动画
const cleanupBargainGame = () => {
  if (bargainDialog.animationId) {
    cancelAnimationFrame(bargainDialog.animationId);
    bargainDialog.animationId = null;
  }
};

// 监听对话框可见性变化
watch(
  () => bargainDialog.visible,
  newValue => {
    if (!newValue) {
      cleanupBargainGame();
    }
  }
);

// 组件卸载时清理
onUnmounted(() => {
  cleanupBargainGame();
  if (productsContainer.value) {
    productsContainer.value.removeEventListener("scroll", checkScroll);
  }
});

// 组件挂载时初始化
onMounted(() => {
  // 加载积分
  loadCurrentPoints();

  // 加载折扣状态
  const savedDiscount = localStorage.getItem("shopDiscount");
  if (savedDiscount) {
    try {
      Object.assign(discountState, JSON.parse(savedDiscount));
    } catch (e) {
      console.error("解析折扣数据失败:", e);
    }
  }

  // 设置每日打折商品
  selectDailyDiscountProduct();

  // 检查是否有商城大促活动
  checkShopDiscountActivity();

  if (productsContainer.value) {
    productsContainer.value.addEventListener("scroll", checkScroll);
    // 初始检查
    checkScroll();
  }

  favoriteGift.value = refreshFavoriteGiftShop();
});

// 滚动相关
const productsContainer = ref(null);
const showScrollIndicator = ref(false);

// 检查是否需要显示滚动指示器
const checkScroll = () => {
  if (!productsContainer.value) return;
  const { scrollHeight, scrollTop, clientHeight } = productsContainer.value;
  // 当内容高度大于可视区域且未滚动到底部时显示指示器
  showScrollIndicator.value =
    scrollHeight > clientHeight && scrollHeight - scrollTop - clientHeight > 50;
};

// 滚动到底部
const scrollToBottom = () => {
  if (!productsContainer.value) return;
  productsContainer.value.scrollTo({
    top: productsContainer.value.scrollHeight,
    behavior: "smooth"
  });
};

// 监听商品列表变化
watch(
  products,
  newProducts => {
    // 保存数据
    saveProducts(newProducts);
    // 检查滚动
    nextTick(() => {
      checkScroll();
    });
  },
  { deep: true }
);

// 分类数据
const categories = ref([
  {
    id: "coins",
    name: "金币",
    icon: getImagePath("category-coins.png")
  },
  {
    id: "clothes",
    name: "衣服",
    icon: getImagePath("category-clothes.png")
  },
  {
    id: "gift",
    name: "礼物",
    icon: getImagePath("category-gift.png")
  }
]);

// 当前选中的分类
const selectedCategory = ref("coins");

// 根据分类筛选商品
const filteredProducts = computed(() => {
  return products.value.filter(
    product => product.category === selectedCategory.value
  );
});

// 选择分类
const selectCategory = categoryId => {
  selectedCategory.value = categoryId;
};

// 在setup顶部添加最喜爱礼物机制
function refreshFavoriteGiftShop() {
  const today = dayjs().format("YYYY-MM-DD");
  let favoriteGift = JSON.parse(localStorage.getItem("favoriteGift") || "{}");
  // 只从商品列表中过滤礼物类
  const giftProducts = products.value.filter(p => p.category === "gift");
  if (favoriteGift.date !== today && giftProducts.length > 0) {
    const randomGift =
      giftProducts[Math.floor(Math.random() * giftProducts.length)];
    favoriteGift = { id: randomGift.id, date: today };
    localStorage.setItem("favoriteGift", JSON.stringify(favoriteGift));
  }
  return favoriteGift;
}
const favoriteGift = ref(refreshFavoriteGiftShop());
function isFavoriteGift(id) {
  return favoriteGift.value && favoriteGift.value.id === id;
}
</script>

<style scoped>
/* 全局不可聚焦样式 */
.shop-container * {
  outline: none !important;
  user-select: none;
}

.shop-container button,
.shop-container a,
.shop-container [role="button"],
.shop-container .el-button {
  outline: none !important;
}

.shop-container button:focus,
.shop-container a:focus,
.shop-container [role="button"]:focus,
.shop-container .el-button:focus {
  outline: none !important;
  box-shadow: none !important;
}

/* 对话框样式，防止内部元素聚焦 */
:deep(.el-dialog) {
  outline: none !important;
}

:deep(.el-dialog *) {
  outline: none !important;
}

:deep(.el-input__inner:focus),
:deep(.el-textarea__inner:focus) {
  outline: none !important;
  box-shadow: none !important;
}

/* 保持输入框可用但去除焦点样式 */
:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  outline: none !important;
}

.shop-container {
  width: 100%;
  min-height: 100vh;
  padding: 2vh 2vw;
  box-sizing: border-box;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.shop-content {
  width: 100%;
  max-width: 1400px;
  margin: vh auto;
  background: linear-gradient(#d4a373 0%, #d4a373 100%);
  border-radius: 16px;
  padding: 6px;
  position: relative;
  margin-right: 100px; /* 为分类按钮留出空间 */
}

.products-container {
  background: #fff;
  border-radius: 12px;
  padding: 30px 40px;
  height: 90vh;
  min-height: 600px;
  overflow-y: auto;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: #d4a373 #f1f1f1;
}

/* 优化滚动条样式 */
.products-container::-webkit-scrollbar {
  width: 12px; /* 增加滚动条宽度 */
}

.products-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 6px;
  margin: 5px 0;
  border: 1px solid #e4e7ed;
}

.products-container::-webkit-scrollbar-thumb {
  background: #d4a373;
  border-radius: 6px;
  border: 3px solid #f1f1f1;
  background-clip: padding-box;
  min-height: 50px; /* 确保滚动条滑块最小高度 */
}

.products-container::-webkit-scrollbar-thumb:hover {
  background: #c49262;
  border: 3px solid #f1f1f1;
  background-clip: padding-box;
}

/* 添加滚动提示箭头 */
.scroll-indicator {
  position: fixed; /* 改为固定定位 */
  bottom: 3vh;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  background: rgba(212, 163, 115, 0.9); /* 增加不透明度 */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  animation: bounce 2s infinite;
  z-index: 100;
  transition: opacity 0.3s;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2); /* 添加阴影 */
}

@keyframes bounce {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  40% {
    transform: translateX(-50%) translateY(-10px);
  }
  60% {
    transform: translateX(-50%) translateY(-5px);
  }
}

.product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: linear-gradient(#fefefe 0%, #fefefe 100%);
  border-radius: 8px;
  padding: 3px;
  margin-left: auto;
  margin-right: auto;
  width: 100%; /* 让商品项占满容器宽度 */
}

.product-main {
  display: flex;
  flex: 0.85;
  padding: 15px;
  background: #fdf6e3;
  border-radius: 6px 0 0 6px; /* 修改圆角，只保留左侧 */
  height: 130px; /* 设置固定高度 */
  margin-right: 0; /* 移除右侧间距 */
}

.product-image {
  width: 100px;
  height: 100px;
  min-width: 100px; /* 确保图片区域不会被压缩 */
  margin-right: 20px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  position: relative;
}

.product-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.3s ease;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 0.9em;
  background-color: #f5f7fa;
  border-radius: 4px;
  text-align: center;
  padding: 10px;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 300px;
}

.product-name {
  margin: 0 0 10px 0;
  font-size: 1.3em;
  color: #333;
}

.product-description {
  margin: 0;
  font-size: 1em;
  color: #666;
  padding-left: 8px;
}

.price-section {
  flex: 0.1;
  padding: 15px;
  background: #e9d8a6;
  border-radius: 0 6px 6px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
  height: 130px;
  min-width: 100px;
}

.price-button {
  width: auto;
  min-width: 80px; /* 增加最小宽度 */
  padding: 12px 20px; /* 增加内边距 */
  background: #ffb703;
  border: none;
  border-radius: 6px; /* 稍微增加圆角 */
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  font-size: 1.4em; /* 增加字体大小 */
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2); /* 添加阴影 */
}

.price-button:hover {
  transform: scale(1.05);
  background: #fb8500;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
}

.price-button:active {
  transform: scale(0.98);
}

/* 保持大号的添加商品按钮和对话框样式 */
.add-product-section {
  padding: 20px;
  text-align: center;
  background: #fff;
  border-radius: 0 0 12px 12px;
  margin-top: -1px; /* 消除可能的边框间隙 */
}

.add-product-button {
  font-size: 1.3em;
  padding: 16px 40px;
}

:deep(.el-dialog) {
  border-radius: 16px;
  width: 500px !important;
}

:deep(.el-dialog__header) {
  margin-right: 0;
  padding: 20px;
}

:deep(.el-dialog__body) {
  padding: 30px;
  font-size: 1.2em;
}

:deep(.el-dialog__footer) {
  padding: 20px;
}

.delete-section {
  display: flex;
  align-items: center;
  min-width: 40px; /* 确保删除按钮有固定宽度 */
}

.current-points-display {
  position: fixed;
  right: 1.5vw;
  top: 2vh;
  z-index: 100;
}

.points-card {
  background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
  border-radius: 10px;
  padding: 2vh 2vw;
  width: 20vw;
  min-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  text-align: center;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.points-title {
  font-size: calc(12px + 0.5vw);
  margin-bottom: 1vh;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.points-value {
  font-size: calc(20px + 1vw);
  font-weight: bold;
  margin-bottom: 1.5vh;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.points-history-btn {
  width: 100%;
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.5);
  margin-top: 5px;
}

.points-history-btn:hover {
  background: rgba(255, 255, 255, 0.5);
}

.image-preview {
  margin-top: 10px;
  width: 100px;
  height: 100px;
  border: 1px dashed #ccc;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 0.9em;
  background-color: #f5f7fa;
  border-radius: 4px;
  text-align: center;
  padding: 5px;
}

/* 修改按钮聚焦样式 */
.price-button:focus {
  outline: none !important;
  box-shadow: none !important;
}

.add-product-button:focus {
  outline: none !important;
  box-shadow: none !important;
}

.points-history-btn:focus {
  outline: none !important;
  box-shadow: none !important;
}

.delete-section button:focus {
  outline: none !important;
  box-shadow: none !important;
}

/* 打折标识样式 */
.discount-tag {
  display: flex;
  align-items: center;
  color: #e6a23c;
  font-size: 0.9em;
  margin-top: 8px;
  font-weight: bold;
}

.discount-tag .el-icon {
  margin-right: 5px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

/* 已议价的标签样式 */
.discount-tag.bargained {
  color: #67c23a;
}

.discount-tag.bargained .el-icon {
  animation: none;
  color: #67c23a;
}

/* 打折商品价格按钮 */
.price-button.on-sale {
  background: #409eff;
  animation: glow 1.5s infinite alternate;
}

.price-button.on-sale:hover {
  background: #66b1ff;
}

@keyframes glow {
  0% {
    box-shadow: 0 0 5px rgba(64, 158, 255, 0.6);
  }
  100% {
    box-shadow: 0 0 15px rgba(64, 158, 255, 0.8);
  }
}

/* 议价小游戏样式 */
.bargain-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  width: 100%;
}

.bargain-progress {
  width: 100%;
  margin: 40px 0;
}

.bargain-bar {
  position: relative;
  width: 100%;
  height: 8vh;
  min-height: 60px;
  background-color: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  border: 3px solid #dcdfe6;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
}

.bargain-zone {
  position: absolute;
  height: 100%;
  background-color: #67c23a;
  top: 0;
  border-radius: 0; /* 移除圆角 */
  transition: all 0.3s;
}

.bargain-indicator {
  position: absolute;
  top: 0;
  width: 0.8vw;
  min-width: 6px;
  height: 100%;
  background-color: #f56c6c;
  transition: left 0.05s linear;
  box-shadow: 0 0 10px rgba(245, 108, 108, 0.8);
}

.bargain-result {
  margin: 1.5vh 0;
  font-weight: bold;
  color: #67c23a;
  font-size: calc(12px + 0.5vw);
}

.bargain-actions {
  margin-top: 3vh;
  display: flex;
  gap: 2vw;
}

.bargain-actions .el-button {
  padding: 1.2vh 3vw;
  font-size: calc(12px + 0.3vw);
}

.test-toolbar {
  position: fixed;
  left: 3vw;
  bottom: 3vh;
  z-index: 100;
  background: rgba(255, 255, 255, 0.9);
  padding: 1vh 1vw;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* 对话框样式 */
:deep(.el-dialog.bargain-dialog) {
  width: 70vw !important;
  max-width: 800px;
  min-width: 300px;
}

/* 返回按钮样式 */
.back-button-container {
  position: fixed;
  left: 1.5vw;
  top: 2vh;
  z-index: 100;
}

.back-button {
  font-size: calc(12px + 0.3vw);
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 5px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  background-color: #409eff;
  border: none;
  transition: all 0.3s;
}

.back-button:hover {
  transform: translateX(-5px);
  background-color: #66b1ff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.back-button .el-icon {
  margin-right: 2px;
}

.shop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.shop-header h2 {
  margin: 0;
}

/* 分类按钮样式 */
.category-buttons {
  position: absolute;
  right: -80px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 15px;
}

.category-button {
  width: 60px;
  height: 60px;
  background: #ffffff;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  padding: 8px;
}

.category-button.active {
  background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.category-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  transition: all 0.3s ease;
}

.category-name {
  font-size: 12px;
  color: #ffffff;
  margin-top: 6px;
  text-align: center;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.category-button:hover:not(.active) {
  transform: scale(1.05);
  background: #f5f5f5;
}

.price-button.favorite-gift {
  background: #ff69b4;
  color: #fff;
  animation: none;
  box-shadow: 0 0 10px #ffb6d5;
}
.price-button.favorite-gift:hover {
  background: #ff85c2;
}
.favorite-gift-tip {
  color: #ff69b4;
  font-weight: bold;
  margin-top: 4px;
  font-size: 1em;
  text-shadow: 0 1px 2px #fff0f5;
}
</style> 