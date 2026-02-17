/**
 * Unit Tests: normalizeDelta() Adapter
 * Feature: 052-delta-viewer-e2e (T006)
 *
 * Tests the normalizeDelta() function that converts CategorizedDelta
 * (v2.0 format) to flat DeltaEntry[] for InventoryDeltaTable consumption.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeDelta,
  isCategorizedDelta,
} from '@/infrastructure/api/inventory-delta-adapter';
import type {
  DeltaEntry,
  CategorizedDelta,
} from '@/infrastructure/api/inventory-delta-schemas';
import {
  mockCategorizedDelta,
  mockInventoryRunNeedsReview,
  mockInventoryRunCategorizedMixed,
} from '../../mocks/inventory-delta-fixtures';

// ============================================================================
// isCategorizedDelta() Type Guard
// ============================================================================

describe('isCategorizedDelta', () => {
  it('returns true for categorized delta object', () => {
    expect(isCategorizedDelta(mockCategorizedDelta)).toBe(true);
  });

  it('returns false for flat DeltaEntry[]', () => {
    expect(isCategorizedDelta(mockInventoryRunNeedsReview.delta)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isCategorizedDelta(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isCategorizedDelta(undefined)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(isCategorizedDelta([])).toBe(false);
  });
});

// ============================================================================
// normalizeDelta() — Null/Passthrough Cases
// ============================================================================

describe('normalizeDelta', () => {
  it('returns null for null input', () => {
    expect(normalizeDelta(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeDelta(undefined)).toBeNull();
  });

  it('passes through flat DeltaEntry[] unchanged', () => {
    const flat = mockInventoryRunNeedsReview.delta as DeltaEntry[];
    const result = normalizeDelta(flat);
    expect(result).toBe(flat); // same reference
  });

  it('passes through empty flat array', () => {
    const empty: DeltaEntry[] = [];
    const result = normalizeDelta(empty);
    expect(result).toBe(empty);
  });

  // ==========================================================================
  // Categorized → Flat Conversion
  // ==========================================================================

  describe('categorized delta conversion', () => {
    it('converts added items to DeltaEntry with before_count=0', () => {
      const result = normalizeDelta(mockCategorizedDelta)!;
      const added = result.find((e) => e.name === 'Fanta 330ml');
      expect(added).toEqual({
        name: 'Fanta 330ml',
        before_count: 0,
        after_count: 2,
        change: 2,
        confidence: 0.88,
      });
    });

    it('converts removed items to DeltaEntry with after_count=0 and negative change', () => {
      const result = normalizeDelta(mockCategorizedDelta)!;
      const removed = result.find((e) => e.name === 'Coca-Cola 330ml');
      expect(removed).toEqual({
        name: 'Coca-Cola 330ml',
        before_count: 2,
        after_count: 0,
        change: -2,
        confidence: 0.95,
      });
    });

    it('converts changed_qty items with correct before/after/change', () => {
      const result = normalizeDelta(mockCategorizedDelta)!;
      const changed = result.find((e) => e.name === 'Sprite 330ml');
      expect(changed).toEqual({
        name: 'Sprite 330ml',
        before_count: 3,
        after_count: 1,
        change: -2,
        confidence: 0.85,
      });
    });

    it('converts unknown items with note as name and zero counts', () => {
      const result = normalizeDelta(mockCategorizedDelta)!;
      const unknown = result.find((e) =>
        e.name === 'Unidentified item near bottom shelf'
      );
      expect(unknown).toEqual({
        name: 'Unidentified item near bottom shelf',
        before_count: 0,
        after_count: 0,
        change: 0,
        confidence: 0.35,
      });
    });

    it('returns all 4 entries for full categorized delta', () => {
      const result = normalizeDelta(mockCategorizedDelta)!;
      expect(result).toHaveLength(4);
    });

    it('handles categorized delta with only changed_qty entries', () => {
      const delta = mockInventoryRunCategorizedMixed.delta as CategorizedDelta;
      const result = normalizeDelta(delta)!;
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Coca-Cola 330ml',
        before_count: 5,
        after_count: 3,
        change: -2,
        confidence: 0.92,
      });
      expect(result[1]).toEqual({
        name: 'Sprite 330ml',
        before_count: 3,
        after_count: 3,
        change: 0,
        confidence: 0.90,
      });
    });

    it('handles empty categorized delta (all categories empty)', () => {
      const emptyCategorized: CategorizedDelta = {
        added: [],
        removed: [],
        changed_qty: [],
        unknown: [],
      };
      const result = normalizeDelta(emptyCategorized)!;
      expect(result).toEqual([]);
    });
  });
});
