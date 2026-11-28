import { describe, expect, it } from 'vitest';

import { formatLocalDateISO, toLocalDateInputValue } from './date';
import { getErrorMessage } from './error';

describe('date utils', () => {
  it('formats local calendar date without shifting backward around midnight', () => {
    const localMidnight = new Date(2026, 10, 28, 0, 15, 0); // 2026-11-28 00:15 local
    expect(formatLocalDateISO(localMidnight)).toBe('2026-11-28');
  });

  it('preserves plain YYYY-MM-DD strings and safely returns empty string for invalid dates', () => {
    expect(toLocalDateInputValue(' 2026-05-09 ')).toBe('2026-05-09');
    expect(toLocalDateInputValue('not-a-valid-date')).toBe('');
    expect(toLocalDateInputValue(null)).toBe('');
    expect(toLocalDateInputValue(undefined)).toBe('');
  });
});

describe('getErrorMessage', () => {
  it('extracts string and array NestJS validation messages', () => {
    expect(getErrorMessage({ response: { data: { message: 'Ruxsat yo‘q' } } })).toBe('Ruxsat yo‘q');
    expect(
      getErrorMessage({
        response: { data: { message: ['Karta raqami noto‘g‘ri', '', 'Summa manfiy'] } },
      }),
    ).toBe('Karta raqami noto‘g‘ri, Summa manfiy');
  });

  it('falls back to defaultMessage when response message or Error message is blank/empty', () => {
    expect(getErrorMessage({ response: { data: { message: [] } } }, 'Standart xato')).toBe(
      'Standart xato',
    );
    expect(getErrorMessage({ response: { data: { message: '   ' } } }, 'Standart xato')).toBe(
      'Standart xato',
    );
    expect(getErrorMessage(new Error('   '), 'Standart xato')).toBe('Standart xato');
    expect(getErrorMessage(new Error('Network Error'))).toBe('Network Error');
    expect(getErrorMessage(null, 'Fallback')).toBe('Fallback');
  });
});
