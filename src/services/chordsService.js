import { Chord, Transposer } from 'chord-transposer';

function hToB(token) {
  return token.replace(/^H/, 'B').replace(/\/H$/, '/B');
}

function isChord(token) {
  try {
    Chord.parse(token);
    return true;
  } catch {
    return false;
  }
}

function normalizeH(body) {
  let usesH = false;
  const normalized = body
    .split('\n')
    .map((line) =>
      line
        .split(/(\s+|-|]|\[)/g)
        .map((token) => {
          if (!/^H|\/H$/.test(token)) {
            return token;
          }
          const candidate = hToB(token);
          if (!isChord(candidate)) {
            return token;
          }
          usesH = true;
          return candidate;
        })
        .join('')
    )
    .join('\n');
  return { normalized, usesH };
}

function chordToString(chord, usesH) {
  if (!usesH) {
    return chord.toString();
  }
  const note = (n) => (n === 'B' || n === 'Cb' ? 'H' : n);
  const root = note(chord.root);
  return chord.bass ? `${root}${chord.suffix}/${note(chord.bass)}` : `${root}${chord.suffix}`;
}

const escapeTags = (text) => String(text).replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export default {
  transpose(body, i) {
    if (body == null) {
      return body;
    }
    try {
      const { normalized, usesH } = normalizeH(body);
      let transposer = Transposer.transpose(normalized);
      if (i >= 0) {
        transposer = transposer.up(i);
      } else {
        transposer = transposer.down(-i);
      }
      return transposer.tokens
        .map((line) =>
          line
            .map((token) => {
              if (typeof token === 'object') {
                return `<b>${escapeTags(chordToString(token, usesH))}</b>`;
              }
              return escapeTags(token.toString());
            })
            .join('')
        )
        .join('\n');
    } catch (err) {
      return escapeTags(body);
    }
  },

  extractChords(body) {
    const regExpMatchArray = body.match(/<b>(.*?)<\/b>/g);
    if (!regExpMatchArray) {
      return [];
    }
    return regExpMatchArray
      .map((val) => val.replace(/<\/?b>/g, ''))
      .filter((value, index, self) => self.indexOf(value) === index);
  },
};
