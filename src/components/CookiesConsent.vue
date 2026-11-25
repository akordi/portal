<script setup>
import { LxButton } from '@akordi/lx-ui';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { addGtag, consentGrantedAll, useConsent } from 'vue-gtag';
import { useI18n } from 'vue-i18n';
import whenLoaded from '@/utils/asyncComponent';

const { t: $t } = useI18n();
const { hasConsent } = useConsent();

const showConsent = ref(false);
const wrapper = ref(null);

// The banner is fixed to the bottom of the viewport, exactly where the song
// page's sticky transpose/font/autoscroll toolbar sits. Publish the banner's
// height so that toolbar (and the end of the page) can sit above it instead of
// underneath it until the visitor answers.
const HEIGHT_VAR = '--cookie-banner-height';
let resizeObserver = null;

function setBannerHeight(px) {
  if (typeof document === 'undefined') return;
  if (px > 0) {
    document.documentElement.style.setProperty(HEIGHT_VAR, `${Math.ceil(px)}px`);
  } else {
    document.documentElement.style.removeProperty(HEIGHT_VAR);
  }
}

function stopTracking() {
  resizeObserver?.disconnect();
  resizeObserver = null;
  setBannerHeight(0);
}

watch(wrapper, (el) => {
  stopTracking();
  if (!el) return;
  setBannerHeight(el.offsetHeight);
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => setBannerHeight(el.offsetHeight));
    resizeObserver.observe(el);
  }
});

onBeforeUnmount(stopTracking);

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
.cookies-wrapper .cookies-buttons {
  max-width: fit-content;
  display: flex;
  gap: var(--stack-gap, 1rem);
}
@media (max-width: 950px) {
  .cookies-wrapper .cookies-content {
    flex-direction: column;
  }
}
/* Phones: the banner took about a quarter of the screen. Trim the padding and
   gaps so more of the song stays visible while the banner is open. */
@media (max-width: 600px) {
  .cookies-wrapper {
    padding: 0.75rem 1rem;
  }
  .cookies-wrapper .cookies-content {
    gap: 0.75rem;
  }
  .cookies-wrapper .cookies-content p {
    margin: 0;
  }
}

/* While the banner is open (--cookie-banner-height is set by this component),
   keep sticky form footers -- the song page's transpose/font/autoscroll toolbar
   -- above it, and let the page scroll far enough that its end isn't hidden. */
/* `body` prefix outranks lx-forms-grid.css's own `bottom` regardless of which
   stylesheet loads last (SSR and client builds order them differently). */
body .lx-form-grid .lx-form-grid-footer-sticky {
  bottom: var(--cookie-banner-height, 0);
}
body {
  padding-bottom: var(--cookie-banner-height, 0);
}
</style>

<template>
  <div ref="wrapper" class="cookies-wrapper" v-if="showConsent">
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
