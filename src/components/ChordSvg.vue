<script setup>
import { render } from "@akordi/jtab";
import { ChordBox } from "vexchords";
import { onMounted, ref, watch } from "vue";

const chord = ref(null);
const props = defineProps({
  chord: {
    type: String,
    default: false,
  },
  instrument: {
    type: String,
    default: "guitar",
  },
});
const theme = ref("light");
const ukuleleChords = {
  Am: [[4, 2]],
  A: [
    [3, 1],
    [4, 2],
  ],
  A7: [[3, 1]],
  Bb: [
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 3],
  ],
  C: [[1, 3]],
  C7: [[1, 1, "1"]],
  D: [
    [1, 5],
    [2, 2],
    [3, 2],
    [4, 2],
  ],
  Dm: [
    [2, 1],
    [3, 2],
    [4, 2],
  ],
  Em: [
    [1, 2, "1"],
    [2, 3, "2"],
    [3, 4, "3"],
    [4, 0, "x"],
  ],
  F: [
    [2, 1, "1"],
    [4, 2, "2"],
  ],
  G: [
    [1, 2, "2"],
    [2, 3, "3"],
    [3, 2, "1"],
  ],
  G7: [
    [1, 2, "3"],
    [2, 1, "1"],
    [3, 2, "2"],
  ],
  D7: [
    [2, 2, "2"],
    [4, 2, "1"],
  ],
};
watch(
  () => props.instrument,
  (first, second) => {
    renderChordSvg();
  }
);
watch(
  () => props.chord,
  (first, second) => {
    renderChordSvg();
  }
);
function renderChordSvg() {
  chord.value.innerHTML = "";
  if (!props.chord) {
    return;
  }
  if (props.instrument === "guitar") {
    render(chord.value, props.chord);
    // fix for chords that render as empty blocks, e.g. G/A
    const chordName = chord.value.querySelectorAll(".chord-name");
    if (!chordName.length) {
      // remove empty chord
      chord.value.innerHTML = "";
    }
  }

  if (props.instrument === "ukulele") {
    if (!ukuleleChords[props.chord]) {
      console.log(`Chord ${props.chord} not found in ukulele chords`);
      return;
    }
    var chordTab = ukuleleChords[props.chord];

    const vexChord = new ChordBox(chord.value, {
      width: 120, // canvas width
      height: 150, // canvas height
      y: 0,
      numStrings: 4,
      defaultColor: theme.value === "light" ? "#090067" : "#fff", // default color
      bgColor: theme.value === "light" ? "#fff" : "#27282d", // background color
    });
    vexChord.draw({
      // array of [string, fret, label (optional)]
      chord: chordTab,

      // optional: tuning keys
      tuning: ["G", "C", "E", "A"],
    });
    vexChord.drawText(60, 0, props.chord, {
      family: "Arial",
      weight: "normal",
      size: 20,
      stroke: "none",
      fill: theme.value === "light" ? "#090067" : "#fff",
    });
  }
}
onMounted(() => {
  for (let i = 0; i < document.body.classList.length; i++) {
    if (document.body.classList[i] === "lx-theme-dark") {
      theme.value = "dark";
    }
    if (document.body.classList[i] === "lx-theme-contrast") {
      theme.value = "constrast";
    }
  }
  renderChordSvg();
});
</script>
<style>
.note-open,
.note-muted,
.fret-label,
.chord-svg path {
  stroke: var(--color-data);
}
.chord-name {
  fill: var(--color-data);
}
.chord-svg circle {
  fill: var(--color-interactive-background);
  stroke: var(--color-interactive-background);
}
</style>
<template>
  <div ref="chord" class="chord-svg"></div>
</template>
