<script setup>
import { computed, shallowRef, watchEffect } from 'vue';

const props = defineProps({
  chord: {
    type: String,
    required: false,
  },
  root: {
    type: String,
    required: false,
  },
  suffix: {
    type: String,
    required: false,
  },
  instrument: {
    type: String,
    default: 'guitar',
  },
  width: {
    type: Number,
    default: null,
  },
  height: {
    type: Number,
    default: 120,
  },
});

const actualWidth = computed(() => {
  if (props.width) return props.width;
  return props.instrument === 'ukulele' || props.instrument === 'baritone-ukulele' ? 100 : 120;
});

const suffixMapping = {
  '': 'major',
  m: 'minor',
  min: 'minor',
  maj: 'major',
  dim: 'dim',
  diminished: 'dim',
  aug: 'aug',
  augmented: 'aug',
  maj7add9: 'maj9',
  '7add9': '9',
  m7add9: 'm9',
  5: '5',
};

const currentDb = shallowRef(null);

watchEffect(async () => {
  if (props.instrument === 'ukulele') {
    const db = await import('@tombatossals/chords-db/lib/ukulele.json');
    currentDb.value = db.default;
  } else if (props.instrument === 'baritone-ukulele') {
    const db = await import('@/db/baritone-ukulele.json');
    currentDb.value = db.default;
  } else {
    const db = await import('@tombatossals/chords-db/lib/guitar.json');
    currentDb.value = db.default;
  }
});

const instrumentSettings = computed(() => {
  if (props.instrument === 'ukulele') {
    return {
      strings: 4,
      fretsOnChord: 4,
      db: currentDb.value,
      tuning: ['G', 'C', 'E', 'A'],
    };
  }
  if (props.instrument === 'baritone-ukulele') {
    return {
      strings: 4,
      fretsOnChord: 4,
      db: currentDb.value,
      tuning: ['D', 'G', 'B', 'E'],
    };
  }
  return {
    strings: 6,
    fretsOnChord: 5,
    db: currentDb.value,
    tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
  };
});

const romanMap = {
  3: 'III',
  5: 'V',
  7: 'VII',
  9: 'IX',
  12: 'XII',
  15: 'XV',
  17: 'XVII',
  19: 'XIX',
  21: 'XXI',
};

function normalizeRoot(rawRoot, instrument) {
  let root = rawRoot;
  // Common mappings (Sharps to Flats where common)
  const commonMapping = {
    'A#': 'Bb',
    'D#': 'Eb',
    'G#': 'Ab',
  };

  if (commonMapping[root]) {
    root = commonMapping[root];
  }

  if (instrument === 'ukulele') {
    // Ukulele uses Flats for C# and F#
    const ukeMapping = {
      'C#': 'Db',
      'F#': 'Gb',
    };
    if (ukeMapping[root]) {
      root = ukeMapping[root];
    }
  } else {
    // Guitar uses Csharp and Fsharp spelled out
    // Maps C#/Db -> Csharp and F#/Gb -> Fsharp
    const guitarMapping = {
      Db: 'Csharp',
      'C#': 'Csharp',
      Gb: 'Fsharp',
      'F#': 'Fsharp',
    };
    if (guitarMapping[root]) {
      root = guitarMapping[root];
    }
  }
  return root;
}

const chordData = computed(() => {
  let root;
  let suffix;

  if (props.root && props.suffix !== undefined) {
    root = props.root;
    suffix = props.suffix;
  } else if (props.chord) {
    const match = props.chord.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return null;
    [, root, suffix] = match;
  } else {
    return null;
  }

  root = normalizeRoot(root, props.instrument);

  if (suffixMapping[suffix]) {
    suffix = suffixMapping[suffix];
  }

  if (!instrumentSettings.value.db) return null;
  const chordEntry = instrumentSettings.value.db.chords[root];
  if (!chordEntry) return null;

  const chordVariant = chordEntry.find((c) => c.suffix === suffix);
  return chordVariant ? chordVariant.positions[0] : null;
});

const displayChordName = computed(() => {
  if (props.chord) return props.chord;
  if (props.root && props.suffix !== undefined) {
    const s = props.suffix;
    if (s === 'major') return props.root;
    if (s === 'minor') return `${props.root}m`;
    return props.root + s;
  }
  return '';
});

// Dimensions
const dimensions = computed(() => {
  const w = actualWidth.value;
  const h = props.height;
  const padding = { top: 35, right: 30, bottom: 5, left: 6 };
  const drawingWidth = w - padding.left - padding.right;
  const drawingHeight = h - padding.top - padding.bottom;
  const { strings } = instrumentSettings.value;
  const frets = instrumentSettings.value.fretsOnChord;

  return {
    w,
    h,
    padding,
    drawingWidth,
    drawingHeight,
    stringSpacing: drawingWidth / (strings - 1),
    fretSpacing: drawingHeight / frets,
    strings,
    frets,
  };
});

// Grid Coordinates
const grid = computed(() => {
  const { padding, stringSpacing, fretSpacing, strings, frets } = dimensions.value;
  const stringLines = [];
  for (let i = 0; i < strings; i += 1) {
    stringLines.push({
      x: padding.left + i * stringSpacing,
      y1: padding.top,
      y2: padding.top + frets * fretSpacing,
    });
  }
  const fretLines = [];
  for (let i = 0; i < frets; i += 1) {
    fretLines.push({
      y: padding.top + i * fretSpacing,
      x1: padding.left,
      x2: padding.left + (strings - 1) * stringSpacing,
    });
  }
  return { stringLines, fretLines };
});

// Render Data
const renderData = computed(() => {
  if (!chordData.value) return null;
  const { frets: fretPositions, fingers, baseFret, barres } = chordData.value;
  const { padding, stringSpacing, fretSpacing, strings } = dimensions.value;

  const dots = [];
  const openMute = [];
  const barreElements = [];

  // Process dots and open/mute
  fretPositions.forEach((fret, index) => {
    // Reverse string index mapping:
    // chords-db: 0 is lowest string (Low E for guitar)
    // SVG X position: 0 is left. Standard charts: Left is Low E.
    // So index 0 map to X position 0? yes.
    // But check chords-db ordering.
    // Guitar: E A D G B E -> chords-db standard
    // Visual: Left to Right -> E A D G B E (Standard)
    // So index i maps to string line i.
    const stringIdx = index; // 0 to N-1
    const x = padding.left + stringIdx * stringSpacing;

    if (fret === -1) {
      openMute.push({ x, type: 'mute' });
    } else if (fret === 0) {
      openMute.push({ x, type: 'open' });
    } else {
      // Fret position relative to nut/baseFret
      // chords-db uses relative frets (1-based index in the diagram)
      const relativeFret = fret;
      if (relativeFret > 0) {
        dots.push({
          x,
          y: padding.top + (relativeFret - 0.5) * fretSpacing,
          finger: fingers && fingers[index] > 0 ? fingers[index] : null,
        });
      }
    }
  });

  // Barres
  if (barres && barres.length) {
    barres.forEach((barreFret) => {
      const relativeFret = barreFret;
      if (relativeFret <= 0) return;

      // Find start and end strings
      let minString = strings;
      let maxString = -1;

      fretPositions.forEach((fret, idx) => {
        if (fret === barreFret) {
          if (idx < minString) minString = idx;
          if (idx > maxString) maxString = idx;
        }
      });

      if (maxString >= 0) {
        const x1 = padding.left + minString * stringSpacing;
        const x2 = padding.left + maxString * stringSpacing;
        const y = padding.top + (relativeFret - 0.5) * fretSpacing;
        barreElements.push({ x1, x2, y });
      }
    });
  }

  // Fret Markers
  const fretMarkers = [];
  const { frets: numFrets } = dimensions.value;
  for (let i = 0; i < numFrets; i += 1) {
    const absFret = baseFret + i;
    if (baseFret === 1 && absFret === 5) {
      // Don't show 5th fret marker for open chords (user preference)
    } else if (romanMap[absFret]) {
      fretMarkers.push({
        y: padding.top + (i + 0.5) * fretSpacing,
        label: romanMap[absFret],
      });
    }
  }

  // Filter dots covered by barres?
  // Usually displayed anyway or hidden. react-chords often hides single dots under barre.
  // We'll leave them for now or z-index handles it visually.

  return { dots, openMute, barreElements, baseFret, fretMarkers };
});
</script>

<template>
  <div
    class="chord-svg-container"
    :style="{ width: actualWidth + 'px', height: props.height + 'px' }"
  >
    <svg :width="actualWidth" :height="props.height" v-if="renderData">
      <!-- Grid -->
      <line
        v-for="(line, i) in grid.stringLines"
        :key="'s' + i"
        :x1="line.x"
        :y1="line.y1"
        :x2="line.x"
        :y2="line.y2"
        class="string-line"
      />
      <line
        v-for="(line, i) in grid.fretLines"
        :key="'f' + i"
        :x1="line.x1"
        :y1="line.y"
        :x2="line.x2"
        :y2="line.y"
        class="fret-line"
      />

      <!-- Nut (Bar at top if baseFret 1) -->
      <rect
        v-if="renderData.baseFret <= 1"
        :x="grid.fretLines[0].x1 - 1"
        :y="grid.fretLines[0].y - 2"
        :width="grid.fretLines[0].x2 - grid.fretLines[0].x1 + 2"
        height="4"
        class="nut-line"
      />

      <!-- Fret Markers -->
      <text
        v-for="(marker, i) in renderData.fretMarkers"
        :key="'m' + i"
        :x="actualWidth - dimensions.padding.right + 10"
        :y="marker.y"
        class="fret-marker"
        text-anchor="start"
        dominant-baseline="middle"
      >
        {{ marker.label }}
      </text>

      <!-- Barres -->
      <line
        v-for="(barre, i) in renderData.barreElements"
        :key="'b' + i"
        :x1="barre.x1"
        :y1="barre.y"
        :x2="barre.x2"
        :y2="barre.y"
        class="barre"
        stroke-linecap="round"
      />

      <!-- Dots -->
      <g v-for="(dot, i) in renderData.dots" :key="'d' + i">
        <circle :cx="dot.x" :cy="dot.y" r="7" class="finger-dot" />
        <text v-if="dot.finger" :x="dot.x" :y="dot.y + 4" text-anchor="middle" class="finger-label">
          {{ dot.finger }}
        </text>
      </g>

      <!-- Open/Mute -->
      <g v-for="(om, i) in renderData.openMute" :key="'om' + i">
        <circle
          v-if="om.type === 'open'"
          :cx="om.x"
          :cy="dimensions.padding.top - 8"
          r="3"
          class="open-string"
          fill="none"
        />
        <text
          v-if="om.type === 'mute'"
          :x="om.x"
          :y="dimensions.padding.top - 4"
          text-anchor="middle"
          class="mute-string"
        >
          x
        </text>
      </g>

      <!-- Chord Name -->
      <text :x="actualWidth / 2 - 10" :y="20" text-anchor="middle" class="chord-title">
        {{ displayChordName }}
      </text>
    </svg>
  </div>
</template>

<style scoped>
.chord-svg-container {
  display: inline-block;
  margin: 4px;
}

.string-line {
  stroke: var(--color-data);
  stroke-width: 1;
}

.fret-line {
  stroke: var(--color-data);
  stroke-width: 1;
}

.nut-line {
  fill: var(--color-data);
}

.fret-label {
  font-size: 10px;
  fill: var(--color-data);
}

.fret-marker {
  font-size: 12px;
  font-weight: bold;
  fill: var(--color-data);
  font-family: sans-serif;
}

.barre {
  stroke: var(--color-data);
  stroke-width: 10;
  opacity: 0.8;
}

.finger-dot {
  fill: var(--color-interactive-background);
}

.open-string {
  stroke: var(--color-data);
  stroke-width: 1;
}

.mute-string {
  fill: var(--color-data);
}

.chord-title {
  fill: var(--color-data);
  font-size: 20px;
}

.finger-label {
  font-size: 12px;
  fill: var(--color-interactive-foreground);
}
</style>
