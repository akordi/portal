<script setup>
import useNotifyStore from "@/stores/useNotifyStore";
import useViewStore from "@/stores/useViewStore";
import { Configuration, FrontendApi } from "@ory/client";
import { LxForm, LxList, LxLoader, LxRow, LxTextInput } from "@wntr/lx-ui";
import { computed, nextTick, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

const t = useI18n();
const route = useRoute();
const notify = useNotifyStore();
const router = useRouter();
const viewStore = useViewStore();

const loading = ref(true);
const flowId = computed(() => route.query.flow);
const flow = ref();
const oidcForm = ref();
const passwordForm = ref();
const oidcNodes = ref([]);
const csrfToken = ref(null);
const selectedProvider = ref(null);
const identifierNode = ref(null);
const passwordNode = ref({});
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
const resolveProviderAttributes = (code) => {
  switch (code) {
    case "google":
      return {
        iconSet: "brand",
        icon: "google",
      };
    default:
      return null;
  }
};

function notifyMappedError(message) {
  switch (message.type) {
    case "error":
      notify.pushError(message.text);
      break;
    case "success":
      notify.pushSuccess(message.text);
      break;
    case "info":
      notify.pushInfo(message.text);
      break;
    case "warning":
      notify.pushWarning(message.text);
      break;
    default:
      notify.pushError(message.text);
      break;
  }
}

onMounted(() => {
  viewStore.showBack();

  ory
    .getLoginFlow({ id: flowId.value })
    .then(({ data }) => {
      flow.value = data;

      if (data.ui.messages && data.ui.messages.length > 0) {
        data.ui.messages.forEach((message) => {
          notifyMappedError(message);
        });
      }
      data.ui.nodes.forEach((node) => {
        if (node.group === "oidc") {
          const providerAttributes = resolveProviderAttributes(
            node.attributes.value
          );
          oidcNodes.value.push({
            id: node.attributes.value,

            name: t.t(`pages.login.options.${node.attributes.value}.name`),
            description: t.t(
              `pages.login.options.${node.attributes.value}.description`
            ),
            clickable: true,
            iconSet: providerAttributes?.iconSet || undefined,
            icon: providerAttributes?.icon || "next",
          });
        }
        if (node.group === "default" && node.attributes.name === "csrf_token") {
          csrfToken.value = node.attributes.value;
        }
        if (node.group === "password" && node.attributes.type === "password") {
          passwordNode.value = node;
        }
        if (node.group === "default" && node.attributes.name === "identifier") {
          identifierNode.value = node;
        }
      });
      loading.value = false;
    })
    .catch((err) => {
      if (window.config.environment === "development") console.log(err);
      router.push("/error");
    });
});
function selectProvider(id, itemId) {
  selectedProvider.value = itemId;
  nextTick(() => {
    if (oidcForm.value) {
      oidcForm.value.submit();
    }
  });
}

function passwordFormSubmit() {
  nextTick(() => {
    if (passwordForm.value) {
      passwordForm.value.submit();
    }
  });
}
const passwordFormActions = [
  {
    id: "submit",
    icon: "next",
    name: t.t("pages.login.buttons.signIn"),
    kind: "primary",
  },
];
</script>
<template>
  <LxLoader :loading="loading" />
  <div v-if="!loading">
    <LxList v-if="oidcNodes.length > 0" :items="oidcNodes" @actionClick="selectProvider" style="margin-bottom: 20px">
    </LxList>
    <LxForm :showHeader="false" :stickyFooter="false" :action-definitions="passwordFormActions"
      @buttonClick="passwordFormSubmit" v-if="identifierNode && passwordNode">
      <LxRow :label="identifierNode.meta?.label?.text">
        <LxTextInput v-model="identifierNode.attributes.value" :required="identifierNode.attributes.required"
          :invalid="identifierNode.messages.length > 0" :invalidationMessage="identifierNode.messages.length > 0 &&
            identifierNode.messages[0]?.text
            " />
      </LxRow>
      <LxRow :label="passwordNode.meta?.label?.text">
        <LxTextInput kind="password" @keyup.enter="passwordFormSubmit()" v-model="passwordNode.attributes.value"
          :invalid="passwordNode.messages.length > 0" :invalidationMessage="passwordNode.messages.length > 0 && passwordNode.messages[0]?.text
            " />
      </LxRow>
    </LxForm>
  </div>

  <form :action="flow.ui.action" :method="flow.ui.method" ref="oidcForm" v-if="flow">
    <input type="hidden" name="provider" :value="selectedProvider" />
    <input type="hidden" name="csrf_token" :value="csrfToken" />
  </form>
  <form :action="flow.ui.action" :method="flow.ui.method" ref="passwordForm"
    v-if="flow && identifierNode && passwordNode">
    <input type="hidden" name="method" value="password" />
    <input type="hidden" name="identifier" :value="identifierNode.attributes.value" />
    <input type="hidden" name="password" :value="passwordNode.attributes.value" />
    <input type="hidden" name="csrf_token" :value="csrfToken" />
  </form>
</template>
