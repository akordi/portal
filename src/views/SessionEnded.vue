<script setup>
import useViewStore from '@/stores/useViewStore';
import { onMounted } from 'vue';
import { LxButton } from '@wntr/lx-ui';

const viewStore = useViewStore();

onMounted(() => {
  viewStore.header = false;
});
</script>
<template>
  <div class="lx-header lx-error">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 32 32"
      xml:space="preserve"
      class="lx-illustration"
    >
      <path
        d="M16,31.36C7.53,31.36,0.64,24.47,0.64,16S7.53,0.64,16,0.64S31.36,7.53,31.36,16S24.47,31.36,16,31.36z
	 M15.64,28h0.72v2.636c7.788-0.188,14.087-6.488,14.276-14.276H28v-0.72h2.636C30.447,7.853,24.147,1.553,16.36,1.364V4h-0.72V1.364
	C7.853,1.553,1.553,7.853,1.364,15.64H4v0.72H1.364c0.189,7.788,6.488,14.087,14.276,14.276V28z M22.748,20.312l-7.108-4.104V6h0.72
	v9.792l6.748,3.896L22.748,20.312z"
      />
      <rect id="_Transparent_Rectangle" style="fill: none" width="32" height="32" />
    </svg>
    <h1>{{ $t('pages.sessionEnded.title') }}</h1>
    <div class="lx-description">{{ $t('pages.sessionEnded.description') }}</div>
  </div>
  <div class="lx-button-set">
    <LxButton
      :href="{
        name: 'home',
      }"
      :label="$t('pages.error.goHome')"
      icon="undo"
    />
  </div>
</template>
