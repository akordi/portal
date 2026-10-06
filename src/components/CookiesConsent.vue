<script setup>
import { LxButton } from '@akordi/lx-ui';
import { onMounted, ref } from 'vue';
import { addGtag, consentGrantedAll, useConsent } from 'vue-gtag';
import { useI18n } from 'vue-i18n';
import whenLoaded from '@/utils/asyncComponent';

const { t: $t } = useI18n();
const { hasConsent } = useConsent();

const showConsent = ref(false);

async function accept() {
  showConsent.value = false;
  // Load analytics only after explicit consent
  await addGtag();
  await consentGrantedAll('update');
}

async function reject() {
  showConsent.value = false;
}
onMounted(async () => {
  if (hasConsent.value) return;
  await whenLoaded(LxButton);
  showConsent.value = true;
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
  align-items: center;
  gap: var(--stack-gap, 1rem);
}
/* A capped text width keeps the line count independent of the button widths. */
.cookies-wrapper .cookies-content p {
  max-width: 52rem;
}
.cookies-wrapper .cookies-buttons {
  max-width: fit-content;
  display: flex;
  flex: none;
  gap: var(--stack-gap, 1rem);
}
@media (max-width: 950px) {
  .cookies-wrapper .cookies-content {
    flex-direction: column;
  }
}
</style>

<template>
  <div class="cookies-wrapper" v-if="showConsent">
    <div class="cookies-content">
      <p v-html="$t('cookieConsent.description')"></p>
      <div class="cookies-buttons">
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
      </div>
    </div>
  </div>
</template>
