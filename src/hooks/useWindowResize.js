import { onMounted, onUnmounted, ref } from 'vue';

export default function useWindowResize(callbackFn) {
  const height = ref(null);
  const width = ref(null);

  const resize = () => {
    height.value = window.innerHeight;
    width.value = window.innerWidth;
    if (callbackFn) {
      callbackFn(width.value, height.value);
    }
  };

  onMounted(() => {
    resize();
    window.addEventListener('resize', resize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', resize);
  });

  return { width, height };
}
