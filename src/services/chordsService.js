import { Transposer } from 'chord-transposer';

export default {
  transpose(body, i) {
    let transposer = Transposer.transpose(body);
    try {
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
                return `<b>${token.toString()}</b>`;
                // return token.toString();
              }
              return token.toString();
            })
            .join('')
        )
        .join('\n');
    } catch (err) {
      return body;
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
