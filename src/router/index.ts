import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import Timer from '../components/Timer.vue'
import FloatingTimer from '../components/FloatingTimer.vue'
import Points from '../components/Points.vue'
import Shop from '../views/ShopView.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Timer',
    component: Timer
  },
  {
    path: '/points',
    name: 'Points',
    component: Points
  },
  {
    path: '/shop',
    name: 'Shop',
    component: Shop
  },
  {
    path: '/floating',
    name: 'FloatingTimer',
    component: FloatingTimer
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router 