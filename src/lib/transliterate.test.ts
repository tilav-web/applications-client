import { describe, expect, it } from 'vitest';

import { matchesLatinSearch, toLatinNormalized } from './transliterate';

describe('transliterate', () => {
  it('converts Uzbek Cyrillic text to normalized Latin consistently with backend rules', () => {
    expect(toLatinNormalized('Қашқадарё вилояти')).toBe('Qashqadaryo viloyati');
    expect(toLatinNormalized('Ўзбекистон Ғузор')).toBe("O'zbekiston G'uzor");
    expect(toLatinNormalized('Ер, аёл, киев, объём, сектор')).toBe(
      "Yer, ayol, kiyev, ob'yom, sektor",
    );
    expect(toLatinNormalized('Шаҳрисабз Чорсу Цирк')).toBe('Shahrisabz Chorsu Tsirk');
    expect(toLatinNormalized('Июль')).toBe('Iyul');
  });

  it('normalizes all Uzbek apostrophe variants on pure Latin input', () => {
    expect(toLatinNormalized('O‘zbekiston Gʻuzor oʼgʼli o`g`li')).toBe(
      "O'zbekiston G'uzor o'g'li o'g'li",
    );
    expect(toLatinNormalized(null)).toBe('');
  });

  it('matches cross-script (Cyrillic <-> Latin) and apostrophe-variant searches', () => {
    expect(matchesLatinSearch("G'uzor tumani", 'ғузор')).toBe(true);
    expect(matchesLatinSearch('Қарши шаҳри', 'qarshi shahri')).toBe(true);
    expect(matchesLatinSearch('O‘zbekiston', "o'zbek")).toBe(true);
    expect(matchesLatinSearch('Qarshi', '   ')).toBe(true);
    expect(matchesLatinSearch(null, 'qarshi')).toBe(false);
    expect(matchesLatinSearch('Qarshi', 'Toshkent')).toBe(false);
  });
});
