<script setup>
import useAuthStore from '@/stores/useAuthStore';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import { Configuration, FrontendApi } from '@ory/client';
import { LxForm, LxLoader, LxRow, LxTextInput } from '@dativa-lv/lx-ui';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const $t = useI18n().t;
const route = useRoute();
const notify = useNotifyStore();
const router = useRouter();
const viewStore = useViewStore();
const authStore = useAuthStore();
const loading = ref(true);
const flowId = computed(() => route.query.flow);
const flow = ref();
const codeNode = ref(null);
const emailNode = ref(null);
const codeForm = ref(null);
const resendCodeForm = ref(null);
const csrfToken = ref(null);
const { authUrl } = window.config;
const ory = new FrontendApi(
  new Configuration({
    basePath: authUrl,
    baseOptions: {
      // Ensures we send cookies in the CORS requests.
      withCredentials: true,
    },
  })
);
const busy = ref(false);

function getMappedMessage(messageKey, defaultText) {
  const translatedMessage = $t(`pages.login.errors.${messageKey}`);
  if (translatedMessage === `pages.login.errors.${messageKey}`) {
    return defaultText;
  }
  return translatedMessage;
}
function getErrorMessage(node) {
  if (!node.messages.length) {
    return '';
  }
  const messageKey = node.messages[0].id;
  return getMappedMessage(messageKey, node.messages[0].text);
}

function notifyMappedError(message) {
  const messageKey = message.id;
  const mappedMessage = getMappedMessage(messageKey, message.text);
  switch (message.type) {
    case 'error':
      notify.pushError(mappedMessage);
      break;
    case 'success':
      notify.pushSuccess(mappedMessage);
      break;
    case 'info':
      notify.pushInfo(mappedMessage);
      break;
    case 'warning':
      notify.pushWarning(mappedMessage);
      break;
    default:
      notify.pushError(mappedMessage);
      break;
  }
}

onMounted(() => {
  viewStore.showBack();
  if (authStore.isAuthorized) {
    viewStore.showNavBar();
  } else {
    viewStore.hideNavBar();
  }

  ory
    .getVerificationFlow({ id: flowId.value })
    .then(({ data }) => {
      flow.value = data;

      if (data.ui.messages && data.ui.messages.length > 0) {
        data.ui.messages.forEach((message) => {
          notifyMappedError(message);
        });
      }

      if (data.state === 'passed_challenge') {
        router.push({ name: 'signin' });
        return;
      }
      data.ui.nodes.forEach((node) => {
        if (node.group === 'code' && node.attributes.name === 'code') {
          codeNode.value = node;
        }
        if (node.group === 'code' && node.attributes.name === 'email') {
          emailNode.value = node;
        }
        if (node.group === 'default' && node.attributes.name === 'csrf_token') {
          csrfToken.value = node.attributes.value;
        }
      });
      loading.value = false;
    })
    .catch(() => {
      router.push('/error');
    });
});

function verificationFormSubmit(actionId) {
  if (actionId === 'submit') {
    nextTick(() => {
      busy.value = true;
      if (codeForm.value) {
        codeForm.value.submit();
      }
    });
    return;
  }
  if (actionId === 'resend-code') {
    nextTick(() => {
      busy.value = true;
      if (resendCodeForm.value) {
        resendCodeForm.value.submit();
      }
    });
  }
}
const verificationFormActions = computed(() => [
  {
    id: 'resend-code',
    icon: 'next',
    name: $t('pages.verification.buttons.resendCode'),
    kind: 'tertiary',
    busy: busy.value,
  },
  {
    id: 'submit',
    icon: 'next',
    name: $t('pages.verification.buttons.continue'),
    kind: 'primary',
    busy: busy.value,
  },
]);
</script>
<template>
  <LxLoader :loading="loading" />
  <div v-if="!loading">
    <LxForm
      id="verification-form"
      :showHeader="false"
      :stickyFooter="false"
      :action-definitions="verificationFormActions"
      @actionClick="verificationFormSubmit"
      v-if="codeNode && flow?.state !== 'passed_challenge'"
    >
      <LxRow :label="$t('pages.verification.code')">
        <LxTextInput
          id="code"
          v-model="codeNode.attributes.value"
          :required="codeNode.attributes.required"
          :invalid="codeNode.messages.length > 0"
          :invalidationMessage="getErrorMessage(codeNode)"
        />
      </LxRow>
    </LxForm>
  </div>

  <form
    :action="flow.ui.action"
    :method="flow.ui.method"
    ref="resendCodeForm"
    v-if="flow && emailNode"
  >
    <input type="hidden" name="method" value="code" />
    <input type="hidden" name="email" :value="emailNode.attributes.value" />
    <input type="hidden" name="csrf_token" :value="csrfToken" />
  </form>
  <form :action="flow.ui.action" :method="flow.ui.method" ref="codeForm" v-if="flow && codeNode">
    <input type="hidden" name="method" value="code" />
    <input type="hidden" name="code" :value="codeNode.attributes.value" />
    <input type="hidden" name="csrf_token" :value="csrfToken" />
  </form>
</template>
