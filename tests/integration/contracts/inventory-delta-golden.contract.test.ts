/**
 * Golden Contract Tests: Inventory Delta Drift Prevention
 * Feature: 052-delta-viewer-e2e (T020, T021, T022)
 *
 * Validates golden fixtures against PiDashboard schemas using z.strict()
 * to catch field additions, removals, or type changes that indicate
 * contract drift between BridgeServer and PiDashboard.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  AnalysisStatusSchema,
  InventoryAnalysisRunSchema,
  AnalysisMetadataSchema,
  ReviewSchema,
  DeltaEntrySchema,
  CategorizedDeltaSchema,
  InventoryItemSchema,
  EvidenceImagesSchema,
  AddedItemSchema,
  RemovedItemSchema,
  ChangedQtyItemSchema,
  UnknownItemSchema,
} from '@/infrastructure/api/inventory-delta-schemas';
import {
  allGoldenFixtures,
  goldenSuccessFlat,
  goldenCategorizedDelta,
  goldenPending,
  goldenError,
  goldenWithReview,
} from '../../mocks/inventory-delta-golden';
import type { DeltaEntry } from '@/infrastructure/api/inventory-delta-schemas';

// ============================================================================
// T020: Golden Fixture Schema Validation (strict mode)
// ============================================================================

describe('Golden Fixture Schema Validation (T020)', () => {
  it.each(allGoldenFixtures)(
    'golden fixture "$name" passes InventoryAnalysisRunSchema',
    ({ fixture }) => {
      const result = InventoryAnalysisRunSchema.safeParse(fixture);
      if (!result.success) {
        // Provide detailed error for debugging drift
        throw new Error(
          `Schema validation failed for golden fixture:\n${JSON.stringify(result.error.issues, null, 2)}`
        );
      }
      expect(result.success).toBe(true);
    }
  );

  it('golden flat delta entries pass strict DeltaEntrySchema', () => {
    const strictDeltaEntry = DeltaEntrySchema.strict();
    for (const entry of goldenSuccessFlat.delta as DeltaEntry[]) {
      const result = strictDeltaEntry.safeParse(entry);
      expect(result.success).toBe(true);
    }
  });

  it('golden categorized delta passes strict CategorizedDeltaSchema', () => {
    const strictCategorized = CategorizedDeltaSchema.strict();
    const result = strictCategorized.safeParse(goldenCategorizedDelta);
    expect(result.success).toBe(true);
  });

  it('golden categorized delta sub-items pass strict schemas', () => {
    const strictAdded = AddedItemSchema.strict();
    const strictRemoved = RemovedItemSchema.strict();
    const strictChanged = ChangedQtyItemSchema.strict();
    const strictUnknown = UnknownItemSchema.strict();

    for (const item of goldenCategorizedDelta.added) {
      expect(strictAdded.safeParse(item).success).toBe(true);
    }
    for (const item of goldenCategorizedDelta.removed) {
      expect(strictRemoved.safeParse(item).success).toBe(true);
    }
    for (const item of goldenCategorizedDelta.changed_qty) {
      expect(strictChanged.safeParse(item).success).toBe(true);
    }
    for (const item of goldenCategorizedDelta.unknown) {
      expect(strictUnknown.safeParse(item).success).toBe(true);
    }
  });

  it('golden metadata passes strict AnalysisMetadataSchema', () => {
    const strictMeta = AnalysisMetadataSchema.strict();
    for (const { fixture } of allGoldenFixtures) {
      const result = strictMeta.safeParse(fixture.metadata);
      expect(result.success).toBe(true);
    }
  });

  it('golden review passes strict ReviewSchema', () => {
    const strictReview = ReviewSchema.strict();
    const result = strictReview.safeParse(goldenWithReview.review);
    expect(result.success).toBe(true);
  });

  it('golden evidence passes strict EvidenceImagesSchema', () => {
    const strictEvidence = EvidenceImagesSchema.strict();
    for (const { fixture } of allGoldenFixtures) {
      if (fixture.evidence) {
        const result = strictEvidence.safeParse(fixture.evidence);
        expect(result.success).toBe(true);
      }
    }
  });

  it('golden inventory items pass strict InventoryItemSchema', () => {
    const strictItem = InventoryItemSchema.strict();
    for (const item of goldenSuccessFlat.items_before ?? []) {
      expect(strictItem.safeParse(item).success).toBe(true);
    }
    for (const item of goldenSuccessFlat.items_after ?? []) {
      expect(strictItem.safeParse(item).success).toBe(true);
    }
  });

  // Strict mode rejection test: verify unknown fields are caught
  it('strict mode rejects unknown fields in delta entry', () => {
    const strictDeltaEntry = DeltaEntrySchema.strict();
    const withUnknownField = {
      ...(goldenSuccessFlat.delta as DeltaEntry[])[0],
      unknown_new_field: 'should fail',
    };
    const result = strictDeltaEntry.safeParse(withUnknownField);
    expect(result.success).toBe(false);
  });

  it('strict mode rejects unknown fields in metadata', () => {
    const strictMeta = AnalysisMetadataSchema.strict();
    const withUnknownField = {
      ...goldenSuccessFlat.metadata,
      new_api_field: 'should fail',
    };
    const result = strictMeta.safeParse(withUnknownField);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// T021: Enum Exhaustiveness
// ============================================================================

describe('Enum Exhaustiveness (T021)', () => {
  const expectedStatuses = ['pending', 'processing', 'done', 'needs_review', 'error'];

  it('AnalysisStatusSchema contains all BridgeServer status values', () => {
    for (const status of expectedStatuses) {
      const result = AnalysisStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('golden fixtures collectively cover all analysis statuses', () => {
    const goldenStatuses = new Set(allGoldenFixtures.map(({ fixture }) => fixture.status));
    for (const status of expectedStatuses) {
      expect(goldenStatuses.has(status as z.infer<typeof AnalysisStatusSchema>)).toBe(true);
    }
  });

  it('AnalysisStatusSchema rejects values not in the enum', () => {
    const invalidStatuses = ['completed', 'failed', 'running', 'cancelled', ''];
    for (const status of invalidStatuses) {
      expect(AnalysisStatusSchema.safeParse(status).success).toBe(false);
    }
  });
});

// ============================================================================
// T022: Golden Fixture Consistency
// ============================================================================

describe('Golden Fixture Consistency (T022)', () => {
  it('flat delta change equals after_count - before_count', () => {
    for (const entry of goldenSuccessFlat.delta as DeltaEntry[]) {
      expect(entry.change).toBe(entry.after_count - entry.before_count);
    }
  });

  it('categorized delta categories are non-overlapping', () => {
    const addedNames = new Set(goldenCategorizedDelta.added.map((i) => i.name));
    const removedNames = new Set(goldenCategorizedDelta.removed.map((i) => i.name));
    const changedNames = new Set(goldenCategorizedDelta.changed_qty.map((i) => i.name));

    // No item should appear in multiple categories
    for (const name of addedNames) {
      expect(removedNames.has(name)).toBe(false);
      expect(changedNames.has(name)).toBe(false);
    }
    for (const name of removedNames) {
      expect(changedNames.has(name)).toBe(false);
    }
  });

  it('confidence values are in valid range [0, 1]', () => {
    for (const { fixture } of allGoldenFixtures) {
      if (fixture.delta && Array.isArray(fixture.delta)) {
        for (const entry of fixture.delta) {
          expect(entry.confidence).toBeGreaterThanOrEqual(0);
          expect(entry.confidence).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('categorized delta confidence values are in valid range [0, 1]', () => {
    for (const item of goldenCategorizedDelta.added) {
      expect(item.confidence).toBeGreaterThanOrEqual(0);
      expect(item.confidence).toBeLessThanOrEqual(1);
    }
    for (const item of goldenCategorizedDelta.removed) {
      expect(item.confidence).toBeGreaterThanOrEqual(0);
      expect(item.confidence).toBeLessThanOrEqual(1);
    }
    for (const item of goldenCategorizedDelta.changed_qty) {
      expect(item.confidence).toBeGreaterThanOrEqual(0);
      expect(item.confidence).toBeLessThanOrEqual(1);
    }
    for (const item of goldenCategorizedDelta.unknown) {
      expect(item.confidence).toBeGreaterThanOrEqual(0);
      expect(item.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('all golden fixture run_ids are unique', () => {
    const ids = allGoldenFixtures.map(({ fixture }) => fixture.run_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all golden fixture session_ids are unique', () => {
    const ids = allGoldenFixtures.map(({ fixture }) => fixture.session_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('pending/error fixtures have null delta', () => {
    expect(goldenPending.delta).toBeNull();
    expect(goldenError.delta).toBeNull();
  });

  it('pending/error fixtures have null items', () => {
    expect(goldenPending.items_before).toBeNull();
    expect(goldenPending.items_after).toBeNull();
    expect(goldenError.items_before).toBeNull();
    expect(goldenError.items_after).toBeNull();
  });

  it('error fixture has error_message in metadata', () => {
    expect(goldenError.metadata.error_message).toBeDefined();
    expect(typeof goldenError.metadata.error_message).toBe('string');
    expect(goldenError.metadata.error_message!.length).toBeGreaterThan(0);
  });

  it('reviewed fixture has complete review object', () => {
    expect(goldenWithReview.review).not.toBeNull();
    expect(goldenWithReview.review!.reviewer_id).toBeTruthy();
    expect(goldenWithReview.review!.action).toBeTruthy();
    expect(goldenWithReview.review!.reviewed_at).toBeTruthy();
  });
});
