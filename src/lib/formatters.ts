/**
 * Karta, telefon va pul miqdorini formatlash uchun yordamchi funksiyalar
 */

/**
 * 16 talik plastik karta raqamini 4 tadan bo'lib formatlaydi (masalan: 9860 1901 2345 6789)
 */
export function formatCardNumberDisplay(raw?: string | null): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '').slice(0, 16);
  const parts = digits.match(/.{1,4}/g);
  return parts ? parts.join(' ') : digits;
}

/**
 * Karta raqamidan faqat toza raqamlarni oladi (max 16)
 */
export function cleanCardNumber(raw?: string | null): string {
  if (!raw) return '';
  return String(raw).replace(/\D/g, '').slice(0, 16);
}

/**
 * Telefon raqamini inputda '99 123 4567' ko'rinishida ko'rsatish (+998 prefiksisiz)
 */
export function formatPhoneDisplay(raw?: string | null): string {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('998') && digits.length > 3) {
    digits = digits.slice(3);
  }
  digits = digits.slice(0, 9);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
}

/**
 * Kiritilgan telefon raqamini to'liq xalqaro formatga o'tkazadi (+998991234567)
 */
export function cleanPhoneNumber(raw?: string | null): string {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('998') && digits.length > 3) {
    digits = digits.slice(3);
  }
  digits = digits.slice(0, 9);
  return digits ? `+998${digits}` : '';
}

/**
 * Pul miqdorini minglik probellar bilan formatlaydi (masalan: 1 000 000)
 */
export function formatAmountInput(raw?: string | number | null): string {
  if (raw === undefined || raw === null || raw === '') return '';
  const s = String(raw).replace(/\s/g, '');
  if (!s) return '';
  const parts = s.split('.');
  const intPart = parts[0].replace(/\D/g, '');
  if (!intPart) return '';
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (parts.length > 1) {
    const decimals = parts[1].replace(/\D/g, '').slice(0, 2);
    return `${formattedInt}.${decimals}`;
  }
  return formattedInt;
}

/**
 * Formatlangan pul miqdoridan sof sonni ajratib oladi
 */
export function cleanAmount(raw?: string | number | null): number | '' {
  if (raw === undefined || raw === null || raw === '') return '';
  const s = String(raw).replace(/\s/g, '').replace(/,/g, '.');
  if (!s) return '';
  const num = Number(s);
  return Number.isFinite(num) ? num : '';
}

/**
 * Pul miqdorini qisqa so'z bilan ifodalaydi (masalan: 1 million UZS, 1.5 million USD, 250 ming UZS)
 */
export function formatAmountWords(raw?: string | number | null, currency = 'UZS'): string {
  if (raw === undefined || raw === null || raw === '') return '';
  const s = String(raw).replace(/\s/g, '').replace(/,/g, '.');
  if (!s) return '';
  const num = Number(s);
  if (!Number.isFinite(num) || num <= 0) return '';

  const curr = (currency || 'UZS').toUpperCase();

  if (num >= 1_000_000_000_000) {
    const val = Number((num / 1_000_000_000_000).toFixed(2));
    return `${val} trillion ${curr}`;
  }
  if (num >= 1_000_000_000) {
    const val = Number((num / 1_000_000_000).toFixed(2));
    return `${val} milliard ${curr}`;
  }
  if (num >= 1_000_000) {
    const val = Number((num / 1_000_000).toFixed(2));
    return `${val} million ${curr}`;
  }
  if (num >= 1_000) {
    const val = Number((num / 1_000).toFixed(2));
    return `${val} ming ${curr}`;
  }
  return `${num.toLocaleString('uz-UZ')} ${curr}`;
}

const LOWERCASE_PARTICLES = new Set([
  "o'g'li",
  'o‘g‘li',
  'oʻgʻli',
  'o`g`li',
  "og'li",
  'ogli',
  "o'gli",
  'qizi',
  'қизи',
  'кизи',
  'ўғли',
  'угли',
  'уғли',
]);

/**
 * Ism, familiya yoki to'liq F.I.SH ni o'zbek tili qonuniyatlariga ko'ra formatlaydi.
 * Masalan:
 * "TILOVOV SHAVQIDDIN SAYFIDDIN O'G'LI" -> "Tilovov Shavqiddin Sayfiddin o'g'li"
 */
export function formatUzbekName(str?: string | null): string {
  if (!str || typeof str !== 'string') return '';
  const trimmed = str.trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (!word) return '';

      const normalizedForCheck = word.toLowerCase().replace(/[\u2018\u2019\u02BB\u02BC\x60]/g, "'");

      if (
        LOWERCASE_PARTICLES.has(normalizedForCheck) ||
        LOWERCASE_PARTICLES.has(word.toLowerCase())
      ) {
        return word.toLowerCase();
      }

      if (word.includes('-')) {
        return word
          .split('-')
          .map((sub) => {
            if (!sub) return '';
            return sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();
          })
          .join('-');
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Title case formatlash (masalan banklar, jinoyat turlari uchun).
 */
export function formatTitleCase(str?: string | null): string {
  if (!str || typeof str !== 'string') return '';
  const trimmed = str.trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
