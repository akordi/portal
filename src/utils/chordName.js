// Pure helpers for chord-name parsing, spelling, and transposition. Kept
// framework-free so they can be unit-tested without a DOM, and shared between
// the chord diagram renderer (ChordSvg) and the play-along transpose control.

// Semitone index for every root spelling we accept. Sharp and flat spellings
// of the same pitch map to the same index.
const NOTE_INDEX = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Whether a timeline label marks "no chord" (rests/noise between chords) —
 * chord recognisers emit these as N / NC / N.C. They belong on the timeline
 * as gaps but never in a fingering panel.
 * @param {string} label
 * @returns {boolean}
 */
export function isNoChord(label) {
  return typeof label === 'string' && /^n\.?c?\.?$/i.test(label.trim());
}

/**
 * Split a chord label into root, suffix, and optional slash bass note.
 * Examples: 'Am7' → {root:'A', suffix:'m7', bass:null};
 * 'D/F#' → {root:'D', suffix:'', bass:'F#'}.
 * Returns null when the label does not start with a recognisable root or the
 * slash bass is not a valid note.
 * @param {string} label
 * @returns {{root:string, suffix:string, bass:string|null}|null}
 */
export function parseChordName(label) {
  if (typeof label !== 'string') {
    return null;
  }
  const match = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(label.trim());
  if (!match) {
    return null;
  }
  const [, root, suffix, bass] = match;
  if (NOTE_INDEX[root] === undefined) {
    return null;
  }
  if (bass !== undefined && NOTE_INDEX[bass] === undefined) {
    return null;
  }
  return { root, suffix: suffix || '', bass: bass || null };
}

function transposeNote(note, semitones, preferFlats) {
  const index = NOTE_INDEX[note];
  const next = (((index + semitones) % 12) + 12) % 12;
  return preferFlats ? FLAT_SCALE[next] : SHARP_SCALE[next];
}

/**
 * Transpose a chord label by the given number of semitones, keeping the
 * suffix intact and transposing a slash bass along with the root. Spelling
 * follows the original label: a flat root stays in the flat scale, everything
 * else uses sharps. Labels that don't parse are returned unchanged so a
 * transposed timeline never loses chords it can't interpret.
 * @param {string} label
 * @param {number} semitones positive or negative
 * @returns {string}
 */
export function transposeChord(label, semitones) {
  const offset = Number(semitones);
  if (!Number.isFinite(offset) || offset === 0) {
    return label;
  }
  const parsed = parseChordName(label);
  if (!parsed) {
    return label;
  }
  const preferFlats = parsed.root.includes('b');
  let out = transposeNote(parsed.root, offset, preferFlats) + parsed.suffix;
  if (parsed.bass) {
    out += `/${transposeNote(parsed.bass, offset, parsed.bass.includes('b'))}`;
  }
  return out;
}

/**
 * The capo fret that makes chords transposed DOWN by `semitones` sound in the
 * original key: displayed + capo ≡ original (mod 12). Only frets 1..11 are
 * meaningful — 0 means "no capo needed" (offset 0).
 * @param {number} semitones the display transpose offset (any sign)
 * @returns {number} 0..11
 */
export function capoForOffset(semitones) {
  const offset = Number(semitones);
  if (!Number.isFinite(offset)) {
    return 0;
  }
  return ((-offset % 12) + 12) % 12;
}

// Suffix spellings that chords-db stores under a different name.
const DB_SUFFIX_ALIASES = {
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

/**
 * Map a chord suffix to the name chords-db uses; suffixes without an alias
 * (sus4, add9, 7, ...) are already db names and pass through unchanged.
 * @param {string} suffix
 * @returns {string}
 */
export function dbSuffix(suffix) {
  return DB_SUFFIX_ALIASES[suffix] !== undefined ? DB_SUFFIX_ALIASES[suffix] : suffix;
}

/**
 * Rewrite a root note into the spelling a chords-db instrument database keys
 * on: common sharps become flats everywhere; the ukulele db additionally uses
 * Db/Gb, while the guitar db spells those roots Csharp/Fsharp.
 * @param {string} rawRoot
 * @param {string} instrument 'guitar' | 'ukulele' | 'baritone-ukulele'
 * @returns {string}
 */
export function dbRoot(rawRoot, instrument) {
  let root = rawRoot;
  const commonMapping = {
    'A#': 'Bb',
    'D#': 'Eb',
    'G#': 'Ab',
  };
  if (commonMapping[root]) {
    root = commonMapping[root];
  }
  if (instrument === 'ukulele') {
    const ukeMapping = { 'C#': 'Db', 'F#': 'Gb' };
    if (ukeMapping[root]) {
      root = ukeMapping[root];
    }
  } else {
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
