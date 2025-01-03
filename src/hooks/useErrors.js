import useAppStore from '@/stores/useAppStore';
import useAuthStore from '@/stores/useAuthStore';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';
import useNotifyStore from '@/stores/useNotifyStore';

const validatorMsgRegex =
  /(Key: '(\S+)\.(\S+)'\s+)?Error:.*(for '(?<field>\S+)').*('(?<tag>\S+)' tag)/;

const errMsgRegex = /\[(?<code>.*)\]\s*(?<message>.*)/;

const validationMsg = {
  max: 'validation.max',
  min: 'validation.min',
  required: 'validation.required',
  numeric: 'validation.numeric',
};

const extractValidatorMessage = (msg) => {
  let match = msg.match(validatorMsgRegex);
  if (match) {
    let { field } = match.groups;
    if (field) {
      field = field.substr(0, 1).toLowerCase() + field.substr(1);
    }
    const { tag } = match.groups;
    return { field, message: validationMsg[tag] || 'validation.unknown' };
  }
  match = msg.match(errMsgRegex);
  if (match) {
    const { code, message } = match.groups;
    return { code, message };
  }
  return null;
};

const logError = () => {
  // TODO: Log error
};

export default () => {
  let i18n = {};
  onMounted(() => {
    i18n = useI18n();
  });

  const get = (error) => {
    const { response, code } = error;
    if (code === 'ECONNABORTED') {
      return { status: 499, data: null };
    }
    if (typeof response === 'undefined') {
      logError(error);
      return { status: 500, data: null };
    }
    const { request, ...errorObject } = response;
    if (errorObject.status === 422) {
      const { data } = errorObject;
      if (data) {
        const validatorMessage = extractValidatorMessage(data);
        if (validatorMessage && (validatorMessage.field || validatorMessage.code)) {
          return { status: 422, data: validatorMessage };
        }
      }
    }

    return {
      status: errorObject.status || 500,
      data: errorObject.data || null,
    };
  };

  const push = async (error) => {
    const router = useRouter();
    const authStore = useAuthStore();
    const appStore = useAppStore();
    const err = get(error);
    if (err.status === 401) {
      authStore.$reset();

      if (router) {
        router.push({ name: 'notAuthorized' });
      }
      return;
    }
    let message = null;
    if (err.status === 403) {
      message = i18n.t('errors.forbidden');
    } else if (err.status === 499) {
      // message = i18n.t('errors.loadFailed'); TODO: message is never used it this block
      return;
    } else if (err.status === 404) {
      await router.replace({ name: 'notFound' });
      return;
    }

    logError(err);

    if (err.data !== null) {
      appStore.error = err.data;
      appStore.showError = true;
    } else if (message !== null) {
      appStore.error = message;
      appStore.showError = true;
    }
  };

  return {
    get,
    push,
    pushWithNotification: async (error, defaultMessage) => {
      const notifications = useNotifyStore();
      const err = get(error);
      if (err.status >= 500 || err.status === 401 || err.status === 403) {
        await push(error);
        return false;
      }

      const { '': errors } = (err.data || {}).errors || {};
      let [message] = errors || [];
      if (!message) {
        message = defaultMessage;
      }
      notifications.pushError(message);
      return true;
    },
  };
};
