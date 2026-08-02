<script setup>
import { LxButton, LxForm, LxInfoBox, LxRow, LxTextInput, lxDateUtils } from '@dativa-lv/lx-ui';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import useVuelidate from '@vuelidate/core';
import * as validations from '@vuelidate/validators';

import chordgenSongService from '@/services/chordgenSongService';
import useAuthStore from '@/stores/useAuthStore';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';

const $t = useI18n().t;
const route = useRoute();
const router = useRouter();
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const authStore = useAuthStore();
const isAuthorized = authStore.isAuthenticated();

const withI18nMessage = validations.createI18nMessage({ t: $t });
const required = withI18nMessage(validations.required);
const isUrl = withI18nMessage(validations.url);

// artist/title are never shown to the submitter — only the YouTube URL is
// user input. They're inherited entirely from the video's own title (see
// guessArtistTitle) and carried along only to send with the submission.
const item = ref({ youtubeUrl: '', artist: '', title: '' });
const rules = {
  youtubeUrl: { required, url: isUrl },
};
const v = useVuelidate(rules, item);

const submitting = ref(false);
const jobStatus = ref(null);
const queue = ref(null);
// Daily submission allowance for the signed-in user, from
// GET /me/chordgen-songs/limit. Null until loaded (or when the fetch fails) —
// everything reading it must degrade to "no allowance info".
const limitStatus = ref(null);

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 20 * 60 * 1000;
let pollTimer = null;
let pollDeadline = null;

const limitExhausted = computed(() => limitStatus.value?.remaining === 0);

const formActions = computed(() => [
  {
    id: 'submit',
    icon: 'add',
    name: $t('pages.chordGenerator.form.submit'),
    kind: 'primary',
    busy: submitting.value,
    // No point submitting into a guaranteed 429 — the status box explains
    // when the next slot frees up.
    disabled: limitExhausted.value,
  },
  { id: 'cancel', icon: 'cancel', name: $t('cancel'), kind: 'secondary' },
]);

// Small, best-effort banner text — no library, just enough to be human-friendly.
function formatWait(seconds) {
  if (!seconds || seconds <= 0) {
    return null;
  }
  if (seconds < 60) {
    return '< 1 min';
  }
  return `~${Math.round(seconds / 60)} min`;
}

const queueMessage = computed(() => {
  if (!queue.value) {
    return '';
  }
  const pending = queue.value.pending || 0;
  const running = queue.value.running || 0;
  if (pending === 0 && running === 0) {
    return $t('pages.chordGenerator.queue.none');
  }
  const depth = $t('pages.chordGenerator.queue.depth', { pending, running });
  const wait = formatWait(queue.value.estimatedWaitSeconds);
  if (!wait) {
    return depth;
  }
  return `${depth} · ${$t('pages.chordGenerator.queue.eta', { eta: wait })}`;
});

// Allowance line for the idle status box: how many submissions are left
// today, or — when they're used up — when the next slot frees.
const limitMessage = computed(() => {
  if (!limitStatus.value) {
    return '';
  }
  if (limitExhausted.value) {
    const time = limitStatus.value.resetAt
      ? lxDateUtils.formatDateTime(limitStatus.value.resetAt)
      : null;
    return time
      ? $t('pages.chordGenerator.limit.exhaustedUntil', { time })
      : $t('pages.chordGenerator.status.rateLimited');
  }
  return $t('pages.chordGenerator.limit.remaining', {
    remaining: limitStatus.value.remaining,
    limit: limitStatus.value.limit,
  });
});

// The idle status box: queue snapshot as the headline with the allowance as
// detail — flipped (and turned into a warning) when the allowance is used up,
// since that's the thing actually stopping the user.
const idleStatusBox = computed(() => {
  if (limitExhausted.value) {
    return { label: limitMessage.value, description: queueMessage.value, variant: 'warning' };
  }
  if (!queueMessage.value && !limitMessage.value) {
    return null;
  }
  return {
    label: queueMessage.value || limitMessage.value,
    description: queueMessage.value ? limitMessage.value : '',
    variant: 'info',
  };
});

// While a job is in flight the same info box switches to live job status —
// label is the job state, description carries queue position + ETA. One
// persistent component for both states, so nothing visually swaps out on
// submit (the busy spinner on the submit button already signals activity).
const progressLabel = computed(() => {
  if (jobStatus.value?.status === 'running') {
    return $t('pages.chordGenerator.status.running');
  }
  return $t('pages.chordGenerator.status.pending');
});

const progressDescription = computed(() => {
  if (jobStatus.value?.status !== 'pending') {
    return '';
  }
  const parts = [];
  const ahead = jobStatus.value.queueAhead;
  if (ahead != null) {
    parts.push($t('pages.chordGenerator.status.position', { count: ahead }));
  }
  // Prefer an ETA scoped to this job's queue position; fall back to the
  // whole-queue estimate when the position is unknown.
  const avg = queue.value?.avgProcessingSeconds;
  const wait = ahead != null && avg ? (ahead + 1) * avg : queue.value?.estimatedWaitSeconds;
  const eta = formatWait(wait);
  if (eta) {
    parts.push($t('pages.chordGenerator.queue.eta', { eta }));
  }
  return parts.join(' · ');
});

async function loadQueue() {
  try {
    const resp = await chordgenSongService.getQueue();
    queue.value = resp.data;
  } catch (err) {
    // Non-critical banner — a failed fetch just means no banner is shown.
  }
}

async function loadLimit() {
  try {
    const resp = await chordgenSongService.getMyLimit();
    limitStatus.value = resp.data;
  } catch (err) {
    // Non-critical: without allowance info the form just behaves as before
    // (the server still enforces the limit on submit).
  }
}

// Best-effort split of a YouTube video title into artist/title, for the
// common "Artist - Title" upload naming convention.
function splitArtistTitle(rawTitle) {
  const separators = [' - ', ' – ', ' — '];
  const sep = separators.find((candidate) => rawTitle.includes(candidate));
  if (!sep) {
    return null;
  }
  const idx = rawTitle.indexOf(sep);
  return {
    artist: rawTitle.slice(0, idx).trim(),
    title: rawTitle.slice(idx + sep.length).trim(),
  };
}

async function fetchOembedTitle(youtubeUrl) {
  try {
    const resp = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`
    );
    if (!resp.ok) {
      return null;
    }
    const data = await resp.json();
    return data?.title || null;
  } catch (err) {
    return null;
  }
}

// Artist/title are optional — this fills them in from the YouTube video's own
// title whenever possible, but never blocks submission if it can't. Splits
// "Artist - Title"-style video titles when recognisable; otherwise the whole
// video title is inherited as the song title (artist stays blank, editable).
// Never overwrites a value the submitter already typed. Any failure (network,
// non-200, unparsable) is silently ignored.
async function guessArtistTitle() {
  if (!item.value.youtubeUrl || item.value.title) {
    return;
  }
  const rawTitle = await fetchOembedTitle(item.value.youtubeUrl);
  if (!rawTitle) {
    return;
  }
  const guess = splitArtistTitle(rawTitle);
  if (guess) {
    if (!item.value.artist) {
      item.value.artist = guess.artist;
    }
    if (!item.value.title) {
      item.value.title = guess.title;
    }
  } else if (!item.value.title) {
    item.value.title = rawTitle;
  }
}

async function onYoutubeUrlBlur() {
  await guessArtistTitle();
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function pollJob(jobId) {
  if (Date.now() > pollDeadline) {
    stopPolling();
    submitting.value = false;
    // Without this, the "generating..." banner (driven by jobStatus) stays
    // stuck showing the last pending/running text forever — only the button
    // stops being busy, since jobStatus itself was never cleared.
    jobStatus.value = null;
    notificationStore.pushError($t('pages.chordGenerator.status.error'));
    return;
  }
  // Keep the queue snapshot live too — it feeds the ETA in the progress panel
  // and goes back to being the visible banner once the job finishes. Fire and
  // forget: loadQueue swallows its own failures.
  loadQueue();
  try {
    const resp = await chordgenSongService.getMyJob(jobId);
    const { data } = resp;
    if (data.status === 'done') {
      stopPolling();
      submitting.value = false;
      jobStatus.value = null;
      router.push({ name: 'chordGeneratorView', params: { id: data.songId } });
      return;
    }
    if (data.status === 'error') {
      stopPolling();
      submitting.value = false;
      jobStatus.value = null;
      notificationStore.pushError(data.error || $t('pages.chordGenerator.status.error'));
      return;
    }
    jobStatus.value = data;
  } catch (err) {
    // Transient poll failure — keep trying until the deadline.
  }
}

function startPolling(jobId) {
  pollDeadline = Date.now() + POLL_TIMEOUT_MS;
  stopPolling();
  pollJob(jobId);
  pollTimer = setInterval(() => pollJob(jobId), POLL_INTERVAL_MS);
}

async function onSubmit() {
  const isValid = await v.value.$validate();
  if (!isValid) {
    notificationStore.pushError($t('error.validation'));
    return;
  }
  // Last-resort inherit: covers submitting before the URL field ever blurred
  // (e.g. a prefilled/pasted URL followed straight by a submit click).
  await guessArtistTitle();
  submitting.value = true;
  jobStatus.value = null;
  try {
    const resp = await chordgenSongService.submit({
      youtubeUrl: item.value.youtubeUrl,
      artist: item.value.artist,
      title: item.value.title,
    });
    const { data } = resp;
    if (data.status === 'pending') {
      jobStatus.value = { status: 'pending' };
      startPolling(data.id);
      // The accepted submission consumed an allowance slot — keep the
      // status box honest for when the job finishes.
      loadLimit();
      return;
    }
    if (data.status === 'exists' || data.status === 'cached') {
      submitting.value = false;
      router.push({ name: 'chordGeneratorView', params: { id: data.song.id } });
      return;
    }
    submitting.value = false;
  } catch (err) {
    submitting.value = false;
    if (err?.response?.status === 429) {
      // The 429 body carries the reset time — tell the user when they can
      // try again, and sync the allowance box so the form disables itself.
      const resetAt = err.response.data?.resetAt;
      const time = resetAt ? lxDateUtils.formatDateTime(resetAt) : null;
      notificationStore.pushError(
        time
          ? $t('pages.chordGenerator.limit.exhaustedUntil', { time })
          : $t('pages.chordGenerator.status.rateLimited')
      );
      loadLimit();
      return;
    }
    notificationStore.pushError($t('pages.chordGenerator.errors.submitFailed'));
  }
}

function actionClicked(actionName) {
  if (actionName === 'submit') {
    onSubmit();
  } else if (actionName === 'cancel') {
    router.push({ name: 'chordGeneratorList' });
  }
}

onMounted(async () => {
  viewStore.title = $t('pages.chordGenerator.submitTitle');
  viewStore.description = '';
  viewStore.goBack = true;
  if (route.query.youtubeUrl) {
    item.value.youtubeUrl = String(route.query.youtubeUrl);
  }
  if (route.query.artist) {
    item.value.artist = String(route.query.artist);
  }
  if (route.query.title) {
    item.value.title = String(route.query.title);
  }
  if (isAuthorized) {
    await Promise.all([loadQueue(), loadLimit()]);
    await guessArtistTitle();
  }
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <template v-if="!isAuthorized">
    <LxRow>
      <LxInfoBox
        :label="$t('pages.chordGenerator.loginRequired.title')"
        :description="$t('pages.chordGenerator.loginRequired.message')"
        variant="info"
      />
    </LxRow>
    <LxRow>
      <LxButton
        kind="primary"
        icon="next"
        :label="$t('pages.chordGenerator.loginRequired.action')"
        @click="authStore.login(route.fullPath)"
      />
    </LxRow>
  </template>
  <template v-else>
    <!-- One persistent status box: the current queue snapshot while idle,
         live job status (position + ETA) while a job is in flight. The
         snapshot is refreshed on every poll so it can't go stale. -->
    <LxRow v-if="jobStatus">
      <LxInfoBox :label="progressLabel" :description="progressDescription" variant="info" />
    </LxRow>
    <LxRow v-else-if="idleStatusBox">
      <LxInfoBox
        :label="idleStatusBox.label"
        :description="idleStatusBox.description"
        :variant="idleStatusBox.variant"
      />
    </LxRow>
    <LxForm
      :action-definitions="formActions"
      @action-click="actionClicked"
      :show-header="false"
      required-mode="required-asterisk"
    >
      <LxRow
        :label="$t('pages.chordGenerator.form.youtubeUrl')"
        :description="$t('pages.chordGenerator.form.youtubeUrlHint')"
        :required="true"
      >
        <LxTextInput
          id="chordGenYoutubeUrlInput"
          v-model="item.youtubeUrl"
          :invalid="v.youtubeUrl.$error"
          :invalidation-message="v.youtubeUrl.$error ? v.youtubeUrl.$errors[0].$message : ''"
          @blur="onYoutubeUrlBlur"
        />
      </LxRow>
    </LxForm>
  </template>
</template>
