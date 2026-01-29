const fs = require('fs');
const path = require('path');

// Logic: Baritone Ukulele (D G B E) corresponds to the top 4 strings of a Guitar (E A D G B E).
// Guitar strings are 0-indexed from low E (string 0) to high E (string 5).
// So we want strings 2, 3, 4, 5.

const guitarDbPath = require.resolve('@tombatossals/chords-db/lib/guitar.json');
const guitarDb = require(guitarDbPath);

const baritoneDb = {
  main: {
    strings: 4,
    tuning: ['D', 'G', 'B', 'E'],
  },
  tunings: {
    standard: ['D', 'G', 'B', 'E'],
  },
  keys: guitarDb.keys, // Keys should be the same
  suffixes: guitarDb.suffixes, // Suffixes same
  chords: {},
};

Object.keys(guitarDb.chords).forEach((key) => {
  const guitarKeyChords = guitarDb.chords[key];
  baritoneDb.chords[key] = [];

  guitarKeyChords.forEach((chordType) => {
    const newChordType = {
      key: chordType.key,
      suffix: chordType.suffix,
      positions: [],
    };

    chordType.positions.forEach((pos) => {
      // Guitar frets: [E, A, D, G, B, E]
      // We want: [D, G, B, E] -> indices 2, 3, 4, 5
      const relevantFrets = pos.frets.slice(2);
      const relevantFingers = pos.fingers.slice(2);

      // If any of the lower strings (0, 1) were essential to the chord shape such that
      // the remaining 4 strings don't form a valid chord or are unplayable, we might need to filter.
      // However, usually taking the top 4 strings of a guitar chord produces a valid voicing
      // for the baritone uke for that same chord name (since the intervals are preserved).
      // Exception: If the root was on string 0 or 1 and is now lost, the chord inversion changes.
      // But it's still the same chord quality.

      // Check if the resulting shape is playable/valid
      // e.g. if all strings are muted (shouldn't happen for valid guitar chords)
      const isPlayable = relevantFrets.some((f) => f !== -1);

      if (isPlayable) {
        const newPos = {
          frets: relevantFrets,
          fingers: relevantFingers,
          baseFret: pos.baseFret,
          barres: [],
          capo: pos.capo,
        };

        // Handle barres
        // Original barres are fret numbers.
        // We just need to check if the barre covers any of our new strings (0-3 re-indexed).
        // Actually, the barre property in chords-db is just "which frets have a bar".
        // The rendering logic handles "from string X to Y".
        // But we should probably keep the barre info if it applies to the top strings.
        if (pos.barres) {
          newPos.barres = pos.barres;
        }

        newChordType.positions.push(newPos);
      }
    });

    // Deduplicate positions if any became identical (e.g. muted strings made them same)
    // For simplicity, we'll keep all unique JSON stringified positions
    const uniquePositions = [];
    const seen = new Set();
    newChordType.positions.forEach((p) => {
      const s = JSON.stringify(p);
      if (!seen.has(s)) {
        seen.add(s);
        uniquePositions.push(p);
      }
    });
    newChordType.positions = uniquePositions;

    if (newChordType.positions.length > 0) {
      baritoneDb.chords[key].push(newChordType);
    }
  });
});

const outputPath = path.resolve(__dirname, '../src/db/baritone-ukulele.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(baritoneDb, null, 2));

console.log(`Generated Baritone Ukulele chords at: ${outputPath}`);
