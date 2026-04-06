<script setup>
import { onMounted } from 'vue';

onMounted(() => {
  const { authUrl, publicUrl } = window.config;
  window.location.href = `${authUrl}/self-service/login/browser?return_to=${publicUrl}auth-done`;
});
</script>

<template>
  <div />
</template>
