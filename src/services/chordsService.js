import { Transposer } from 'chord-transposer';

const escapeTags = (text) => String(text).replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export default {
  transpose(body, i) {
    if (body == null) {
      return body;
    }
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
                return `<b>${escapeTags(token.toString())}</b>`;
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
