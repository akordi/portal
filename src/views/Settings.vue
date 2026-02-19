<script setup>
import useAuthStore from '@/stores/useAuthStore';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import { LxDateTimePicker, LxForm, LxLoaderView, LxRow, LxTextInput } from '@dativa-lv/lx-ui';
import { Configuration, FrontendApi } from '@ory/client';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const $t = useI18n().t;
const route = useRoute();
const notify = useNotifyStore();
const router = useRouter();
const viewStore = useViewStore();
const authStore = useAuthStore();
const passwordChange = ref(false);

const loading = ref(true);
const flowId = computed(() => route.query.flow);
const flow = ref();
const settingsForm = ref();
const passwordForm = ref();
const csrfToken = ref(null);
const emailNode = ref(null);
const givenName = ref({});
const familyName = ref({});
const personalId = ref({});
const birthDate = ref({});
const passwordNode = ref(null);
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
  const translatedMessage = $t(`pages.profile.errors.${messageKey}`);
  if (translatedMessage === `pages.profile.errors.${messageKey}`) {
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
    .getSettingsFlow({ id: flowId.value })
    .then(({ data }) => {
      flow.value = data;

      if (data.ui.messages && data.ui.messages.length > 0) {
        data.ui.messages.forEach((message) => {
          notifyMappedError(message);
        });
      }

      data.ui.nodes.forEach((node) => {
        if (node.group === 'default' && node.attributes.name === 'csrf_token') {
          csrfToken.value = node.attributes.value;
        }
        if (
          (node.group === 'password' && node.attributes.type === 'password') ||
          node.attributes.name === 'password'
        ) {
          passwordNode.value = node;
        }
        if (node.group === 'profile' && node.attributes.name === 'traits.email') {
          emailNode.value = node;
        }
        if (node.group === 'profile' && node.attributes.name === 'traits.given_name') {
          givenName.value = node;
        }
        if (node.group === 'profile' && node.attributes.name === 'traits.family_name') {
          familyName.value = node;
        }
        if (node.group === 'profile' && node.attributes.name === 'traits.personal_id') {
          personalId.value = node;
        }
        if (node.group === 'profile' && node.attributes.name === 'traits.birth_date') {
          birthDate.value = node;
        }
      });
      loading.value = false;
    })
    .catch(() => {
      router.push('/error');
    });
});

function formSubmit(actionName) {
  nextTick(() => {
    if (actionName === 'changePassword') {
      passwordChange.value = true;
      return;
    }
    busy.value = true;
    if (actionName === 'changePasswordSubmit') {
      passwordForm.value.submit();
      return;
    }

    settingsForm.value.submit();
  });
}
const registerFormActions = computed(() => {
  const formActions = [];
  formActions.push({
    id: 'submit',
    icon: 'next',
    name: $t('pages.profile.buttons.continue'),
    kind: 'primary',
    busy: busy.value,
  });
  return formActions;
});
const passwordChangeFormActions = computed(() => {
  const formActions = [];
  formActions.push({
    id: 'changePasswordSubmit',
    icon: 'next',
    name: $t('pages.profile.buttons.changePassword'),
    kind: 'primary',
    busy: busy.value,
  });
  return formActions;
});
</script>
<template>
  <LxLoaderView :loading="loading">
    <LxForm
      id="settings-form"
      :showHeader="false"
      :stickyFooter="false"
      :action-definitions="registerFormActions"
      @actionClick="formSubmit"
      v-if="emailNode && givenName && familyName"
    >
      <LxRow
        :label="$t('pages.profile.email.label')"
        v-if="emailNode && emailNode.attributes.type !== 'hidden'"
      >
        <LxTextInput
          id="username"
          v-model="emailNode.attributes.value"
          :required="emailNode.attributes.required"
          :invalid="emailNode.messages.length > 0"
          :invalidationMessage="getErrorMessage(emailNode)"
        />
      </LxRow>
      <LxRow
        :label="$t('pages.profile.givenName.label')"
        v-if="givenName && givenName.attributes.type !== 'hidden'"
      >
        <LxTextInput
          id="givenName"
          @keyup.enter="formSubmit()"
          v-model="givenName.attributes.value"
          :invalid="givenName.messages.length > 0"
          :invalidationMessage="getErrorMessage(givenName)"
        />
      </LxRow>
      <LxRow
        :label="$t('pages.profile.familyName.label')"
        v-if="familyName && familyName.attributes.type !== 'hidden'"
      >
        <LxTextInput
          id="familyName"
          @keyup.enter="formSubmit()"
          v-model="familyName.attributes.value"
          :invalid="familyName.messages.length > 0"
          :invalidationMessage="getErrorMessage(familyName)"
        />
      </LxRow>
      <LxRow
        :label="$t('pages.profile.personalId.label')"
        v-if="personalId && personalId.attributes && personalId.attributes.type !== 'hidden'"
      >
        <template #info>{{ $t('pages.profile.personalId.tooltip') }}</template>
        <LxTextInput
          id="personalId"
          @keyup.enter="formSubmit()"
          v-model="personalId.attributes.value"
          :invalid="personalId.messages.length > 0"
          :placeholder="$t('pages.profile.personalId.placeholder')"
          :invalidationMessage="getErrorMessage(personalId)"
        />
      </LxRow>
      <LxRow
        :label="$t('pages.profile.birthDate.label')"
        v-if="birthDate && birthDate.attributes && birthDate.attributes.type !== 'hidden'"
      >
        <template #info>{{ $t('pages.profile.birthDate.tooltip') }}</template>
        <LxDateTimePicker
          id="birthDate"
          kind="date"
          @keyup.enter="formSubmit()"
          v-model="birthDate.attributes.value"
          :invalid="birthDate.messages.length > 0"
          :invalidationMessage="getErrorMessage(birthDate)"
        />
      </LxRow>
    </LxForm>
    <br />
    <LxForm
      id="passwordChangeForm"
      :showHeader="false"
      :stickyFooter="false"
      :action-definitions="passwordChangeFormActions"
      @actionClick="formSubmit"
      v-if="passwordNode"
    >
      <LxRow :label="$t('pages.profile.password.label')" v-if="passwordNode">
        <LxTextInput
          id="password"
          kind="password"
          @keyup.enter="formSubmit()"
          v-model="passwordNode.attributes.value"
          :invalid="passwordNode.messages.length > 0"
          :invalidationMessage="getErrorMessage(passwordNode)"
        />
      </LxRow>
    </LxForm>
    <form :action="flow.ui.action" :method="flow.ui.method" ref="oidcForm" v-if="flow">
      <input type="hidden" name="provider" :value="selectedProvider" />
      <input type="hidden" name="csrf_token" :value="csrfToken" />
    </form>
    <form :action="flow.ui.action" :method="flow.ui.method" ref="settingsForm" v-if="flow">
      <input type="hidden" name="method" value="profile" />
      <input type="hidden" name="traits.email" :value="emailNode.attributes.value" />
      <input type="hidden" name="traits.given_name" :value="givenName.attributes.value" />
      <input type="hidden" name="traits.family_name" :value="familyName.attributes.value" />
      <input type="hidden" name="traits.personal_id" :value="personalId?.attributes?.value" />
      <input type="hidden" name="traits.birth_date" :value="birthDate?.attributes?.value" />
      <input type="hidden" name="csrf_token" :value="csrfToken" />
    </form>
    <form :action="flow.ui.action" :method="flow.ui.method" ref="passwordForm" v-if="flow">
      <input type="hidden" name="method" value="password" />
      <input type="hidden" name="password" :value="passwordNode?.attributes?.value" />
      <input type="hidden" name="csrf_token" :value="csrfToken" />
    </form>
  </LxLoaderView>
</template>
