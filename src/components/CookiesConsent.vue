<script setup>
import { useWindowSize } from '@vueuse/core';
import { LxButton, LxStack } from '@wntr/lx-ui';
import { computed, onMounted, ref } from 'vue';
import { addGtag, consentGrantedAll, useConsent } from 'vue-gtag';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
const { hasConsent } = useConsent();

const windowSize = useWindowSize();
const showConsent = ref(true);

const isBigScreen = computed(() => windowSize.width.value < 950);
const stackOrientation = computed(() => (isBigScreen.value ? 'vertical' : 'horizontal'));

async function accept() {
  showConsent.value = false;
  // Load analytics only after explicit consent
  await addGtag();
  await consentGrantedAll('update');
}

async function reject() {
  showConsent.value = false;
}
onMounted(() => {
  if (hasConsent.value) {
    showConsent.value = false;
  }
});
</script>
<style>
.cookies-wrapper {
  background: var(--color-region);
  border-top: 2px solid var(--color-chrome);
  bottom: 0;
  left: 0;
  padding: 1.5rem;
  position: fixed;
  width: 100%;
  z-index: 1000;
}

.cookies-wrapper .cookies-content {
  max-width: fit-content;
  width: 100%;
  margin: 0 auto;
  display: flex;
  gap: var(--stack-gap);
}
.cookies-wrapper .cookies-buttons {
  max-width: fit-content;
}
</style>

<template>
  <div class="cookies-wrapper" v-if="showConsent">
    <LxStack class="cookies-content" :orientation="stackOrientation" vertical-alignment="center">
      <p v-html="$t('cookieConsent.description')"></p>
      <LxStack class="cookies-buttons" orientation="horizontal">
        <LxButton
          :icon="null"
          kind="primary"
          :label="$t('cookieConsent.accept')"
          :title="$t('cookieConsent.accept')"
          @click="accept"
        ></LxButton>
        <LxButton
          :icon="null"
          kind="secondary"
          :label="$t('cookieConsent.reject')"
          :title="$t('cookieConsent.reject')"
          @click="reject"
        ></LxButton>
      </LxStack>
    </LxStack>
  </div>
</template>
