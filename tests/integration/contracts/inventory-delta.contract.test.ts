/**
 * Inventory Delta API Contract Tests
 * Feature: 047-inventory-delta-viewer (T009)
 *
 * Validates that mock fixtures match the Zod schemas defined for inventory API.
 * Prevents silent drift between MSW handlers and actual API contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  AnalysisStatusSchema,
  ItemConditionSchema,
  ReviewActionSchema,
  BoundingBoxSchema,
  InventoryItemSchema,
  DeltaEntrySchema,
  OverlayItemSchema,
  EvidenceImagesSchema,
  ReviewCorrectionSchema,
  ReviewSchema,
  AnalysisMetadataSchema,
  InventoryAnalysisRunSchema,
  InventoryLatestResponseSchema,
  SubmitReviewRequestSchema,
  ReviewResponseSchema,
  DeltaSummarySchema,
  RunListItemSchema,
  InventoryPaginationSchema,
  RunListResponseSchema,
  CategorizedDeltaSchema,
  AddedItemSchema,
  RemovedItemSchema,
  ChangedQtyItemSchema,
  UnknownItemSchema,
} from '@/infrastructure/api/inventory-delta-schemas';
import {
  mockInventoryRunNeedsReview,
  mockInventoryRunCompleted,
  mockInventoryRunPending,
  mockInventoryRunFailed,
  mockInventoryRunApproved,
  mockInventoryRunApprovedAsIs,
  mockInventoryRunLowConfidence,
  mockInventoryRunZeroDelta,
  mockInventoryRunSingleImage,
  mockInventoryLatestResponse,
  mockInventoryLatestPendingResponse,
  mockInventoryNotFoundResponse,
  mockInventoryServiceUnavailableResponse,
  mockReviewSuccessResponse,
  mockReviewConflictResponse,
  mockReviewInvalidResponse,
  mockRunListItems,
  mockRunListResponse,
  mockRunListEmpty,
  mockRunListSecondPage,
  mockInventoryRunCategorized,
  mockInventoryRunCategorizedMixed,
  mockCategorizedDelta,
} from '../../mocks/inventory-delta-fixtures';

// ============================================================================
// Enum Schema Tests
// ============================================================================

describe('AnalysisStatusSchema', () => {
  it.each(['pending', 'processing', 'done', 'needs_review', 'error'])(
    'validates status: %s',
    (status) => {
      expect(AnalysisStatusSchema.safeParse(status).success).toBe(true);
    }
  );

  it('rejects invalid status', () => {
    expect(AnalysisStatusSchema.safeParse('unknown').success).toBe(false);
    expect(AnalysisStatusSchema.safeParse('').success).toBe(false);
  });
});

describe('ItemConditionSchema', () => {
  it.each(['excellent', 'good', 'fair', 'poor', 'expired', 'unknown'])(
    'validates condition: %s',
    (condition) => {
      expect(ItemConditionSchema.safeParse(condition).success).toBe(true);
    }
  );

  it('rejects invalid condition', () => {
    expect(ItemConditionSchema.safeParse('broken').success).toBe(false);
  });
});

describe('ReviewActionSchema', () => {
  it.each(['approve', 'override'])('validates action: %s', (action) => {
    expect(ReviewActionSchema.safeParse(action).success).toBe(true);
  });

  it('rejects invalid action', () => {
    expect(ReviewActionSchema.safeParse('reject').success).toBe(false);
  });
});

// ============================================================================
// Value Object Schema Tests
// ============================================================================

describe('BoundingBoxSchema', () => {
  it('validates valid bounding box', () => {
    const result = BoundingBoxSchema.safeParse({ x: 10, y: 20, width: 50, height: 80 });
    expect(result.success).toBe(true);
  });

  it('rejects negative x', () => {
    expect(BoundingBoxSchema.safeParse({ x: -1, y: 0, width: 10, height: 10 }).success).toBe(false);
  });

  it('rejects zero width', () => {
    expect(BoundingBoxSchema.safeParse({ x: 0, y: 0, width: 0, height: 10 }).success).toBe(false);
  });

  it('rejects zero height', () => {
    expect(BoundingBoxSchema.safeParse({ x: 0, y: 0, width: 10, height: 0 }).success).toBe(false);
  });
});

// ============================================================================
// Entity Schema Tests
// ============================================================================

describe('InventoryItemSchema', () => {
  it('validates full item with bounding box and condition', () => {
    const item = mockInventoryRunNeedsReview.items_before![0];
    expect(InventoryItemSchema.safeParse(item).success).toBe(true);
  });

  it('validates minimal item (name, quantity, confidence)', () => {
    const item = { name: 'Test', quantity: 1, confidence: 0.5 };
    expect(InventoryItemSchema.safeParse(item).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(InventoryItemSchema.safeParse({ name: '', quantity: 1, confidence: 0.5 }).success).toBe(false);
  });

  it('rejects negative quantity', () => {
    expect(InventoryItemSchema.safeParse({ name: 'Test', quantity: -1, confidence: 0.5 }).success).toBe(false);
  });

  it('rejects confidence > 1', () => {
    expect(InventoryItemSchema.safeParse({ name: 'Test', quantity: 1, confidence: 1.1 }).success).toBe(false);
  });

  it('rejects confidence < 0', () => {
    expect(InventoryItemSchema.safeParse({ name: 'Test', quantity: 1, confidence: -0.1 }).success).toBe(false);
  });
});

describe('DeltaEntrySchema', () => {
  it('validates delta entry from fixture', () => {
    const entry = mockInventoryRunNeedsReview.delta![0];
    expect(DeltaEntrySchema.safeParse(entry).success).toBe(true);
  });

  it('validates zero-change entry', () => {
    const entry = mockInventoryRunZeroDelta.delta![0];
    expect(DeltaEntrySchema.safeParse(entry).success).toBe(true);
  });

  it('rejects missing name', () => {
    const invalid = { before_count: 5, after_count: 3, change: -2, confidence: 0.9 };
    expect(DeltaEntrySchema.safeParse(invalid).success).toBe(false);
  });
});

describe('OverlayItemSchema', () => {
  it('validates overlay item from fixture', () => {
    const overlay = mockInventoryRunNeedsReview.evidence!.overlays!.before![0];
    expect(OverlayItemSchema.safeParse(overlay).success).toBe(true);
  });

  it('validates overlay without confidence', () => {
    const overlay = { label: 'Test', bounding_box: { x: 0, y: 0, width: 10, height: 10 } };
    expect(OverlayItemSchema.safeParse(overlay).success).toBe(true);
  });
});

describe('EvidenceImagesSchema', () => {
  it('validates full evidence from fixture', () => {
    expect(EvidenceImagesSchema.safeParse(mockInventoryRunNeedsReview.evidence).success).toBe(true);
  });

  it('validates single-image evidence', () => {
    expect(EvidenceImagesSchema.safeParse(mockInventoryRunSingleImage.evidence).success).toBe(true);
  });

  it('validates empty evidence', () => {
    expect(EvidenceImagesSchema.safeParse({}).success).toBe(true);
  });
});

describe('ReviewCorrectionSchema', () => {
  it('validates correction from fixture', () => {
    const correction = mockInventoryRunApproved.review!.corrections![0];
    expect(ReviewCorrectionSchema.safeParse(correction).success).toBe(true);
  });

  it('validates added item correction', () => {
    const correction = mockInventoryRunApproved.review!.corrections![1];
    expect(ReviewCorrectionSchema.safeParse(correction).success).toBe(true);
    expect(correction.added).toBe(true);
  });

  it('rejects empty name', () => {
    const invalid = { name: '', original_count: 0, corrected_count: 1 };
    expect(ReviewCorrectionSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('ReviewSchema', () => {
  it('validates override review', () => {
    expect(ReviewSchema.safeParse(mockInventoryRunApproved.review).success).toBe(true);
  });

  it('validates approve-only review', () => {
    expect(ReviewSchema.safeParse(mockInventoryRunApprovedAsIs.review).success).toBe(true);
  });
});

describe('AnalysisMetadataSchema', () => {
  it('validates full metadata', () => {
    expect(AnalysisMetadataSchema.safeParse(mockInventoryRunNeedsReview.metadata).success).toBe(true);
  });

  it('validates pending metadata (minimal)', () => {
    expect(AnalysisMetadataSchema.safeParse(mockInventoryRunPending.metadata).success).toBe(true);
  });

  it('validates failed metadata with error_message', () => {
    expect(AnalysisMetadataSchema.safeParse(mockInventoryRunFailed.metadata).success).toBe(true);
  });
});

// ============================================================================
// Main Entity Schema Tests (all 5 statuses)
// ============================================================================

describe('InventoryAnalysisRunSchema', () => {
  it('validates needs_review fixture', () => {
    expect(InventoryAnalysisRunSchema.safeParse(mockInventoryRunNeedsReview).success).toBe(true);
  });

  it('validates completed fixture', () => {
    expect(InventoryAnalysisRunSchema.safeParse(mockInventoryRunCompleted).success).toBe(true);
  });

  it('validates pending fixture', () => {
    expect(InventoryAnalysisRunSchema.safeParse(mockInventoryRunPending).success).toBe(true);
  });

  it('validates failed fixture', () => {
    expect(InventoryAnalysisRunSchema.safeParse(mockInventoryRunFailed).success).toBe(true);
  });

  it('validates approved fixture (with corrections)', () => {
    expect(InventoryAnalysisRunSchema.safeParse(mockInventoryRunApproved).success).toBe(true);
  });

  it('validates approved-as-is fixture', () => {
    expect(InventoryAnalysisRunSchema.safeParse(mockInventoryRunApprovedAsIs).success).toBe(true);
  });

  it('validates low-confidence fixture', () => {
    expect(InventoryAnalysisRunSchema.safeParse(mockInventoryRunLowConfidence).success).toBe(true);
  });

  it('validates zero-delta fixture', () => {
    expect(InventoryAnalysisRunSchema.safeParse(mockInventoryRunZeroDelta).success).toBe(true);
  });

  it('validates single-image fixture', () => {
    expect(InventoryAnalysisRunSchema.safeParse(mockInventoryRunSingleImage).success).toBe(true);
  });

  it('rejects empty run_id', () => {
    const invalid = { ...mockInventoryRunPending, run_id: '' };
    expect(InventoryAnalysisRunSchema.safeParse(invalid).success).toBe(false);
  });
});

// ============================================================================
// Response Envelope Tests
// ============================================================================

describe('InventoryLatestResponseSchema', () => {
  it('validates success response with data', () => {
    expect(InventoryLatestResponseSchema.safeParse(mockInventoryLatestResponse).success).toBe(true);
  });

  it('validates success response with pending data', () => {
    expect(InventoryLatestResponseSchema.safeParse(mockInventoryLatestPendingResponse).success).toBe(true);
  });

  it('validates not-found error response', () => {
    expect(InventoryLatestResponseSchema.safeParse(mockInventoryNotFoundResponse).success).toBe(true);
  });

  it('validates service-unavailable error response', () => {
    expect(InventoryLatestResponseSchema.safeParse(mockInventoryServiceUnavailableResponse).success).toBe(true);
  });
});

describe('ReviewResponseSchema', () => {
  it('validates success review response', () => {
    expect(ReviewResponseSchema.safeParse(mockReviewSuccessResponse).success).toBe(true);
  });

  it('validates conflict error response', () => {
    expect(ReviewResponseSchema.safeParse(mockReviewConflictResponse).success).toBe(true);
  });

  it('validates invalid review error response', () => {
    expect(ReviewResponseSchema.safeParse(mockReviewInvalidResponse).success).toBe(true);
  });
});

// ============================================================================
// Request Schema Tests
// ============================================================================

describe('SubmitReviewRequestSchema', () => {
  it('validates approve request', () => {
    const request = { action: 'approve', corrections: [], notes: '' };
    expect(SubmitReviewRequestSchema.safeParse(request).success).toBe(true);
  });

  it('validates override request with corrections', () => {
    const request = {
      action: 'override',
      corrections: [
        { name: 'Test Item', original_count: 3, corrected_count: 4 },
      ],
      notes: 'Adjusted count',
    };
    expect(SubmitReviewRequestSchema.safeParse(request).success).toBe(true);
  });

  it('validates minimal approve (no corrections/notes)', () => {
    const request = { action: 'approve' };
    expect(SubmitReviewRequestSchema.safeParse(request).success).toBe(true);
  });

  it('rejects invalid action', () => {
    const request = { action: 'reject' };
    expect(SubmitReviewRequestSchema.safeParse(request).success).toBe(false);
  });
});

// ============================================================================
// Mock Data Consistency Tests
// ============================================================================

describe('Mock Data Consistency', () => {
  const allFixtures = [
    { name: 'needsReview', fixture: mockInventoryRunNeedsReview },
    { name: 'completed', fixture: mockInventoryRunCompleted },
    { name: 'pending', fixture: mockInventoryRunPending },
    { name: 'failed', fixture: mockInventoryRunFailed },
    { name: 'approved', fixture: mockInventoryRunApproved },
    { name: 'approvedAsIs', fixture: mockInventoryRunApprovedAsIs },
    { name: 'lowConfidence', fixture: mockInventoryRunLowConfidence },
    { name: 'zeroDelta', fixture: mockInventoryRunZeroDelta },
    { name: 'singleImage', fixture: mockInventoryRunSingleImage },
  ];

  it.each(allFixtures)(
    'fixture "$name" passes InventoryAnalysisRunSchema validation',
    ({ fixture }) => {
      const result = InventoryAnalysisRunSchema.safeParse(fixture);
      expect(result.success).toBe(true);
    }
  );

  it('all fixture run_ids are unique', () => {
    const ids = allFixtures.map((f) => f.fixture.run_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('approved fixtures have non-null review', () => {
    expect(mockInventoryRunApproved.review).not.toBeNull();
    expect(mockInventoryRunApprovedAsIs.review).not.toBeNull();
  });

  it('pending/failed fixtures have null delta', () => {
    expect(mockInventoryRunPending.delta).toBeNull();
    expect(mockInventoryRunFailed.delta).toBeNull();
  });

  it('needs_review fixture has null review', () => {
    expect(mockInventoryRunNeedsReview.review).toBeNull();
  });

  it('delta change equals after_count - before_count', () => {
    for (const entry of mockInventoryRunNeedsReview.delta ?? []) {
      expect(entry.change).toBe(entry.after_count - entry.before_count);
    }
  });
});

// ============================================================================
// Run List Schema Tests (Feature 048)
// ============================================================================

describe('DeltaSummarySchema', () => {
  it('validates delta summary from fixture', () => {
    const summary = mockRunListItems[0].delta_summary;
    expect(DeltaSummarySchema.safeParse(summary).success).toBe(true);
  });

  it('validates zero counts', () => {
    const summary = { total_items: 0, items_changed: 0, items_added: 0, items_removed: 0 };
    expect(DeltaSummarySchema.safeParse(summary).success).toBe(true);
  });

  it('rejects negative total_items', () => {
    const summary = { total_items: -1, items_changed: 0, items_added: 0, items_removed: 0 };
    expect(DeltaSummarySchema.safeParse(summary).success).toBe(false);
  });

  it('rejects negative items_changed', () => {
    const summary = { total_items: 5, items_changed: -1, items_added: 0, items_removed: 0 };
    expect(DeltaSummarySchema.safeParse(summary).success).toBe(false);
  });
});

describe('RunListItemSchema', () => {
  it.each(mockRunListItems.map((item, i) => ({ name: `item[${i}] (${item.status})`, item })))(
    'validates $name',
    ({ item }) => {
      expect(RunListItemSchema.safeParse(item).success).toBe(true);
    }
  );

  it('validates item with null delta_summary', () => {
    const item = mockRunListItems.find((r) => r.delta_summary === null);
    expect(item).toBeDefined();
    expect(RunListItemSchema.safeParse(item).success).toBe(true);
  });

  it('rejects invalid status', () => {
    const invalid = { ...mockRunListItems[0], status: 'invalid_status' };
    expect(RunListItemSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects empty run_id', () => {
    const invalid = { ...mockRunListItems[0], run_id: '' };
    expect(RunListItemSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects empty session_id', () => {
    const invalid = { ...mockRunListItems[0], session_id: '' };
    expect(RunListItemSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('InventoryPaginationSchema', () => {
  it('validates pagination from fixture', () => {
    const pagination = mockRunListResponse.data!.pagination;
    expect(InventoryPaginationSchema.safeParse(pagination).success).toBe(true);
  });

  it('validates empty pagination', () => {
    const pagination = mockRunListEmpty.data!.pagination;
    expect(InventoryPaginationSchema.safeParse(pagination).success).toBe(true);
  });

  it('rejects negative total', () => {
    const invalid = { total: -1, limit: 20, offset: 0, has_more: false };
    expect(InventoryPaginationSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects zero limit', () => {
    const invalid = { total: 0, limit: 0, offset: 0, has_more: false };
    expect(InventoryPaginationSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects negative offset', () => {
    const invalid = { total: 0, limit: 20, offset: -1, has_more: false };
    expect(InventoryPaginationSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('RunListResponseSchema', () => {
  it('validates success response with runs', () => {
    expect(RunListResponseSchema.safeParse(mockRunListResponse).success).toBe(true);
  });

  it('validates empty response', () => {
    expect(RunListResponseSchema.safeParse(mockRunListEmpty).success).toBe(true);
  });

  it('validates second page response', () => {
    expect(RunListResponseSchema.safeParse(mockRunListSecondPage).success).toBe(true);
  });

  it('validates error response', () => {
    const errorResponse = {
      success: false,
      error: { code: 'CONTAINER_NOT_FOUND', message: 'Container not found.', retryable: false },
      timestamp: '2026-02-09T12:00:00Z',
    };
    expect(RunListResponseSchema.safeParse(errorResponse).success).toBe(true);
  });

  it('validates error response with retry_after_seconds', () => {
    const errorResponse = {
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Unavailable', retryable: true, retry_after_seconds: 30 },
      timestamp: '2026-02-09T12:00:00Z',
    };
    expect(RunListResponseSchema.safeParse(errorResponse).success).toBe(true);
  });
});

describe('Run List Fixture Consistency', () => {
  it('all run list items have unique run_ids', () => {
    const ids = mockRunListItems.map((r) => r.run_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all run list items have unique session_ids', () => {
    const ids = mockRunListItems.map((r) => r.session_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers all 5 analysis statuses', () => {
    const statuses = new Set(mockRunListItems.map((r) => r.status));
    expect(statuses).toEqual(new Set(['done', 'needs_review', 'processing', 'pending', 'error']));
  });

  it('pending/processing/error items have null delta_summary', () => {
    const pendingItems = mockRunListItems.filter((r) => r.status === 'pending' || r.status === 'processing' || r.status === 'error');
    for (const item of pendingItems) {
      expect(item.delta_summary).toBeNull();
    }
  });

  it('second page has different offset than first page', () => {
    expect(mockRunListSecondPage.data!.pagination.offset).toBeGreaterThan(0);
  });
});

// ============================================================================
// Categorized Delta Schema Tests (Feature 052)
// ============================================================================

describe('CategorizedDeltaSchema', () => {
  it('validates full categorized delta fixture', () => {
    expect(CategorizedDeltaSchema.safeParse(mockCategorizedDelta).success).toBe(true);
  });

  it('validates empty categorized delta (all categories empty)', () => {
    const empty = { added: [], removed: [], changed_qty: [], unknown: [] };
    expect(CategorizedDeltaSchema.safeParse(empty).success).toBe(true);
  });

  it('rejects categorized delta missing added array', () => {
    const invalid = { removed: [], changed_qty: [], unknown: [] };
    expect(CategorizedDeltaSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects categorized delta missing removed array', () => {
    const invalid = { added: [], changed_qty: [], unknown: [] };
    expect(CategorizedDeltaSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('AddedItemSchema', () => {
  it('validates added item from fixture', () => {
    expect(AddedItemSchema.safeParse(mockCategorizedDelta.added[0]).success).toBe(true);
  });

  it('rejects zero qty', () => {
    const invalid = { name: 'Test', qty: 0, confidence: 0.9 };
    expect(AddedItemSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects empty name', () => {
    const invalid = { name: '', qty: 1, confidence: 0.9 };
    expect(AddedItemSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('RemovedItemSchema', () => {
  it('validates removed item from fixture', () => {
    expect(RemovedItemSchema.safeParse(mockCategorizedDelta.removed[0]).success).toBe(true);
  });

  it('rejects negative qty', () => {
    const invalid = { name: 'Test', qty: -1, confidence: 0.9 };
    expect(RemovedItemSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('ChangedQtyItemSchema', () => {
  it('validates changed_qty item from fixture', () => {
    expect(ChangedQtyItemSchema.safeParse(mockCategorizedDelta.changed_qty[0]).success).toBe(true);
  });

  it('rejects negative from_qty', () => {
    const invalid = { name: 'Test', from_qty: -1, to_qty: 2, confidence: 0.9 };
    expect(ChangedQtyItemSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects negative to_qty', () => {
    const invalid = { name: 'Test', from_qty: 1, to_qty: -1, confidence: 0.9 };
    expect(ChangedQtyItemSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('UnknownItemSchema', () => {
  it('validates unknown item from fixture', () => {
    expect(UnknownItemSchema.safeParse(mockCategorizedDelta.unknown[0]).success).toBe(true);
  });

  it('rejects empty note', () => {
    const invalid = { note: '', confidence: 0.5 };
    expect(UnknownItemSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('InventoryAnalysisRunSchema — Categorized Delta', () => {
  it('validates categorized delta fixture (all categories)', () => {
    const result = InventoryAnalysisRunSchema.safeParse(mockInventoryRunCategorized);
    expect(result.success).toBe(true);
  });

  it('validates categorized-mixed fixture (changed_qty only)', () => {
    const result = InventoryAnalysisRunSchema.safeParse(mockInventoryRunCategorizedMixed);
    expect(result.success).toBe(true);
  });

  it('categorized fixture run_ids are unique from flat fixtures', () => {
    const ids = [
      mockInventoryRunCategorized.run_id,
      mockInventoryRunCategorizedMixed.run_id,
      mockInventoryRunNeedsReview.run_id,
      mockInventoryRunCompleted.run_id,
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ============================================================================
// Feature 053 — Negative Validation Tests
// ============================================================================

describe('SubmitReviewRequestSchema — T028: rejects empty name in correction', () => {
  it('rejects override request with empty correction name', () => {
    const request = {
      action: 'override',
      corrections: [
        { name: '', original_count: 3, corrected_count: 4 },
      ],
    };
    const result = SubmitReviewRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });
});

describe('ReviewCorrectionSchema — T029: rejects negative counts', () => {
  it('rejects negative original_count', () => {
    const invalid = { name: 'Test', original_count: -1, corrected_count: 5 };
    const result = ReviewCorrectionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects negative corrected_count', () => {
    const invalid = { name: 'Test', original_count: 5, corrected_count: -1 };
    const result = ReviewCorrectionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('ReviewCorrectionSchema — T030: accepts added/removed flags', () => {
  it('accepts correction with added: true', () => {
    const correction = { name: 'Added Item', original_count: 0, corrected_count: 3, added: true };
    const result = ReviewCorrectionSchema.safeParse(correction);
    expect(result.success).toBe(true);
  });

  it('accepts correction with removed: true', () => {
    const correction = { name: 'Removed Item', original_count: 5, corrected_count: 0, removed: true };
    const result = ReviewCorrectionSchema.safeParse(correction);
    expect(result.success).toBe(true);
  });
});
