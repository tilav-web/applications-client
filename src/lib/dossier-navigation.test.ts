import { describe, expect, it } from 'vitest';

import type { DossierApplicationItem, DossierMicroStats, SuspectTreeNode } from '@/types/models';

import {
  buildCardVerdict,
  buildCitizenVerdict,
  buildClueVerdict,
  extractSuspectCluesFromTree,
  formatDossierCard,
  formatDossierDate,
  formatDossierMoney,
  formatDossierPhone,
  getRoleMeta,
  isDangerRole,
  normalizeClueValue,
} from './dossier-navigation';

describe('dossier-navigation utilities', () => {
  describe('formatters', () => {
    it('guards against NaN/Infinity/null in money and Invalid Date in dates', () => {
      expect(formatDossierMoney(null)).toBe('—');
      expect(formatDossierMoney(Number.NaN)).toBe('—');
      expect(formatDossierMoney(Infinity)).toBe('—');
      expect(formatDossierMoney(1500000, 'UZS')).toContain('UZS');

      expect(formatDossierDate(null)).toBe('—');
      expect(formatDossierDate('invalid-date-value')).toBe('invalid-date-value');
      expect(formatDossierDate('2026-11-28T00:00:00Z')).not.toBe('Invalid Date');
    });

    it('formats 16-digit cards and Uzbek phones cleanly', () => {
      expect(formatDossierCard('8600123456789012')).toBe('8600 1234 5678 9012');
      expect(formatDossierCard(null, '8600 **** **** 9012')).toBe('8600 **** **** 9012');
      expect(formatDossierCard(null, null)).toBe('Raqamsiz');

      expect(formatDossierPhone('998901234567')).toBe('+998 90 123 45 67');
      expect(formatDossierPhone('901234567')).toBe('+998 90 123 45 67');
      expect(formatDossierPhone('   ')).toBe('');
    });
  });

  describe('role metadata & verdicts', () => {
    it('classifies danger vs non-danger roles accurately', () => {
      expect(isDangerRole('SUSPECT')).toBe(true);
      expect(isDangerRole('MULE_DROPPER')).toBe(true);
      expect(isDangerRole('TRANSIT')).toBe(true);
      expect(isDangerRole('VICTIM')).toBe(false);
      expect(isDangerRole('WITNESS')).toBe(false);
      expect(getRoleMeta('UNKNOWN_ROLE').tone).toBe('neutral');
    });

    it('highlights cross-role collision as critical on citizen verdict', () => {
      const stats = {
        victimAppsCount: 1,
        suspectOrDropperAppsCount: 2,
        witnessAppsCount: 0,
        isCrossRoleCollision: true,
        totalIncomingAmount: 0,
        totalOutgoingAmount: 0,
      } as unknown as DossierMicroStats;
      const verdict = buildCitizenVerdict(stats);
      expect(verdict.tone).toBe('critical');
      expect(verdict.badgeText).toBe('IKKI TOMONLAMA ROL');
      expect(verdict.pills).toHaveLength(2);
    });

    it('detects mixed transit card vs pure dropper card vs pure victim card', () => {
      const mixedApps = [
        { role_in_app: 'DROPPER' },
        { role_in_app: 'VICTIM' },
      ] as DossierApplicationItem[];
      expect(buildCardVerdict(null, mixedApps).tone).toBe('critical');

      const dropperOnly = [
        { role_in_app: 'RECEIVER' },
        { role_in_app: 'SUSPECT' },
      ] as DossierApplicationItem[];
      expect(buildCardVerdict(null, dropperOnly).tone).toBe('danger');

      const victimOnly = [{ role_in_app: 'VICTIM' }] as DossierApplicationItem[];
      expect(buildCardVerdict(null, victimOnly).tone).toBe('victim');
    });

    it('escalates clue verdict to critical when seen across multiple suspect applications', () => {
      const multiSuspect = buildClueVerdict(
        {
          victimAppsCount: 0,
          suspectOrDropperAppsCount: 3,
          witnessAppsCount: 0,
          isCrossRoleCollision: false,
          totalIncomingAmount: 0,
          totalOutgoingAmount: 0,
        } as unknown as DossierMicroStats,
        'Telegram',
      );
      expect(multiSuspect.tone).toBe('critical');
    });
  });

  describe('extractSuspectCluesFromTree & normalizeClueValue', () => {
    it('normalizes phone/card digits >= 7 and strips leading @ on handles', () => {
      expect(normalizeClueValue('+998 (90) 123-45-67')).toBe('998901234567');
      expect(normalizeClueValue(' @Fraud_Bot ')).toBe('fraud_bot');
      expect(normalizeClueValue('')).toBe('');
    });

    it('walks nested tree, builds arrow paths, deduplicates identical clues, and handles leaf labels', () => {
      const tree: SuspectTreeNode[] = [
        {
          id: '1',
          label: 'Telegram',
          children: [
            { id: '1a', label: 'Username', value: '@scam_acc' },
            { id: '1b', label: 'Username', value: 'scam_acc' }, // duplicate normalized value -> deduped
            { id: '1c', label: 'Kanal nomi' }, // leaf without value -> uses label as clue
          ],
        },
      ];

      const clues = extractSuspectCluesFromTree(tree);
      expect(clues).toHaveLength(2);
      expect(clues[0]).toEqual({
        path: 'Telegram → Username',
        label: 'Username',
        value: '@scam_acc',
        normalized: 'scam_acc',
      });
      expect(clues[1]).toEqual({
        path: 'Telegram',
        label: 'Telegram',
        value: 'Kanal nomi',
        normalized: 'kanal nomi',
      });
    });
  });
});
