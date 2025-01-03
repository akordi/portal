<script setup></script>
<style scoped>
.scene {
  position: absolute;
  inset: 0;
  background: var(--color-background);
}
.dots {
  height: 100%;
  background-color: var(--color-background);
  position: absolute;
  inset: 0;
}
.canvas {
  position: absolute;
  inset: 0;
  background: url('/imgs/cover-full.png');
  height: 100%;
  background-size: auto 1000%;
  -webkit-mask-image: url('/imgs/dots.svg');
  mask-image: url('/imgs/dots.svg');
  -webkit-mask-size: 100%;
  mask-size: 100%;
  opacity: 0.05;
  background-position: 0% 0%;
  /* use move-background animation to move the background */
  animation: move-background 600s linear infinite;
}

@keyframes move-background {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 100% 0%;
  }
}
</style>
<template>
  <div class="scene">
    <div class="canvas"></div>
  </div>
</template>
