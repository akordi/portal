<script setup lang="ts">
import { useRouter } from 'vue-router';
import { LxButton } from '@wntr/lx-ui';

const router = useRouter();

const props = defineProps({
  title: {
    type: String,
  },
  description: {
    type: String,
  },
  canGoBack: {
    type: Boolean,
  },
  goBackLink: {
    type: Object,
    default: null,
  },
});

function goBack() {
  if (props.goBackLink.name) {
    router.push(props.goBackLink);
  } else {
    router.go(-1);
  }
}
</script>

<template>
  <header class="lx-header">
    <div class="lx-toolbar">
      <lx-button
        label="Atpakaļ"
        icon="back"
        kind="ghost"
        variant="icon-only"
        v-if="canGoBack"
        @click="goBack()"
      />
    </div>
    <h1>{{ title }}</h1>
    <div class="lx-description" v-if="description">{{ description }}</div>
  </header>
</template>
