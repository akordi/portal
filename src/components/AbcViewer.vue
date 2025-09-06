<script setup>
import { onMounted, ref, watch, nextTick } from 'vue';
import abcjs from 'abcjs';

const props = defineProps({
  abc: { type: String, default: '' },
});
const emit = defineEmits(['audio-unsupported']);

const paperRef = ref(null);
const audioRef = ref(null);
let synthControl = null;
let visualObj = null;

function clearRendered() {
  if (paperRef.value) {
    paperRef.value.innerHTML = '';
  }
  if (audioRef.value) {
    audioRef.value.innerHTML = '';
  }
  synthControl = null;
  visualObj = null;
}

async function renderAbc() {
  if (!props.abc) {
    clearRendered();
    return;
  }
  await nextTick();
  clearRendered();
  const visualOptions = { responsive: 'resize' };
  const out = abcjs.renderAbc(paperRef.value, props.abc, visualOptions);
  visualObj = out[0];
  // Audio controls
  synthControl = new abcjs.synth.SynthController();
  synthControl.load(audioRef.value, null, {
    displayPlay: true,
    displayProgress: true,
    displayClock: true,
  });
  synthControl.disable(true);
  if (abcjs.synth.supportsAudio()) {
    const midiBuffer = new abcjs.synth.CreateSynth();
    try {
      await midiBuffer.init({ visualObj, options: {} });
      await synthControl.setTune(visualObj, true);
      const el = audioRef.value?.querySelector('.abcjs-inline-audio');
      el?.classList.remove('disabled');
    } catch (e) {
      console.warn('ABC audio init failed', e);
    }
  } else {
    emit('audio-unsupported');
  }
}

onMounted(renderAbc);
watch(() => props.abc, renderAbc);
</script>

<template>
  <div class="abc-viewer">
    <div ref="paperRef"></div>
    <div ref="audioRef"></div>
  </div>
</template>

<style>
.lx .abcjs-inline-audio {
  height: 26px;
  padding: 0 5px;
  border-radius: 3px;
  background-color: #424242;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.lx .abcjs-inline-audio.abcjs-disabled { opacity: 0.5; }

.lx .abcjs-inline-audio .abcjs-btn {
  display: block;
  width: 28px;
  min-width: 28px;
  height: 34px;
  min-height: 34px;
  margin-right: 2px;
  padding: 7px 4px;
  background: none !important;
  border: 1px solid transparent;
  box-sizing: border-box;
  line-height: 1;
}
.lx .abcjs-btn g { fill: #f4f4f4; stroke: #f4f4f4; }
.lx .abcjs-inline-audio .abcjs-btn:hover g { fill: #cccccc; stroke: #cccccc; }
.lx .abcjs-inline-audio .abcjs-midi-selection.abcjs-pushed,
.lx .abcjs-inline-audio .abcjs-midi-loop.abcjs-pushed,
.lx .abcjs-inline-audio .abcjs-midi-reset.abcjs-pushed {
  border: 1px solid #cccccc;
  background-color: #666666;
  box-sizing: border-box;
}
.lx .abcjs-inline-audio .abcjs-midi-start .abcjs-pause-svg,
.lx .abcjs-inline-audio .abcjs-midi-start .abcjs-loading-svg { display: none; }
.lx .abcjs-inline-audio .abcjs-midi-start.abcjs-pushed .abcjs-play-svg,
.lx .abcjs-inline-audio .abcjs-midi-start.abcjs-loading .abcjs-play-svg { display: none; }
.lx .abcjs-inline-audio .abcjs-midi-start.abcjs-pushed .abcjs-pause-svg { display: block; }
.lx .abcjs-inline-audio .abcjs-midi-progress-background {
  background-color: #424242;
  height: 10px;
  border-radius: 5px;
  border: 2px solid #cccccc;
  margin: 0 8px 0 15px;
  position: relative;
  flex: 1;
  padding: 0;
  box-sizing: border-box;
}
.lx .abcjs-inline-audio .abcjs-midi-progress-indicator {
  width: 20px;
  margin-left: -10px;
  height: 14px;
  background-color: #f4f4f4;
  position: absolute;
  display: inline-block;
  border-radius: 6px;
  top: -4px;
  left: 0;
  box-sizing: border-box;
}
.lx .abcjs-inline-audio .abcjs-midi-clock {
  margin-left: 4px;
  margin-top: 1px;
  margin-right: 2px;
  display: inline-block;
  font-family: sans-serif;
  font-size: 16px;
  box-sizing: border-box;
  color: #f4f4f4;
}
.lx .abcjs-inline-audio .abcjs-tempo-wrapper { font-size: 10px; color: #f4f4f4; display:flex; align-items:center; }
.lx .abcjs-inline-audio .abcjs-midi-tempo { border-radius:2px; border:none; margin:0 2px 0 4px; width:42px; padding-left:2px; }
.lx .abcjs-inline-audio .abcjs-loading .abcjs-loading-svg { display: inherit; }
.lx .abcjs-inline-audio .abcjs-loading { outline:none; animation: abcjs-spin 1s linear infinite; }
.lx .abcjs-inline-audio .abcjs-loading-svg circle { stroke: #f4f4f4; }
@keyframes abcjs-spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
.lx .abcjs-large .abcjs-inline-audio { height: 52px; }
.lx .abcjs-large .abcjs-btn { width:56px; min-width:56px; height:52px; min-height:52px; font-size:28px; padding:6px 8px; }
.lx .abcjs-large .abcjs-midi-progress-background { height:20px; border:4px solid #cccccc; }
.lx .abcjs-large .abcjs-midi-progress-indicator { height:28px; top:-8px; width:40px; }
.lx .abcjs-large .abcjs-midi-clock { font-size:32px; margin-right:10px; margin-left:10px; margin-top:-1px; }
.lx .abcjs-large .abcjs-midi-tempo { font-size:20px; width:50px; }
.lx .abcjs-large .abcjs-tempo-wrapper { font-size:20px; }
.lx .abcjs-css-warning { display:none; }
</style>
