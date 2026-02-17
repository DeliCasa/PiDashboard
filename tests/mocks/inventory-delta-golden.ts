/**
 * Golden Fixtures: Inventory Delta Contract Drift Prevention
 * Feature: 052-delta-viewer-e2e (T019)
 *
 * Canonical BridgeServer response shapes as normalized by PiOrchestrator.
 * These fixtures represent the exact wire format PiDashboard receives.
 * All field names use snake_case (PiOrchestrator-normalized, not raw BridgeServer camelCase).
 *
 * IMPORTANT: Do NOT modify these fixtures without updating the corresponding
 * golden contract tests. Changes here indicate contract drift.
 */

import type {
  InventoryAnalysisRun,
  CategorizedDelta,
} from '@/infrastructure/api/inventory-delta-schemas';

// ============================================================================
// Golden: Success with Flat Delta (v1.0)
// ============================================================================

export const goldenSuccessFlat: InventoryAnalysisRun = {
  run_id: 'run-golden-flat-001',
  session_id: 'sess-golden-flat-001',
  container_id: 'ctr-golden-001',
  status: 'done',
  items_before: [
    { name: 'Coca-Cola 330ml', sku: 'CC330', quantity: 5, confidence: 0.95 },
    { name: 'Sprite 330ml', sku: 'SP330', quantity: 3, confidence: 0.88 },
  ],
  items_after: [
    { name: 'Coca-Cola 330ml', sku: 'CC330', quantity: 3, confidence: 0.92 },
    { name: 'Sprite 330ml', sku: 'SP330', quantity: 3, confidence: 0.90 },
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
    before_image_url: 'https://storage.example.com/images/golden-before.jpg',
    after_image_url: 'https://storage.example.com/images/golden-after.jpg',
  },
  review: null,
  metadata: {
    provider: 'openai',
    processing_time_ms: 4200,
    model_version: 'gpt-4o-2024-08-06',
    created_at: '2026-02-09T12:00:00Z',
    completed_at: '2026-02-09T12:00:04Z',
  },
};

// ============================================================================
// Golden: Success with Categorized Delta (v2.0)
// ============================================================================

export const goldenCategorizedDelta: CategorizedDelta = {
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

export const goldenSuccessCategorized: InventoryAnalysisRun = {
  run_id: 'run-golden-cat-001',
  session_id: 'sess-golden-cat-001',
  container_id: 'ctr-golden-001',
  status: 'done',
  items_before: [
    { name: 'Coca-Cola 330ml', sku: 'CC330', quantity: 5, confidence: 0.95 },
    { name: 'Sprite 330ml', sku: 'SP330', quantity: 3, confidence: 0.88 },
  ],
  items_after: [
    { name: 'Sprite 330ml', sku: 'SP330', quantity: 1, confidence: 0.90 },
    { name: 'Fanta 330ml', sku: 'FT330', quantity: 2, confidence: 0.88 },
  ],
  delta: goldenCategorizedDelta,
  evidence: {
    before_image_url: 'https://storage.example.com/images/golden-cat-before.jpg',
    after_image_url: 'https://storage.example.com/images/golden-cat-after.jpg',
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

// ============================================================================
// Golden: Pending
// ============================================================================

export const goldenPending: InventoryAnalysisRun = {
  run_id: 'run-golden-pending-001',
  session_id: 'sess-golden-pending-001',
  container_id: 'ctr-golden-001',
  status: 'pending',
  items_before: null,
  items_after: null,
  delta: null,
  evidence: null,
  review: null,
  metadata: {
    provider: 'openai',
    created_at: '2026-02-09T12:00:00Z',
  },
};

// ============================================================================
// Golden: Error
// ============================================================================

export const goldenError: InventoryAnalysisRun = {
  run_id: 'run-golden-error-001',
  session_id: 'sess-golden-error-001',
  container_id: 'ctr-golden-001',
  status: 'error',
  items_before: null,
  items_after: null,
  delta: null,
  evidence: null,
  review: null,
  metadata: {
    provider: 'openai',
    error_message: 'Vision API timeout after 30s',
    created_at: '2026-02-09T12:00:00Z',
  },
};

// ============================================================================
// Golden: Processing
// ============================================================================

export const goldenProcessing: InventoryAnalysisRun = {
  ...goldenPending,
  run_id: 'run-golden-processing-001',
  session_id: 'sess-golden-processing-001',
  status: 'processing',
};

// ============================================================================
// Golden: Needs Review
// ============================================================================

export const goldenNeedsReview: InventoryAnalysisRun = {
  ...goldenSuccessFlat,
  run_id: 'run-golden-needs-review-001',
  session_id: 'sess-golden-needs-review-001',
  status: 'needs_review',
};

// ============================================================================
// Golden: With Review
// ============================================================================

export const goldenWithReview: InventoryAnalysisRun = {
  ...goldenSuccessFlat,
  run_id: 'run-golden-reviewed-001',
  session_id: 'sess-golden-reviewed-001',
  review: {
    reviewer_id: 'operator-golden-001',
    action: 'override',
    corrections: [
      {
        name: 'Coca-Cola 330ml',
        sku: 'CC330',
        original_count: 3,
        corrected_count: 4,
      },
    ],
    notes: 'Adjusted count after manual inspection',
    reviewed_at: '2026-02-09T12:10:00Z',
  },
};

// ============================================================================
// All Golden Fixtures (for iteration)
// ============================================================================

export const allGoldenFixtures = [
  { name: 'goldenSuccessFlat', fixture: goldenSuccessFlat },
  { name: 'goldenSuccessCategorized', fixture: goldenSuccessCategorized },
  { name: 'goldenPending', fixture: goldenPending },
  { name: 'goldenProcessing', fixture: goldenProcessing },
  { name: 'goldenNeedsReview', fixture: goldenNeedsReview },
  { name: 'goldenError', fixture: goldenError },
  { name: 'goldenWithReview', fixture: goldenWithReview },
] as const;
