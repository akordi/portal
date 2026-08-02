import { describe, it, expect } from 'vitest';
import {
  parseChordName,
  transposeChord,
  capoForOffset,
  dbSuffix,
  dbRoot,
  isNoChord,
} from '@/utils/chordName';

describe('parseChordName', () => {
  it('parses plain majors and minors', () => {
    expect(parseChordName('C')).toEqual({ root: 'C', suffix: '', bass: null });
    expect(parseChordName('Am')).toEqual({ root: 'A', suffix: 'm', bass: null });
    expect(parseChordName('F#m7')).toEqual({ root: 'F#', suffix: 'm7', bass: null });
    expect(parseChordName('Bbmaj7')).toEqual({ root: 'Bb', suffix: 'maj7', bass: null });
  });

  it('parses slash chords with a valid bass note', () => {
    expect(parseChordName('D/F#')).toEqual({ root: 'D', suffix: '', bass: 'F#' });
    expect(parseChordName('Am7/G')).toEqual({ root: 'A', suffix: 'm7', bass: 'G' });
    expect(parseChordName('C/Bb')).toEqual({ root: 'C', suffix: '', bass: 'Bb' });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseChordName(' G7 ')).toEqual({ root: 'G', suffix: '7', bass: null });
  });

  it('rejects garbage', () => {
    expect(parseChordName('')).toBeNull();
    expect(parseChordName('H')).toBeNull();
    expect(parseChordName('X13')).toBeNull();
    expect(parseChordName('C/QQ')).toBeNull();
    expect(parseChordName(null)).toBeNull();
    expect(parseChordName(42)).toBeNull();
  });
});

describe('transposeChord', () => {
  it('transposes up and down with wrap-around', () => {
    expect(transposeChord('Am', 3)).toBe('Cm');
    expect(transposeChord('C', -1)).toBe('B');
    expect(transposeChord('B', 1)).toBe('C');
    expect(transposeChord('G', 14)).toBe('A'); // > octave wraps
    expect(transposeChord('D', -14)).toBe('C');
  });

  it('keeps the suffix intact', () => {
    expect(transposeChord('Cmaj7', 2)).toBe('Dmaj7');
    expect(transposeChord('F#m7b5', 1)).toBe('Gm7b5');
    expect(transposeChord('Asus4', -2)).toBe('Gsus4');
  });

  it('transposes the slash bass along with the root', () => {
    expect(transposeChord('D/F#', 2)).toBe('E/G#');
    expect(transposeChord('C/G', -12)).toBe('C/G');
    expect(transposeChord('Am7/G', 3)).toBe('Cm7/A#');
  });

  it('keeps flat spelling for flat roots, sharps otherwise', () => {
    expect(transposeChord('Bb', 2)).toBe('C');
    expect(transposeChord('Eb', 1)).toBe('E');
    expect(transposeChord('Db', 2)).toBe('Eb');
    expect(transposeChord('C#', 2)).toBe('D#');
  });

  it('returns the label unchanged for offset 0 or unparseable input', () => {
    expect(transposeChord('Am', 0)).toBe('Am');
    expect(transposeChord('N.C.', 3)).toBe('N.C.');
    expect(transposeChord('', 3)).toBe('');
    expect(transposeChord('Am', Number.NaN)).toBe('Am');
  });
});

describe('capoForOffset', () => {
  it('inverts the display offset mod 12', () => {
    expect(capoForOffset(0)).toBe(0);
    expect(capoForOffset(-2)).toBe(2); // shapes down 2 → capo 2 restores pitch
    expect(capoForOffset(-11)).toBe(11);
    expect(capoForOffset(3)).toBe(9);
    expect(capoForOffset(12)).toBe(0);
  });

  it('is safe on garbage', () => {
    expect(capoForOffset(Number.NaN)).toBe(0);
    expect(capoForOffset(undefined)).toBe(0);
  });
});

describe('dbSuffix', () => {
  it('maps aliases to chords-db names', () => {
    expect(dbSuffix('')).toBe('major');
    expect(dbSuffix('m')).toBe('minor');
    expect(dbSuffix('min')).toBe('minor');
    expect(dbSuffix('dim')).toBe('dim');
    expect(dbSuffix('5')).toBe('5');
  });

  it('passes through suffixes chords-db already uses', () => {
    expect(dbSuffix('sus4')).toBe('sus4');
    expect(dbSuffix('add9')).toBe('add9');
    expect(dbSuffix('7')).toBe('7');
    expect(dbSuffix('m7b5')).toBe('m7b5');
  });
});

describe('dbRoot', () => {
  it('flattens common sharps for every instrument', () => {
    expect(dbRoot('A#', 'guitar')).toBe('Bb');
    expect(dbRoot('D#', 'ukulele')).toBe('Eb');
    expect(dbRoot('G#', 'baritone-ukulele')).toBe('Ab');
  });

  it('spells C#/F# per instrument database', () => {
    expect(dbRoot('C#', 'guitar')).toBe('Csharp');
    expect(dbRoot('Db', 'guitar')).toBe('Csharp');
    expect(dbRoot('F#', 'baritone-ukulele')).toBe('Fsharp');
    expect(dbRoot('C#', 'ukulele')).toBe('Db');
    expect(dbRoot('F#', 'ukulele')).toBe('Gb');
  });

  it('leaves natural roots alone', () => {
    expect(dbRoot('C', 'guitar')).toBe('C');
    expect(dbRoot('G', 'ukulele')).toBe('G');
  });
});

describe('isNoChord', () => {
  it('recognises the common no-chord spellings', () => {
    expect(isNoChord('N')).toBe(true);
    expect(isNoChord('NC')).toBe(true);
    expect(isNoChord('N.C.')).toBe(true);
    expect(isNoChord('n.c.')).toBe(true);
    expect(isNoChord(' N ')).toBe(true);
  });

  it('leaves real chords and garbage alone', () => {
    expect(isNoChord('Am')).toBe(false);
    expect(isNoChord('C')).toBe(false);
    expect(isNoChord('')).toBe(false);
    expect(isNoChord(null)).toBe(false);
  });
});
