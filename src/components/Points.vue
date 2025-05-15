<template>
  <div class="points-container">
    <PointsDetail />
  </div>
</template>

<script setup>
import PointsDetail from "./PointsDetail.vue";
</script>

<style scoped>
.points-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: white;
}
</style> 