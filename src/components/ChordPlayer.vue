<script setup>
/**
 * Plays a YouTube video and shows which chord to play now and what comes next
 * on a timeline: the song's chords are laid out once, in proportion to their
 * length, on a strip that scrolls under a fixed playhead every animation
 * frame. A long chord's name sticks to the playhead while it plays.
 * Custom markup (iframe + timeline) lives here in a component, per LX UI
 * conventions.
 */
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { LxButton, LxValuePicker } from '@akordi/lx-ui';

import ChordSvg from '@/components/ChordSvg.vue';
import {
  activeSegmentIndex,
  createPlaybackClock,
  stripPosition,
  youtubeId,
} from '@/utils/chordSync';
import { capoForOffset, isNoChord, transposeChord } from '@/utils/chordName';

const { t: $t } = useI18n();

const props = defineProps({
  videoUrl: { type: String, default: '' },
  segments: { type: Array, default: () => [] },
  duration: { type: Number, default: 0 },
  // Opt-in side panel with fingering diagrams for every chord in the song,
  // highlighting the one under the playhead. Off by default so existing
  // usages (SongView play-along renders its own diagram grid) are unchanged.
  showDiagrams: { type: Boolean, default: false },
  instrument: { type: String, default: 'guitar' },
  // Opt-in transpose control (±semitones with a capo hint). Off by default:
  // SongView's play-along already has a body-level transpose, and a second
  // transposer there would fight it.
  hasTranspose: { type: Boolean, default: false },
});

const emit = defineEmits(['update:instrument']);

// Practice speeds the YouTube player reliably supports on any video.
const PLAYBACK_RATES = [0.5, 0.75, 1];
// Display transpose bounds: every distinct pitch is reachable within ±11.
const TRANSPOSE_MIN = -11;
const TRANSPOSE_MAX = 11;
// Capo suggestions above this fret are impractical on a real neck.
const CAPO_MAX_FRET = 7;

//   VIEW_SPAN_SEC  — seconds of the song visible across the track width
//   LEAD_FRACTION  — playhead position from the left (a little past context on
//                    the left, the rest is look-ahead)
const VIEW_SPAN_SEC = 20;
const LEAD_FRACTION = 0.15;
// A chord longer than the track left of the playhead would scroll its name
// out of view while still playing: its name starts at the block's start and
// sticks to the playhead while it plays. Shorter chords centre their name.
const LONG_CHORD_SEC = LEAD_FRACTION * VIEW_SPAN_SEC;

const mount = ref(null);
const strip = ref(null);
const playhead = ref(null);
const activeIndex = ref(-1);
// The one chord in the tab order; arrow keys move between chords.
const focusIndex = computed(() => Math.max(0, activeIndex.value));
function isLong(seg) {
  return seg.end - seg.start > LONG_CHORD_SEC;
}
const ready = shallowRef(false);
let player = null;
let animationFrame = null;
const clock = createPlaybackClock();

const videoId = computed(() => youtubeId(props.videoUrl));

// Playback speed — applied to the YouTube player, remembered across song
// switches within the component's lifetime.
const playbackRate = ref(1);

// Display transpose in semitones. Affects labels only (timeline + diagrams);
// timing and playback are untouched.
const transpose = ref(0);

const speedOptions = PLAYBACK_RATES.map((rate) => ({ id: String(rate), name: `${rate}×` }));

const speedId = computed({
  get: () => String(playbackRate.value),
  set: (value) => {
    playbackRate.value = Number(value);
  },
});

function applyPlaybackRate() {
  if (player && typeof player.setPlaybackRate === 'function') {
    player.setPlaybackRate(playbackRate.value);
  }
}

function bumpTranspose(step) {
  transpose.value = Math.min(TRANSPOSE_MAX, Math.max(TRANSPOSE_MIN, transpose.value + step));
}

const transposeLabel = computed(() =>
  transpose.value > 0 ? `+${transpose.value}` : String(transpose.value)
);

// "Play these easier shapes with a capo and it still sounds like the record."
// Only meaningful when transposed, and only for frets a real capo reaches.
const capoHint = computed(() => {
  if (!props.hasTranspose || transpose.value === 0) {
    return '';
  }
  const fret = capoForOffset(transpose.value);
  if (fret < 1 || fret > CAPO_MAX_FRET) {
    return '';
  }
  return $t('pages.playAlong.capoHint', { fret });
});

// Segments as displayed: original timing, labels transposed when the control
// is active. Everything downstream (timeline, diagrams) reads these.
const displaySegments = computed(() => {
  if (!props.hasTranspose || transpose.value === 0) {
    return props.segments;
  }
  return props.segments.map((seg) => ({
    ...seg,
    label: transposeChord(seg.label, transpose.value),
  }));
});

// Diagram panel data: every distinct chord of the song, in order of first
// appearance. Deliberately NOT synced to the playhead — the timeline already
// highlights the current chord, and a second moving highlight reads as
// fragmented; the panel is a static fingering reference. No-chord markers
// (N/N.C.) belong on the timeline as gaps, not in the fingering panel.
const uniqueChords = computed(() => {
  const seen = new Set();
  const out = [];
  displaySegments.value.forEach((seg) => {
    if (seg.label && !isNoChord(seg.label) && !seen.has(seg.label)) {
      seen.add(seg.label);
      out.push(seg.label);
    }
  });
  return out;
});

const instrumentOptions = computed(() => [
  { id: 'guitar', name: $t('pages.chordsLibrary.showGuitarChords.label') },
  { id: 'ukulele', name: $t('pages.chordsLibrary.showUkuleleChords.label') },
  { id: 'baritone-ukulele', name: $t('pages.chordsLibrary.showBaritoneUkuleleChords.label') },
]);

// Blocks are laid out once in song time; only the strip moves.
function blockStyle(seg) {
  return {
    left: `${(seg.start / VIEW_SPAN_SEC) * 100}%`,
    width: `${((seg.end - seg.start) / VIEW_SPAN_SEC) * 100}%`,
  };
}

// Frames write positions straight to the strip, the playhead and the current
// block, not through Vue state; Vue re-renders only when the chord changes.
function render(time) {
  if (!strip.value || !playhead.value) {
    return;
  }
  const position = stripPosition(time, VIEW_SPAN_SEC, LEAD_FRACTION);
  strip.value.style.transform = `translateX(-${position.offset}%)`;
  playhead.value.style.left = `${position.playhead}%`;
  const index = activeSegmentIndex(props.segments, time);
  activeIndex.value = index;
  const seg = props.segments[index];
  const block = strip.value.children[index];
  if (seg && block && seg.end > seg.start) {
    const progress = Math.min(1, Math.max(0, (time - seg.start) / (seg.end - seg.start)));
    block.style.setProperty('--progress', String(progress));
  }
}

function fmt(seconds) {
  return `${seconds.toFixed(1)}${$t('pages.playAlong.seconds')}`;
}

// Load the YouTube IFrame Player API once; resolve when window.YT is ready.
function loadApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') {
        previous();
      }
      resolve(window.YT);
    };
    if (!document.querySelector('script[data-yt-iframe-api]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.ytIframeApi = 'true';
      document.head.appendChild(script);
    }
  });
}

function playerTime() {
  return player && typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
}

function stopFrames() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}

function startFrames() {
  stopFrames();
  clock.restart();
  const step = (now) => {
    render(clock.time(playerTime(), now, playbackRate.value));
    animationFrame = requestAnimationFrame(step);
  };
  animationFrame = requestAnimationFrame(step);
}

async function build() {
  if (!videoId.value) {
    return;
  }
  const YT = await loadApi();
  if (!mount.value) {
    return;
  }
  player = new YT.Player(mount.value, {
    videoId: videoId.value,
    // The API otherwise injects a fixed width="640" height="390" iframe. It is
    // created outside Vue, so scoped CSS never reaches it — size it here so it
    // stays fluid and never overflows narrow (mobile) layouts.
    width: '100%',
    height: '100%',
    playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
    events: {
      onReady: () => {
        ready.value = true;
        // Belt and braces: the width/height options above set the iframe
        // attributes, but pin the inline style too so a 640px attribute can
        // never win over the responsive box.
        const frame = player && typeof player.getIframe === 'function' && player.getIframe();
        if (frame) {
          frame.style.width = '100%';
          frame.style.height = '100%';
        }
        // A non-default speed picked before the player finished loading (or
        // carried over from the previous video) must survive the (re)build.
        applyPlaybackRate();
      },
      onStateChange: (event) => {
        // 1 = playing; otherwise hold the timeline where the player stopped.
        if (event.data === 1) {
          startFrames();
        } else {
          stopFrames();
          render(playerTime());
        }
      },
    },
  });
}

function seek(seg) {
  if (player && typeof player.seekTo === 'function') {
    player.seekTo(seg.start, true);
    player.playVideo();
    clock.seekTo(seg.start, performance.now());
    render(seg.start);
  }
}

async function seekBy(step) {
  const index = Math.min(props.segments.length - 1, Math.max(0, focusIndex.value + step));
  seek(props.segments[index]);
  await nextTick();
  strip.value?.children[index]?.focus({ preventScroll: true });
}

watch(playbackRate, () => {
  applyPlaybackRate();
});

watch(
  videoId,
  (id, previous) => {
    // A different song is a different key — a leftover transpose offset would
    // silently show wrong chords for it.
    if (previous !== undefined) {
      transpose.value = 0;
      render(0);
    }
    if (!id) {
      return;
    }
    if (player && typeof player.loadVideoById === 'function') {
      player.loadVideoById(id);
      // loadVideoById resets the playback rate to 1 on some clients.
      applyPlaybackRate();
    } else {
      build();
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  stopFrames();
  if (player && typeof player.destroy === 'function') {
    player.destroy();
    player = null;
  }
});
</script>

<template>
  <div class="chord-player" :class="{ 'has-diagrams': showDiagrams && uniqueChords.length }">
    <div class="chord-player-main">
      <div class="chord-player-stage">
        <div ref="mount" class="chord-player-frame"></div>
      </div>

      <div class="chord-player-track">
        <div ref="strip" class="chord-strip">
          <!-- role=button divs, not <button>: LX UI's button sizing would clamp
               the proportional width to a minimum square. -->
          <div
            v-for="(seg, index) in displaySegments"
            :key="index"
            class="chord-block"
            role="button"
            :tabindex="index === focusIndex ? 0 : -1"
            :aria-current="index === activeIndex ? 'time' : undefined"
            :class="{
              'is-active': index === activeIndex,
              'is-past': index < activeIndex,
              'is-long': isLong(seg),
            }"
            :style="blockStyle(seg)"
            :title="`${seg.label} · ${fmt(seg.end - seg.start)}`"
            @click="seek(seg)"
            @keydown.enter.prevent="seek(seg)"
            @keydown.space.prevent="seek(seg)"
            @keydown.right.prevent="seekBy(1)"
            @keydown.left.prevent="seekBy(-1)"
          >
            <span class="chord-block-label">{{ seg.label }}</span>
          </div>
        </div>
        <div ref="playhead" class="chord-player-playhead"></div>
      </div>

      <!-- Practice controls: playback speed for everyone; transpose (with a
           capo hint) only where the host view opts in. -->
      <div class="chord-player-controls">
        <!-- horizontal LxValuePicker, not LxContentSwitcher: the switcher
             collapses labels to bare index numbers below 800px viewport
             width, which turns speeds into meaningless "1 2 3" on phones. -->
        <div class="chord-player-control">
          <span class="lx-label" id="chordPlayerSpeedLabel">{{ $t('pages.playAlong.speed') }}</span>
          <LxValuePicker
            id="chordPlayerSpeedSwitcher"
            variant="tags"
            selection-kind="single"
            :items="speedOptions"
            v-model="speedId"
            label-id="chordPlayerSpeedLabel"
          />
        </div>
        <div v-if="hasTranspose" class="chord-player-control">
          <span class="lx-label">{{ $t('pages.playAlong.transpose') }}</span>
          <LxButton
            id="chordPlayerTransposeDown"
            :label="$t('pages.playAlong.transposeDown')"
            icon="subtract"
            variant="icon-only"
            kind="ghost"
            :disabled="transpose <= TRANSPOSE_MIN"
            @click="bumpTranspose(-1)"
          />
          <span class="chord-player-transpose-value lx-data">{{ transposeLabel }}</span>
          <LxButton
            id="chordPlayerTransposeUp"
            :label="$t('pages.playAlong.transposeUp')"
            icon="add"
            variant="icon-only"
            kind="ghost"
            :disabled="transpose >= TRANSPOSE_MAX"
            @click="bumpTranspose(1)"
          />
          <LxButton
            v-if="transpose !== 0"
            id="chordPlayerTransposeReset"
            :label="$t('pages.playAlong.transposeReset')"
            icon="undo"
            variant="icon-only"
            kind="ghost"
            @click="transpose = 0"
          />
          <span v-if="capoHint" class="lx-secondary chord-player-capo-hint">{{ capoHint }}</span>
        </div>
      </div>
    </div>

    <!-- Fingering panel: a static reference with one diagram per distinct
         chord in the song. Sits to the right of the video on wide screens,
         below it on narrow ones. -->
    <aside
      v-if="showDiagrams && uniqueChords.length"
      class="chord-player-diagrams"
      :aria-label="$t('pages.chordsLibrary.instrument')"
    >
      <!-- Dropdown rather than a content switcher: the side panel is too
           narrow for three instrument names, and a switcher degrades to
           truncated labels there. -->
      <LxValuePicker
        id="chordPlayerInstrumentSwitcher"
        variant="dropdown"
        selection-kind="single"
        :items="instrumentOptions"
        :model-value="instrument"
        @update:model-value="(value) => emit('update:instrument', value)"
      />
      <div class="chord-diagram-grid">
        <ChordSvg
          v-for="chord in uniqueChords"
          :key="chord"
          :chord="chord"
          :instrument="instrument"
        />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.chord-player {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 100%;
}
.chord-player-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  flex: 1 1 auto;
}

/* Practice controls ------------------------------------------------------- */
.chord-player-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.5rem;
}
.chord-player-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.chord-player-transpose-value {
  min-width: 2ch;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.chord-player-capo-hint {
  white-space: nowrap;
}

/* Diagram side panel ------------------------------------------------------ */
.chord-player-diagrams {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}
.chord-diagram-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  gap: 0.25rem;
}

/* Side-by-side once there is room for the video and a diagram column. */
@media (min-width: 64rem) {
  .chord-player.has-diagrams {
    flex-direction: row;
    align-items: flex-start;
  }
  .chord-player.has-diagrams .chord-player-diagrams {
    flex: 0 0 18rem;
  }
}
.chord-player-stage {
  position: relative;
  width: 100%;
  max-width: 720px;
  aspect-ratio: 16 / 9;
}
.chord-player-frame,
.chord-player-frame :deep(iframe) {
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 8px;
}

/* Chord track ------------------------------------------------------------ */
.chord-player-track {
  position: relative;
  width: 100%;
  height: 3.75rem;
  background: var(--color-region-2, #eee);
  border: 1px solid var(--color-chrome, #e0e0e0);
  border-radius: 8px;
  /* clip, not hidden: focusing an off-screen chord must not scroll the track. */
  overflow: clip;
  box-sizing: border-box;
}
.chord-strip {
  position: absolute;
  inset: 0;
  will-change: transform;
}
.chord-block {
  position: absolute;
  top: 0;
  bottom: 0;
  box-sizing: border-box;
  min-width: 1.75rem;
  border-right: 1px solid var(--color-chrome, #e0e0e0);
  background: transparent;
  color: var(--color-data, #333);
  font-family: monospace;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  transition: background-color 0.15s ease;
}
.chord-block:focus-visible {
  outline: 2px solid var(--color-brand, #18bc9c);
  outline-offset: -2px;
}
.chord-block-label {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  padding: 0 0.35rem;
}
.chord-block:not(.is-long) .chord-block-label {
  left: 50%;
  transform: translateX(-50%);
}
/* Sticks to the playhead until the block's end clips it. */
.chord-block.is-long.is-active .chord-block-label {
  left: calc(var(--progress, 0) * 100%);
}
.chord-block.is-past {
  opacity: 0.4;
}
.chord-block.is-active {
  background: var(--color-brand, #18bc9c);
  color: var(--color-region, #fff);
  font-weight: 700;
}
.chord-player-playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  /* Not the brand colour — the active chord block is brand-coloured, so a brand
     playhead disappears over it. Use the high-contrast data colour with a 1px
     halo in the surface colour so the line stays crisp over both the track and
     the active block, in light and dark themes. */
  background: var(--color-data, #2b2b2b);
  box-shadow: 0 0 0 1px var(--color-region, #fff);
  left: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .chord-block {
    transition: none;
  }
}
</style>
