/**
 * Frontend client-side qidiruv va filtrlash uchun Krill -> Lotin va apostrof normallashtirish.
 * Backenddagi `uzbek-latin.util.ts` qoidalari bilan 100% mos.
 */

const CYR_SINGLE_MAP: Record<string, string> = {
  А: 'A',
  а: 'a',
  Б: 'B',
  б: 'b',
  В: 'V',
  в: 'v',
  Г: 'G',
  г: 'g',
  Д: 'D',
  д: 'd',
  Ж: 'J',
  ж: 'j',
  З: 'Z',
  з: 'z',
  И: 'I',
  и: 'i',
  Й: 'Y',
  й: 'y',
  К: 'K',
  к: 'k',
  Л: 'L',
  л: 'l',
  М: 'M',
  м: 'm',
  Н: 'N',
  н: 'n',
  О: 'O',
  о: 'o',
  П: 'P',
  п: 'p',
  Р: 'R',
  р: 'r',
  С: 'S',
  с: 's',
  Т: 'T',
  т: 't',
  У: 'U',
  у: 'u',
  Ф: 'F',
  ф: 'f',
  Х: 'X',
  х: 'x',
  Ҳ: 'H',
  ҳ: 'h',
  Қ: 'Q',
  қ: 'q',
  Э: 'E',
  э: 'e',
  Ы: 'I',
  ы: 'i',
};

const CYR_DIGRAPH_MAP: Record<string, string> = {
  Ш: 'Sh',
  ш: 'sh',
  Ч: 'Ch',
  ч: 'ch',
  Щ: 'Sh',
  щ: 'sh',
  Ё: 'Yo',
  ё: 'yo',
  Ю: 'Yu',
  ю: 'yu',
  Я: 'Ya',
  я: 'ya',
  Ц: 'Ts',
  ц: 'ts',
};

const VOWELS = new Set([
  'А',
  'Е',
  'Ё',
  'И',
  'О',
  'У',
  'Э',
  'Ю',
  'Я',
  'Ў',
  'Ы',
  'а',
  'е',
  'ё',
  'и',
  'о',
  'у',
  'э',
  'ю',
  'я',
  'ў',
  'ы',
  'A',
  'E',
  'I',
  'O',
  'U',
  'a',
  'e',
  'i',
  'o',
  'u',
]);

const HARD_OR_SOFT_SIGN = new Set(['Ъ', 'ъ', 'Ь', 'ь']);
const APOSTROPHE_REGEX = /[\u2018\u2019\u02BB\u02BC\u02B9\u0060\u00B4]/g;
const HAS_CYRILLIC_REGEX = /[\u0400-\u04FF]/;
const LETTER_OR_DIGIT_REGEX = /[\p{L}\p{N}]/u;

export function toLatinNormalized(text?: string | null): string {
  if (!text) return '';
  if (!HAS_CYRILLIC_REGEX.test(text)) {
    return text.replace(APOSTROPHE_REGEX, "'");
  }

  const chars = Array.from(text);
  const out: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const prev = i > 0 ? chars[i - 1] : '';

    if (c === 'Ў') out.push("O'");
    else if (c === 'ў') out.push("o'");
    else if (c === 'Ғ') out.push("G'");
    else if (c === 'ғ') out.push("g'");
    else if (c === 'Ъ' || c === 'ъ') out.push("'");
    else if (c === 'Ь' || c === 'ь') continue;
    else if (c === 'Е' || c === 'е') {
      const isStart = i === 0 || !LETTER_OR_DIGIT_REGEX.test(prev);
      const isAfterVowelOrSign = VOWELS.has(prev) || HARD_OR_SOFT_SIGN.has(prev);
      if (isStart || isAfterVowelOrSign) {
        out.push(c === 'Е' ? 'Ye' : 'ye');
      } else {
        out.push(c === 'Е' ? 'E' : 'e');
      }
    } else if (c in CYR_DIGRAPH_MAP) {
      out.push(CYR_DIGRAPH_MAP[c]);
    } else if (c in CYR_SINGLE_MAP) {
      out.push(CYR_SINGLE_MAP[c]);
    } else {
      out.push(c);
    }
  }

  return out.join('').replace(APOSTROPHE_REGEX, "'");
}

/**
 * Qidiruv matni (krill yoki lotin) berilgan qiymat ichida bor-yo'qligini tekshiradi.
 */
export function matchesLatinSearch(target?: string | null, query?: string | null): boolean {
  const q = toLatinNormalized(query).trim().toLowerCase();
  if (!q) return true;
  if (!target) return false;
  return toLatinNormalized(target).toLowerCase().includes(q);
}
