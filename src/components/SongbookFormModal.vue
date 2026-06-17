<script setup>
import { LxModal, LxRow, LxTextInput } from '@dativa-lv/lx-ui';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import useVuelidate from '@vuelidate/core';
import * as validations from '@vuelidate/validators';

import songbookService from '@/services/songbookService';
import useNotifyStore from '@/stores/useNotifyStore';

const $t = useI18n().t;
const notificationStore = useNotifyStore();
const withI18nMessage = validations.createI18nMessage({ t: $t });

const emit = defineEmits(['created', 'updated', 'deleted']);

const modal = ref();
const saving = ref(false);
const deleting = ref(false);
const isNew = ref(true);
const item = ref({ name: '' });

const required = withI18nMessage(validations.required);
const rules = { name: { required } };
const v = useVuelidate(rules, item);

const title = computed(() => (isNew.value ? $t('pages.songbook.add') : $t('pages.songbook.edit')));

const actionDefinitions = computed(() => {
  const actions = [{ id: 'save', name: $t('save'), icon: 'save', busy: saving.value }];
  if (!isNew.value) {
    actions.push({
      id: 'delete',
      name: $t('delete'),
      icon: 'delete',
      kind: 'tertiary',
      destructive: true,
      busy: deleting.value,
    });
  }
  actions.push({ id: 'cancel', name: $t('cancel'), kind: 'secondary' });
  return actions;
});

function open(existing = null) {
  if (existing) {
    isNew.value = false;
    item.value = { id: existing.id, name: existing.name };
  } else {
    isNew.value = true;
    item.value = { name: '' };
  }
  v.value.$reset();
  modal.value?.open();
}

function close() {
  modal.value?.close();
}

async function save() {
  const isValid = await v.value.$validate();
  if (!isValid) {
    notificationStore.pushError($t('error.validation'));
    return;
  }
  saving.value = true;
  try {
    const wasNew = isNew.value;
    const resp = await songbookService.save(item.value);
    notificationStore.pushSuccess($t('pages.songbook.save.success'));
    close();
    if (wasNew) {
      emit('created', resp.data);
    } else {
      emit('updated', { ...item.value, ...resp.data });
    }
  } catch (err) {
    notificationStore.pushError($t('pages.songbook.save.error'));
  } finally {
    saving.value = false;
  }
}

async function remove() {
  deleting.value = true;
  try {
    await songbookService.delete(item.value.id);
    notificationStore.pushSuccess($t('pages.songbook.delete.success'));
    close();
    emit('deleted', item.value.id);
  } catch (err) {
    notificationStore.pushError($t('pages.songbook.delete.error'));
  } finally {
    deleting.value = false;
  }
}

function actionClicked(actionName) {
  if (actionName === 'save') {
    save();
  } else if (actionName === 'delete') {
    remove();
  } else if (actionName === 'cancel') {
    close();
  }
}

defineExpose({ open, close });
</script>

<template>
  <LxModal
    ref="modal"
    :label="title"
    size="m"
    :action-definitions="actionDefinitions"
    @action-click="actionClicked"
  >
    <LxRow :label="$t('pages.songbook.name')">
      <LxTextInput
        id="songbookNameInput"
        v-model="item.name"
        :invalid="v.name.$error"
        :invalidation-message="v.name.$error && v.name.$errors[0].$message"
        @keyup.enter="save"
      />
    </LxRow>
  </LxModal>
</template>
