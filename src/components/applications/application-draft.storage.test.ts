import type { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatCoordPair,
  invalidateReferenceTabCaches,
} from '@/components/references/reference-cache.util';

import {
  type ApplicationCreateDraft,
  clearApplicationDraft,
  loadApplicationDraft,
  saveApplicationDraft,
} from './application-draft.storage';
import { formatRowColorTime, formatRowColorTooltip, getRowColorMeta } from './row-color-config';

describe('application-draft.storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('isolates drafts per userId and validates version/JSON integrity', () => {
    const draftA = {
      v: 1,
      savedAt: '2026-11-28T10:00:00Z',
      applicationNumber: 'AR-A',
    } as ApplicationCreateDraft;
    const draftB = {
      v: 1,
      savedAt: '2026-11-28T10:05:00Z',
      applicationNumber: 'AR-B',
    } as ApplicationCreateDraft;

    saveApplicationDraft('user-A', draftA);
    saveApplicationDraft('user-B', draftB);

    expect(loadApplicationDraft('user-A')?.applicationNumber).toBe('AR-A');
    expect(loadApplicationDraft('user-B')?.applicationNumber).toBe('AR-B');

    clearApplicationDraft('user-A');
    expect(loadApplicationDraft('user-A')).toBeNull();
    expect(loadApplicationDraft('user-B')?.applicationNumber).toBe('AR-B');

    // Corrupted JSON or incompatible draft version safely returns null
    localStorage.setItem('uvd_application_create_draft_v1_corrupt', '{invalid json');
    expect(loadApplicationDraft('corrupt')).toBeNull();

    localStorage.setItem('uvd_application_create_draft_v1_old', JSON.stringify({ v: 99 }));
    expect(loadApplicationDraft('old')).toBeNull();
  });
});

describe('row-color-config', () => {
  it('resolves row color metadata, validates timestamps, and builds role-aware tooltips', () => {
    expect(getRowColorMeta('yellow')?.label).toBe('Sariq');
    expect(getRowColorMeta(null)).toBeNull();

    expect(formatRowColorTime(null)).toBeNull();
    expect(formatRowColorTime('bad-iso')).toBeNull();
    expect(formatRowColorTime(new Date().toISOString())).toBeTruthy();

    expect(formatRowColorTooltip({ row_color: null }, false)).toBe('Rangsiz');
    expect(formatRowColorTooltip({ row_color: null }, true)).toContain('Qator rangini belgilash');
    expect(
      formatRowColorTooltip(
        { row_color: 'red', row_color_by: 'Ali', row_color_updated_at: null },
        true,
      ),
    ).toBe('Qizil • Ali • (o‘zgartirish uchun bosing)');
  });
});

describe('references helpers (cache invalidation & coordinates)', () => {
  it('invalidates all dependent query keys for a tab and falls back cleanly for unknown tabs', () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const mockClient = { invalidateQueries } as unknown as QueryClient;

    invalidateReferenceTabCaches(mockClient, 'districts');
    expect(invalidateQueries).toHaveBeenCalledTimes(5);

    invalidateQueries.mockClear();
    invalidateReferenceTabCaches(mockClient, 'custom_unknown_tab');
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['custom_unknown_tab'] });
  });

  it('formats valid coordinate pairs and guards null/NaN inputs', () => {
    expect(formatCoordPair(38.8606, 65.7891)).toBe('38.8606, 65.7891');
    expect(formatCoordPair(null, 65.7891)).toBe('—');
    expect(formatCoordPair(Number.NaN, 65.7891)).toBe('—');
  });
});
