/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 声明 vue 模块
declare module 'vue' {
  import { DefineComponent } from '@vue/runtime-core'

  // 全局组件类型
  export interface GlobalComponents {
    DefaultStyle: typeof import('./components/floating-styles/defaultStyle.vue')['default']
    PinkStyle: typeof import('./components/floating-styles/pinkstyle.vue')['default']
  }

  export { DefineComponent }

  // Vue 3 Composition API
  export { ref, reactive, computed, watch, onMounted, onUnmounted, defineComponent, createApp } from '@vue/runtime-core'
} 