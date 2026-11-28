import { describe, expect, it } from 'vitest';

import {
  cleanAmount,
  cleanCardNumber,
  cleanPhoneNumber,
  formatAmountInput,
  formatAmountWords,
  formatCardNumberDisplay,
  formatPhoneDisplay,
  formatTitleCase,
  formatUzbekName,
} from './formatters';

describe('formatters', () => {
  describe('card number formatting & cleaning', () => {
    it('formats 16-digit card into 4-digit groups and strips non-digits / excess digits', () => {
      expect(formatCardNumberDisplay('8600-1234-5678-9012-999')).toBe('8600 1234 5678 9012');
      expect(cleanCardNumber('9860 1901 2345 6789 00')).toBe('9860190123456789');
      expect(formatCardNumberDisplay(null)).toBe('');
      expect(cleanCardNumber(undefined)).toBe('');
    });
  });

  describe('phone formatting & cleaning', () => {
    it('strips +998 / 998 prefix for display and restores canonical +998XXXXXXXXX when cleaning', () => {
      expect(formatPhoneDisplay('+998 (90) 123-45-67')).toBe('90 123 4567');
      expect(formatPhoneDisplay('998991112233')).toBe('99 111 2233');
      expect(formatPhoneDisplay('90123')).toBe('90 123');
      expect(cleanPhoneNumber('90 123-45-67')).toBe('+998901234567');
      expect(cleanPhoneNumber('+998 90 123 45 67 99')).toBe('+998901234567');
      expect(cleanPhoneNumber('---')).toBe('');
    });
  });

  describe('amount formatting, cleaning, and words', () => {
    it('formats amounts with thousand spaces and preserves up to 2 decimal places', () => {
      expect(formatAmountInput('1500000')).toBe('1 500 000');
      expect(formatAmountInput('1 500 000.567')).toBe('1 500 000.56');
      expect(formatAmountInput('')).toBe('');
      expect(formatAmountInput('abc')).toBe('');
    });

    it('cleans spaced/comma amounts and returns empty string (NOT 0 or Infinity) on invalid input', () => {
      expect(cleanAmount('1\u00A0500 000')).toBe(1500000);
      expect(cleanAmount('1 500,50')).toBe(1500.5);
      expect(cleanAmount('   ')).toBe('');
      expect(cleanAmount('Infinity')).toBe('');
      expect(cleanAmount('not-a-number')).toBe('');
      expect(cleanAmount(null)).toBe('');
    });

    it('converts amounts to Uzbek readable words and guards against <=0, NaN, Infinity', () => {
      expect(formatAmountWords(1_500_000, 'uzs')).toBe('1.5 million UZS');
      expect(formatAmountWords('2 500 000 000', 'USD')).toBe('2.5 milliard USD');
      expect(formatAmountWords(1_200_000_000_000, 'UZS')).toBe('1.2 trillion UZS');
      expect(formatAmountWords(250_000, 'UZS')).toBe('250 ming UZS');
      expect(formatAmountWords(0)).toBe('');
      expect(formatAmountWords(-500)).toBe('');
      expect(formatAmountWords(Infinity)).toBe('');
      expect(formatAmountWords('   ')).toBe('');
    });
  });

  describe('Uzbek name & title formatting', () => {
    it('normalizes ALL CAPS Uzbek full names while keeping patronymic particles lowercase', () => {
      expect(formatUzbekName("TILOVOV SHAVQIDDIN SAYFIDDIN O'G'LI")).toBe(
        "Tilovov Shavqiddin Sayfiddin o'g'li",
      );
      expect(formatUzbekName('KARIMOVA MALIKA AZAMAT QIZI')).toBe('Karimova Malika Azamat qizi');
      expect(formatUzbekName('АЛИЕВ ВАЛИ САЛИМ ЎҒЛИ')).toBe('Алиев Вали Салим ўғли');
      expect(formatUzbekName("mirzo-ulug'bek")).toBe("Mirzo-Ulug'bek");
      expect(formatUzbekName('   ')).toBe('');
    });

    it('formats general titles cleanly', () => {
      expect(formatTitleCase('  xalq banki  ')).toBe('Xalq Banki');
      expect(formatTitleCase(null)).toBe('');
    });
  });
});
