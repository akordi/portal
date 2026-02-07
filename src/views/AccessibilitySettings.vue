<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { LxAccessibilitySettings } from '@dativa-lv/lx-ui';

import useViewStore from '@/stores/useViewStore';
import { onMounted, computed } from 'vue';

const i18n = useI18n();
const viewStore = useViewStore();

const settingsTexts = computed(() => ({
  appearance: i18n.t('accessibilitySettings.appearance'),
  animations: i18n.t('accessibilitySettings.animations'),
  fonts: i18n.t('accessibilitySettings.fonts'),
  interactions: i18n.t('accessibilitySettings.interactions'),
  reset: i18n.t('accessibilitySettings.reset'),
  themeTitle: i18n.t('accessibilitySettings.themeTitle'),
  transparencyTitle: i18n.t('accessibilitySettings.transparencyTitle'),
  animationsTitle: i18n.t('accessibilitySettings.animationsTitle'),
  fontsTitle: i18n.t('accessibilitySettings.fontsTitle'),
  touchModeTitle: i18n.t('accessibilitySettings.touchModeTitle'),
  transparencyDescription: i18n.t('accessibilitySettings.transparencyDescription'),
  animationsDescription: i18n.t('accessibilitySettings.animationsDescription'),
  fontsDescription: i18n.t('accessibilitySettings.fontsDescription'),
  touchModeDescription: i18n.t('accessibilitySettings.touchModeDescription'),
  themeAuto: i18n.t('accessibilitySettings.themeAuto'),
  themeLight: i18n.t('accessibilitySettings.themeLight'),
  themeDark: i18n.t('accessibilitySettings.themeDark'),
  themeContrast: i18n.t('accessibilitySettings.themeContrast'),
  themeAutoDescription: i18n.t('accessibilitySettings.themeAutoDescription'),
  themeLightDescription: i18n.t('accessibilitySettings.themeLightDescription'),
  themeDarkDescription: i18n.t('accessibilitySettings.themeDarkDescription'),
  themeContrastDescription: i18n.t('accessibilitySettings.themeContrastDescription'),
  transparencyLinkLabel: i18n.t('accessibilitySettings.transparencyLinkLabel'),
  animationsLinkLabel: i18n.t('accessibilitySettings.animationsLinkLabel'),
}));
</script>
<template>
  <div>
    <LxAccessibilitySettings :texts="settingsTexts" />
  </div>
</template>
