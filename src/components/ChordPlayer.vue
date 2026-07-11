<script setup>
/**
 * Plays a YouTube video and shows which chord to play now and what comes next
 * on a scrolling timeline: the chords within a fixed time span (VIEW_SPAN_SEC)
 * are laid out proportionally on a track that scrolls continuously under a fixed
 * playhead, so the current chord sits at the playhead, the upcoming progression
 * is always visible ahead of it, and nothing jumps when the chord changes.
 * Custom markup (iframe + timeline) lives here in a component, per LX UI
 * conventions.
 */
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { activeSegmentIndex, youtubeId } from '@/utils/chordSync';

const { t: $t } = useI18n();

const props = defineProps({
  videoUrl: { type: String, default: '' },
  segments: { type: Array, default: () => [] },
  duration: { type: Number, default: 0 },
});

// Fixed-playhead scroller. The playhead stays put and the chord strip scrolls
// continuously under it based on playback time, so nothing jumps when the chord
// changes and the whole upcoming progression stays visible to the right.
//   VIEW_SPAN_SEC  — seconds of the song visible across the track width
//   LEAD_FRACTION  — playhead position from the left (a little past context on
//                    the left, the rest is look-ahead)
const VIEW_SPAN_SEC = 20;
const LEAD_FRACTION = 0.15;

const mount = ref(null);
const currentTime = ref(0);
const ready = shallowRef(false);
let player = null;
let tick = null;

const videoId = computed(() => youtubeId(props.videoUrl));
const activeIndex = computed(() => activeSegmentIndex(props.segments, currentTime.value));

// Start of the visible time viewport. Clamped at 0 so the intro doesn't scroll
// in from empty space before playback; once past the lead-in the viewport
// tracks currentTime so the strip scrolls smoothly and the playhead is fixed.
const viewStart = computed(() => Math.max(0, currentTime.value - LEAD_FRACTION * VIEW_SPAN_SEC));

// Only the chords overlapping the viewport are rendered; the rest are off-track.
const visibleSegments = computed(() => {
  const start = viewStart.value;
  const end = start + VIEW_SPAN_SEC;
  const out = [];
  for (let i = 0; i < props.segments.length; i += 1) {
    const seg = props.segments[i];
    if (seg.end >= start && seg.start <= end) {
      out.push({ seg, index: i });
    }
  }
  return out;
});

// Position/size a chord block as a percentage of the visible time span, so its
// width stays proportional to its duration and it scrolls left as time passes.
function blockStyle(seg) {
  return {
    left: `${((seg.start - viewStart.value) / VIEW_SPAN_SEC) * 100}%`,
    width: `${((seg.end - seg.start) / VIEW_SPAN_SEC) * 100}%`,
  };
}

// The playhead is effectively fixed once past the lead-in (currentTime -
// viewStart == LEAD_FRACTION * span); during the lead-in it rides from the left
// edge up to that resting position.
const playheadStyle = computed(() => {
  const pct = ((currentTime.value - viewStart.value) / VIEW_SPAN_SEC) * 100;
  return { left: `${Math.min(100, Math.max(0, pct))}%` };
});

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

function stopTicking() {
  if (tick) {
    clearInterval(tick);
    tick = null;
  }
}

function startTicking() {
  stopTicking();
  // 150 ms is smooth enough to track chord changes without busy-looping.
  tick = setInterval(() => {
    if (player && typeof player.getCurrentTime === 'function') {
      currentTime.value = player.getCurrentTime();
    }
  }, 150);
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
      },
      onStateChange: (event) => {
        // 1 = playing → track time; anything else → stop the ticker.
        if (event.data === 1) {
          startTicking();
        } else {
          stopTicking();
        }
      },
    },
  });
}

function seek(seg) {
  if (player && typeof player.seekTo === 'function') {
    player.seekTo(seg.start, true);
    player.playVideo();
    currentTime.value = seg.start;
  }
}

watch(
  videoId,
  (id) => {
    if (!id) {
      return;
    }
    if (player && typeof player.loadVideoById === 'function') {
      player.loadVideoById(id);
    } else {
      build();
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  stopTicking();
  if (player && typeof player.destroy === 'function') {
    player.destroy();
    player = null;
  }
});
</script>

<template>
  <div class="chord-player">
    <div class="chord-player-stage">
      <div ref="mount" class="chord-player-frame"></div>
    </div>

    <!-- Scrolling chord track: the chords overlapping the visible time span are
         laid out proportionally and scroll left under a fixed playhead as the
         song plays, so the current chord sits at the playhead and the upcoming
         progression is always visible ahead of it. -->
    <div class="chord-player-track">
      <!-- Rendered as role=button divs (not <button>) so the global LX UI
           button sizing doesn't clamp the proportional width to a min square.
           The visible text is the label only, so the accessible name matches
           the chord exactly. -->
      <div
        v-for="item in visibleSegments"
        :key="item.index"
        class="chord-block"
        role="button"
        tabindex="0"
        :class="{ 'is-active': item.index === activeIndex, 'is-past': item.index < activeIndex }"
        :style="blockStyle(item.seg)"
        :title="`${item.seg.label} · ${fmt(item.seg.end - item.seg.start)}`"
        @click="seek(item.seg)"
        @keydown.enter.prevent="seek(item.seg)"
        @keydown.space.prevent="seek(item.seg)"
      >
        <span class="chord-block-label">{{ item.seg.label }}</span>
      </div>
      <div class="chord-player-playhead" :style="playheadStyle"></div>
    </div>
  </div>
</template>

<style scoped>
.chord-player {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 100%;
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

/* Windowed track --------------------------------------------------------- */
.chord-player-track {
  position: relative;
  width: 100%;
  height: 3.75rem;
  background: var(--color-region-2, #eee);
  border: 1px solid var(--color-chrome, #e0e0e0);
  border-radius: 8px;
  overflow: hidden;
  box-sizing: border-box;
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
  display: flex;
  align-items: center;
  justify-content: center;
  /* left transitions so the strip scrolls smoothly between the 150 ms time
     samples instead of stepping; background-color for the active highlight. */
  transition: left 0.15s linear, background-color 0.15s ease;
}
.chord-block:focus-visible {
  outline: 2px solid var(--color-brand, #18bc9c);
  outline-offset: -2px;
}
.chord-block-label {
  padding: 0 0.35rem;
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
  transition: left 0.15s linear;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .chord-player-playhead,
  .chord-block {
    transition: none;
  }
}
</style>
