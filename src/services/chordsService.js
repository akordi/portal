import { Transposer } from 'chord-transposer';
import { escapeHtml } from '@/utils/html';

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': '\u0027' };

export default {
  // Returns HTML (rendered via v-html): chords wrapped in <b>, all text escaped.
  transpose(body, i) {
    try {
      let transposer = Transposer.transpose(body);
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
                return `<b>${escapeHtml(token.toString())}</b>`;
              }
              return escapeHtml(token.toString());
            })
            .join('')
        )
        .join('\n');
    } catch (err) {
      return escapeHtml(body);
    }
  },

  extractChords(body) {
    const regExpMatchArray = body.match(/<b>(.*?)<\/b>/g);
    if (!regExpMatchArray) {
      return [];
    }
    return regExpMatchArray
      .map((val) =>
        val.replace(/<\/?b>/g, '').replace(/&(?:amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e])
      )
      .filter((value, index, self) => self.indexOf(value) === index);
  },
};
