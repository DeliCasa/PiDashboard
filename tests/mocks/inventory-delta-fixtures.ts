/**
 * Mock Fixtures: Inventory Delta Viewer
 * Feature: 047-inventory-delta-viewer
 *
 * Schema-valid test data for all analysis statuses and edge cases.
 */

import type {
  InventoryAnalysisRun,
  InventoryLatestResponse,
  ReviewResponse,
  RunListItem,
  RunListResponse,
  CategorizedDelta,
} from '@/infrastructure/api/inventory-delta-schemas';

// ============================================================================
// Constants
// ============================================================================

const RUN_ID = 'run-a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const SESSION_ID = 'sess-s1s2s3s4-e5f6-7890-abcd-ef1234567890';
const CONTAINER_ID = 'ctr-c1c2c3c4-e5f6-7890-abcd-ef1234567890';
const TIMESTAMP = '2026-02-09T12:00:00Z';

// ============================================================================
// Completed Analysis (needs_review status)
// ============================================================================

export const mockInventoryRunNeedsReview: InventoryAnalysisRun = {
  run_id: RUN_ID,
  session_id: SESSION_ID,
  container_id: CONTAINER_ID,
  status: 'needs_review',
  items_before: [
    {
      name: 'Coca-Cola 330ml',
      sku: 'CC330',
      quantity: 5,
      confidence: 0.95,
      bounding_box: { x: 10, y: 20, width: 50, height: 80 },
      condition: 'good',
    },
    {
      name: 'Sprite 330ml',
      sku: 'SP330',
      quantity: 3,
      confidence: 0.88,
    },
  ],
  items_after: [
    {
      name: 'Coca-Cola 330ml',
      sku: 'CC330',
      quantity: 3,
      confidence: 0.92,
      bounding_box: { x: 10, y: 20, width: 50, height: 80 },
      condition: 'good',
    },
    {
      name: 'Sprite 330ml',
      sku: 'SP330',
      quantity: 3,
      confidence: 0.90,
    },
  ],
  delta: [
    {
      name: 'Coca-Cola 330ml',
      sku: 'CC330',
      before_count: 5,
      after_count: 3,
      change: -2,
      confidence: 0.92,
      rationale: 'Two cans removed from shelf',
    },
    {
      name: 'Sprite 330ml',
      sku: 'SP330',
      before_count: 3,
      after_count: 3,
      change: 0,
      confidence: 0.90,
      rationale: 'No change detected',
    },
  ],
  evidence: {
    before_image_url: 'https://storage.example.com/images/before-abc123.jpg?token=xyz',
    after_image_url: 'https://storage.example.com/images/after-abc123.jpg?token=xyz',
    overlays: {
      before: [
        {
          label: 'Coca-Cola 330ml (5)',
          bounding_box: { x: 10, y: 20, width: 50, height: 80 },
          confidence: 0.95,
        },
      ],
      after: [
        {
          label: 'Coca-Cola 330ml (3)',
          bounding_box: { x: 10, y: 20, width: 50, height: 80 },
          confidence: 0.92,
        },
      ],
    },
  },
  review: null,
  metadata: {
    provider: 'openai',
    processing_time_ms: 4200,
    model_version: 'gpt-4o-2024-08-06',
    created_at: '2026-02-09T11:59:00Z',
    completed_at: '2026-02-09T11:59:04Z',
  },
};

// ============================================================================
// Done Analysis (done status)
// ============================================================================

export const mockInventoryRunCompleted: InventoryAnalysisRun = {
  ...mockInventoryRunNeedsReview,
  run_id: 'run-completed-001',
  status: 'done',
};

// ============================================================================
// Pending Analysis
// ============================================================================

export const mockInventoryRunPending: InventoryAnalysisRun = {
  run_id: 'run-pending-001',
  session_id: SESSION_ID,
  container_id: CONTAINER_ID,
  status: 'pending',
  items_before: null,
  items_after: null,
  delta: null,
  evidence: null,
  review: null,
  metadata: {
    provider: 'openai',
    created_at: '2026-02-09T11:59:00Z',
  },
};

// ============================================================================
// Processing Analysis
// ============================================================================

export const mockInventoryRunProcessing: InventoryAnalysisRun = {
  run_id: 'run-processing-001',
  session_id: SESSION_ID,
  container_id: CONTAINER_ID,
  status: 'processing',
  items_before: null,
  items_after: null,
  delta: null,
  evidence: null,
  review: null,
  metadata: {
    provider: 'openai',
    created_at: '2026-02-09T11:59:00Z',
  },
};

// ============================================================================
// Error Analysis
// ============================================================================

export const mockInventoryRunFailed: InventoryAnalysisRun = {
  run_id: 'run-failed-001',
  session_id: SESSION_ID,
  container_id: CONTAINER_ID,
  status: 'error',
  items_before: null,
  items_after: null,
  delta: null,
  evidence: null,
  review: null,
  metadata: {
    provider: 'openai',
    error_message: 'Vision API timeout after 30s',
    created_at: '2026-02-09T11:59:00Z',
  },
};

// ============================================================================
// Done with Review (with corrections)
// ============================================================================

export const mockInventoryRunApproved: InventoryAnalysisRun = {
  ...mockInventoryRunNeedsReview,
  run_id: 'run-approved-001',
  status: 'done',
  review: {
    reviewer_id: 'operator-1',
    action: 'override',
    corrections: [
      {
        name: 'Coca-Cola 330ml',
        sku: 'CC330',
        original_count: 3,
        corrected_count: 4,
      },
      {
        name: 'Water 500ml',
        sku: null,
        original_count: 0,
        corrected_count: 2,
        added: true,
      },
    ],
    notes: 'Adjusted Coca-Cola count, added missed Water bottles.',
    reviewed_at: '2026-02-09T12:05:00Z',
  },
};

// ============================================================================
// Done with Review as-is (no corrections)
// ============================================================================

export const mockInventoryRunApprovedAsIs: InventoryAnalysisRun = {
  ...mockInventoryRunNeedsReview,
  run_id: 'run-approved-asis-001',
  status: 'done',
  review: {
    reviewer_id: 'operator-2',
    action: 'approve',
    corrections: [],
    notes: '',
    reviewed_at: '2026-02-09T12:10:00Z',
  },
};

// ============================================================================
// Edge Cases
// ============================================================================

/** All items have low confidence (< 0.5) */
export const mockInventoryRunLowConfidence: InventoryAnalysisRun = {
  ...mockInventoryRunNeedsReview,
  run_id: 'run-low-conf-001',
  delta: [
    {
      name: 'Unknown Item A',
      before_count: 2,
      after_count: 1,
      change: -1,
      confidence: 0.35,
      rationale: 'Uncertain detection',
    },
    {
      name: 'Unknown Item B',
      before_count: 1,
      after_count: 0,
      change: -1,
      confidence: 0.28,
      rationale: 'Very uncertain',
    },
  ],
};

/** All changes are zero (no delta) */
export const mockInventoryRunZeroDelta: InventoryAnalysisRun = {
  ...mockInventoryRunNeedsReview,
  run_id: 'run-zero-delta-001',
  status: 'done',
  delta: [
    {
      name: 'Coca-Cola 330ml',
      sku: 'CC330',
      before_count: 5,
      after_count: 5,
      change: 0,
      confidence: 0.95,
      rationale: 'No change detected',
    },
    {
      name: 'Sprite 330ml',
      sku: 'SP330',
      before_count: 3,
      after_count: 3,
      change: 0,
      confidence: 0.90,
      rationale: 'No change detected',
    },
  ],
};

/** Single image only (before missing) */
export const mockInventoryRunSingleImage: InventoryAnalysisRun = {
  ...mockInventoryRunNeedsReview,
  run_id: 'run-single-img-001',
  evidence: {
    after_image_url: 'https://storage.example.com/images/after-abc123.jpg?token=xyz',
  },
};

// ============================================================================
// Response Envelopes
// ============================================================================

export const mockInventoryLatestResponse: InventoryLatestResponse = {
  success: true,
  data: mockInventoryRunNeedsReview,
  timestamp: TIMESTAMP,
  request_id: 'req-uuid-123',
};

export const mockInventoryLatestPendingResponse: InventoryLatestResponse = {
  success: true,
  data: mockInventoryRunPending,
  timestamp: TIMESTAMP,
};

export const mockInventoryNotFoundResponse: InventoryLatestResponse = {
  success: false,
  error: {
    code: 'INVENTORY_NOT_FOUND',
    message: 'No inventory analysis found for this container.',
    retryable: false,
  },
  timestamp: TIMESTAMP,
};

export const mockInventoryServiceUnavailableResponse: InventoryLatestResponse = {
  success: false,
  error: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Inventory analysis service is temporarily unavailable.',
    retryable: true,
    retry_after_seconds: 30,
  },
  timestamp: TIMESTAMP,
};

export const mockReviewSuccessResponse: ReviewResponse = {
  success: true,
  data: {
    run_id: RUN_ID,
    status: 'done',
    review: {
      reviewer_id: 'operator-1',
      action: 'override',
      corrections: [
        {
          name: 'Coca-Cola 330ml',
          sku: 'CC330',
          original_count: 3,
          corrected_count: 4,
        },
      ],
      notes: 'Adjusted Coca-Cola count.',
      reviewed_at: '2026-02-09T12:05:00Z',
    },
  },
  timestamp: TIMESTAMP,
};

export const mockReviewConflictResponse: ReviewResponse = {
  success: false,
  error: {
    code: 'REVIEW_CONFLICT',
    message: 'This analysis run has already been reviewed.',
    retryable: false,
  },
  timestamp: TIMESTAMP,
};

export const mockReviewInvalidResponse: ReviewResponse = {
  success: false,
  error: {
    code: 'REVIEW_INVALID',
    message: 'Review data is invalid. Check corrections.',
    retryable: false,
  },
  timestamp: TIMESTAMP,
};

// ============================================================================
// Run List (Feature 048)
// ============================================================================

export const mockRunListItems: RunListItem[] = [
  {
    run_id: 'run-done-001',
    session_id: 'sess-aaa11111-1111-1111-1111-111111111111',
    container_id: CONTAINER_ID,
    status: 'done',
    delta_summary: {
      total_items: 5,
      items_changed: 2,
      items_added: 0,
      items_removed: 0,
    },
    metadata: {
      provider: 'openai',
      processing_time_ms: 4200,
      model_version: 'gpt-4o-2024-08-06',
      created_at: '2026-02-09T11:59:00Z',
      completed_at: '2026-02-09T11:59:04Z',
    },
  },
  {
    run_id: 'run-needs-review-002',
    session_id: 'sess-bbb22222-2222-2222-2222-222222222222',
    container_id: CONTAINER_ID,
    status: 'needs_review',
    delta_summary: {
      total_items: 8,
      items_changed: 3,
      items_added: 1,
      items_removed: 0,
    },
    metadata: {
      provider: 'openai',
      processing_time_ms: 5100,
      model_version: 'gpt-4o-2024-08-06',
      created_at: '2026-02-09T10:30:00Z',
      completed_at: '2026-02-09T10:30:05Z',
    },
  },
  {
    run_id: 'run-processing-003',
    session_id: 'sess-ccc33333-3333-3333-3333-333333333333',
    container_id: CONTAINER_ID,
    status: 'processing',
    delta_summary: null,
    metadata: {
      provider: 'openai',
      created_at: '2026-02-09T09:00:00Z',
    },
  },
  {
    run_id: 'run-pending-004',
    session_id: 'sess-ddd44444-4444-4444-4444-444444444444',
    container_id: CONTAINER_ID,
    status: 'pending',
    delta_summary: null,
    metadata: {
      provider: 'openai',
      created_at: '2026-02-09T08:00:00Z',
    },
  },
  {
    run_id: 'run-error-005',
    session_id: 'sess-eee55555-5555-5555-5555-555555555555',
    container_id: CONTAINER_ID,
    status: 'error',
    delta_summary: null,
    metadata: {
      provider: 'openai',
      error_message: 'Vision API timeout after 30s',
      created_at: '2026-02-09T07:00:00Z',
    },
  },
];

export const mockRunListResponse: RunListResponse = {
  success: true,
  data: {
    runs: mockRunListItems,
    pagination: {
      total: 42,
      limit: 20,
      offset: 0,
      has_more: true,
    },
  },
  timestamp: TIMESTAMP,
  request_id: 'req-uuid-456',
};

export const mockRunListEmpty: RunListResponse = {
  success: true,
  data: {
    runs: [],
    pagination: {
      total: 0,
      limit: 20,
      offset: 0,
      has_more: false,
    },
  },
  timestamp: TIMESTAMP,
};

export const mockRunListSecondPage: RunListResponse = {
  success: true,
  data: {
    runs: [
      {
        run_id: 'run-page2-001',
        session_id: 'sess-fff66666-6666-6666-6666-666666666666',
        container_id: CONTAINER_ID,
        status: 'done',
        delta_summary: {
          total_items: 4,
          items_changed: 1,
          items_added: 0,
          items_removed: 1,
        },
        metadata: {
          provider: 'openai',
          processing_time_ms: 3800,
          model_version: 'gpt-4o-2024-08-06',
          created_at: '2026-02-08T15:00:00Z',
          completed_at: '2026-02-08T15:00:04Z',
        },
      },
    ],
    pagination: {
      total: 42,
      limit: 20,
      offset: 20,
      has_more: true,
    },
  },
  timestamp: TIMESTAMP,
  request_id: 'req-uuid-789',
};

// ============================================================================
// Categorized Delta Fixtures (Feature 052 — BridgeServer v2.0 format)
// ============================================================================

/** Categorized delta with all four categories populated */
export const mockCategorizedDelta: CategorizedDelta = {
  added: [
    { name: 'Fanta 330ml', qty: 2, confidence: 0.88, bbox: null },
  ],
  removed: [
    { name: 'Coca-Cola 330ml', qty: 2, confidence: 0.95, bbox: null },
  ],
  changed_qty: [
    { name: 'Sprite 330ml', from_qty: 3, to_qty: 1, confidence: 0.85 },
  ],
  unknown: [
    { note: 'Unidentified item near bottom shelf', confidence: 0.35 },
  ],
};

/** Analysis run with categorized delta (v2.0 format) */
export const mockInventoryRunCategorized: InventoryAnalysisRun = {
  run_id: 'run-categorized-001',
  session_id: SESSION_ID,
  container_id: CONTAINER_ID,
  status: 'done',
  items_before: [
    { name: 'Coca-Cola 330ml', sku: 'CC330', quantity: 5, confidence: 0.95 },
    { name: 'Sprite 330ml', sku: 'SP330', quantity: 3, confidence: 0.88 },
  ],
  items_after: [
    { name: 'Sprite 330ml', sku: 'SP330', quantity: 1, confidence: 0.90 },
    { name: 'Fanta 330ml', sku: 'FT330', quantity: 2, confidence: 0.88 },
  ],
  delta: mockCategorizedDelta,
  evidence: {
    before_image_url: 'https://storage.example.com/images/before-cat.jpg',
    after_image_url: 'https://storage.example.com/images/after-cat.jpg',
  },
  review: null,
  metadata: {
    provider: 'openai',
    processing_time_ms: 3800,
    model_version: 'gpt-4o-2024-08-06',
    created_at: '2026-02-09T12:00:00Z',
    completed_at: '2026-02-09T12:00:04Z',
  },
};

/** Categorized delta with only changed quantities (no adds/removes/unknowns) */
export const mockInventoryRunCategorizedMixed: InventoryAnalysisRun = {
  ...mockInventoryRunCategorized,
  run_id: 'run-categorized-mixed-001',
  delta: {
    added: [],
    removed: [],
    changed_qty: [
      { name: 'Coca-Cola 330ml', from_qty: 5, to_qty: 3, confidence: 0.92 },
      { name: 'Sprite 330ml', from_qty: 3, to_qty: 3, confidence: 0.90 },
    ],
    unknown: [],
  },
};
