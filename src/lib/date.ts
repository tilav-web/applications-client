/**
 * Mahalliy vaqt mintaqasi (masalan, Asia/Tashkent UTC+5) bo'yicha YYYY-MM-DD formatini qaytaradi.
 * `Date.prototype.toISOString().slice(0, 10)` dan farqli o'laroq, yarim tundan keyin 1 kun orqaga surilmaydi.
 */
export function formatLocalDateISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * ISO string yoki Date qiymatini `<input type="date" />` uchun mahalliy YYYY-MM-DD satriga aylantiradi.
 */
export function toLocalDateInputValue(value?: string | Date | null): string {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return formatLocalDateISO(d);
}
