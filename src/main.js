import createAppInstance from '@/createApp';

import '@akordi/lx-ui/dist/styles/lx-reset.css';
import '@akordi/lx-ui/dist/styles/lx-fonts-carbon.css';
import '@akordi/lx-ui/dist/styles/lx-pt-carbon.css';
import '@akordi/lx-ui/dist/styles/lx-ut-carbon-light.css';
import '@akordi/lx-ui/dist/styles/lx-ut-carbon-dark.css';
import '@akordi/lx-ui/dist/styles/lx-ut-carbon-contrast.css';

import '@akordi/lx-ui/dist/styles/lx-buttons.css';
import '@akordi/lx-ui/dist/styles/lx-data-grid.css';
import '@akordi/lx-ui/dist/styles/lx-inputs.css';
import '@akordi/lx-ui/dist/styles/lx-steps.css';
import '@akordi/lx-ui/dist/styles/lx-forms.css';
import '@akordi/lx-ui/dist/styles/lx-notifications.css';
import '@akordi/lx-ui/dist/styles/lx-info-boxes.css';
import '@akordi/lx-ui/dist/styles/lx-info-wrappers.css';
import '@akordi/lx-ui/dist/styles/lx-modals.css';
import '@akordi/lx-ui/dist/styles/lx-loaders.css';
import '@akordi/lx-ui/dist/styles/lx-lists.css';
import '@akordi/lx-ui/dist/styles/lx-expanders.css';
import '@akordi/lx-ui/dist/styles/lx-tabs.css';
import '@akordi/lx-ui/dist/styles/lx-date-pickers.css';
import '@akordi/lx-ui/dist/styles/lx-animations.css';
import '@akordi/lx-ui/dist/styles/lx-master-detail.css';
import '@akordi/lx-ui/dist/styles/lx-ratings.css';
import '@akordi/lx-ui/dist/styles/lx-duration-inputs.css';
import '@akordi/lx-ui/dist/styles/lx-content-switchers.css';
import '@akordi/lx-ui/dist/styles/lx-popovers.css';

// Need only to hide console errors when running lx-ui locally
// import '@akordi/lx-ui/dist/lx-fonts/IBMPlexMono-SemiBold.woff';
// import '@akordi/lx-ui/dist/lx-fonts/IBMPlexSans-Light.woff';
// import '@akordi/lx-ui/dist/lx-fonts/IBMPlexSans-Regular.woff';
// import '@akordi/lx-ui/dist/lx-fonts/IBMPlexSans-SemiBold.woff';
// import '@akordi/lx-ui/dist/lx-fonts/IBMPlexMono-Regular.woff';
// import '@akordi/lx-ui/dist/lx-fonts/IBMPlexSans-Italic.woff';
//

import '@akordi/lx-ui/dist/styles/lx-map.css';
import '@akordi/lx-ui/dist/styles/lx-shell-grid.css';
import '@akordi/lx-ui/dist/styles/lx-shell-grid-public.css';
import '@akordi/lx-ui/dist/styles/lx-forms-grid.css';
import '@akordi/lx-ui/dist/styles/lx-treelist.css';
import '@akordi/lx-ui/dist/styles/lx-stack.css';
import '@akordi/lx-ui/dist/styles/lx-toggles.css';
import '@akordi/lx-ui/dist/styles/lx-value-pickers.css';
import '@akordi/lx-ui/dist/styles/lx-toolbars.css';

import '@/assets/styles.css';
import '@/assets/lx-pt-akordi.css';

const { app, router } = createAppInstance(window.config, { ssr: false });

router.isReady().then(() => {
  app.mount('#app');
});
