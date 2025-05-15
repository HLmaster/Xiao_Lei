<script setup>
import Timer from "./components/Timer.vue";
import { loadOml2d } from "oh-my-live2d";
import { onMounted, onBeforeMount, computed } from "vue";
import { useRoute } from "vue-router";
import CharacterDisplay from "./components/CharacterDisplay.vue";

const route = useRoute();

// 检查是否是浮动窗口路由
const isFloatingRoute = () => route.path === "/floating";

// 计算是否显示小人
const showCharacter = computed(() => {
  const isShopPage = route.name === "Shop"; // 修改为正确的路由名称 'Shop'
  return !isFloatingRoute() && !isShopPage;
});

onBeforeMount(() => {
  // 如果是浮动窗口，添加特殊的类名
  if (isFloatingRoute()) {
    document.body.classList.add("floating-window");
  }
});

/* onMounted(() => {
  // 只在非浮动窗口路由时加载看板娘
  if (!isFloatingRoute()) {
    loadOml2d({
      models: [
        {
          path: "https://model.hacxy.cn/HK416-1-normal/model.json",
          position: [0, 60],
          scale: 0.08,
          stageStyle: {
            height: 450
          }
        }
      ],
      tips: {
        style: {
          width: "auto",
          height: "auto",
          fontSize: "14px",
          padding: "5px 10px",
          background: "rgba(255, 255, 255, 0.9)",
          borderRadius: "4px",
          boxShadow: "0 0 8px rgba(0, 0, 0, 0.12)",
          color: "#333",
          border: "none",
          opacity: 0.9
        }
      },
      style: {
        position: "fixed",
        right: "20px",
        bottom: "20px",
        opacity: 1,
        zIndex: 100
      },
      control: {
        scale: 1,
        mousewheel: true
      },
      state: {
        drag: true,
        scale: true
      },
      dialog: {
        enable: true,
        welcome: ["欢迎来到学习助手！", "让我们一起开始学习吧！"],
        touch: ["呀！别碰我！", "再碰我就生气了！"],
        click: ["你想和我一起学习吗？", "点击开始按钮就可以开始计时了哦！"],
        idle: ["好好学习，天天向上！", "专注学习，收获知识！"]
      }
    });
  }
}); */
</script>

<template>
  <div class="app-container">
    <router-view />
    <CharacterDisplay v-if="showCharacter" />
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  overflow-x: hidden;
}

/* 浮动窗口特殊样式 */
body.floating-window {
  background: transparent;
  overflow: hidden;
}

/* 在浮动窗口中隐藏看板娘相关元素 */
body.floating-window #oh-my-live2d,
body.floating-window #oh-my-live2d-tips {
  display: none !important;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  min-height: 100vh;
  width: 100%;
}

.app-container {
  width: 100%;
  min-height: 100vh;
  position: relative;
  background: transparent;
}
</style>
