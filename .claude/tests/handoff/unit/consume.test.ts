/**
 * Tests for Handoff Consumption Workflow
 * Feature 033 - US1: Discover Unresolved Handoffs
 */

import { describe, it, expect } from 'vitest';
import type { HandoffDocument, HandoffStatus } from '../../../scripts/handoff/types.js';
import {
  filterUnresolvedHandoffs,
  sortByPriorityAndDate,
  markRequirementComplete,
  updatePlanStatus,
  validateTestsPassing,
} from '../../../scripts/handoff/consume.js';
import type { ExtractedRequirement, ConsumptionPlan } from '../../../scripts/handoff/types-consume.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockHandoff(
  id: string,
  status: HandoffStatus,
  direction: 'incoming' | 'outgoing' = 'incoming',
  toRepo: string = 'PiDashboard',
  createdAt: string = '2026-01-10T12:00:00Z'
): HandoffDocument {
  return {
    frontmatter: {
      handoff_id: id,
      direction,
      from_repo: direction === 'incoming' ? 'PiOrchestrator' : 'PiDashboard',
      to_repo: toRepo,
      created_at: createdAt,
      status,
    },
    content: `# Test Handoff ${id}`,
    filePath: `docs/HANDOFF_${id.toUpperCase().replace(/-/g, '_')}.md`,
  };
}

function createMockRequirement(
  id: string,
  completed: boolean = false
): ExtractedRequirement {
  return {
    id,
    category: 'api_client',
    description: `Test requirement ${id}`,
    source: { type: 'frontmatter', field: 'requires[0]' },
    priority: 1,
    completed,
    tests: [],
    files: [],
  };
}

function createMockPlan(
  requirementsDone: number,
  requirementsTotal: number
): ConsumptionPlan {
  return {
    frontmatter: {
      handoff_id: 'test-handoff',
      source_handoff: 'docs/HANDOFF_TEST.md',
      status: 'pending',
      created_at: '2026-01-10T12:00:00Z',
      updated_at: '2026-01-10T12:00:00Z',
      requirements_total: requirementsTotal,
      requirements_done: requirementsDone,
    },
    summary: 'Test plan',
    requirements: [],
    risks: [],
    testPlan: [],
    impactedFiles: [],
  };
}

// =============================================================================
// T009: Discovery Filtering Tests
// =============================================================================

describe('filterUnresolvedHandoffs', () => {
  it('should filter out done handoffs', () => {
    const handoffs = [
      createMockHandoff('001-test', 'new'),
      createMockHandoff('002-test', 'done'),
      createMockHandoff('003-test', 'in_progress'),
    ];

    const result = filterUnresolvedHandoffs(handoffs);

    expect(result).toHaveLength(2);
    expect(result.map(h => h.frontmatter.handoff_id)).toEqual(['001-test', '003-test']);
  });

  it('should filter out acknowledged handoffs', () => {
    const handoffs = [
      createMockHandoff('001-test', 'new'),
      createMockHandoff('002-test', 'acknowledged'),
      createMockHandoff('003-test', 'blocked'),
    ];

    const result = filterUnresolvedHandoffs(handoffs);

    expect(result).toHaveLength(2);
    expect(result.map(h => h.frontmatter.handoff_id)).toEqual(['001-test', '003-test']);
  });

  it('should keep new, in_progress, and blocked handoffs', () => {
    const handoffs = [
      createMockHandoff('001-test', 'new'),
      createMockHandoff('002-test', 'in_progress'),
      createMockHandoff('003-test', 'blocked'),
    ];

    const result = filterUnresolvedHandoffs(handoffs);

    expect(result).toHaveLength(3);
  });

  it('should return empty array when all are resolved', () => {
    const handoffs = [
      createMockHandoff('001-test', 'done'),
      createMockHandoff('002-test', 'acknowledged'),
    ];

    const result = filterUnresolvedHandoffs(handoffs);

    expect(result).toHaveLength(0);
  });

  it('should handle empty input', () => {
    const result = filterUnresolvedHandoffs([]);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// T010: Discovery Sorting Tests
// =============================================================================

describe('sortByPriorityAndDate', () => {
  it('should sort by status priority: new → in_progress → blocked', () => {
    const handoffs = [
      createMockHandoff('001-blocked', 'blocked'),
      createMockHandoff('002-new', 'new'),
      createMockHandoff('003-progress', 'in_progress'),
    ];

    const result = sortByPriorityAndDate(handoffs);

    expect(result.map(h => h.frontmatter.status)).toEqual([
      'new',
      'in_progress',
      'blocked',
    ]);
  });

  it('should sort by date (newest first) within same status', () => {
    const handoffs = [
      createMockHandoff('001-old', 'new', 'incoming', 'PiDashboard', '2026-01-05T12:00:00Z'),
      createMockHandoff('002-new', 'new', 'incoming', 'PiDashboard', '2026-01-10T12:00:00Z'),
      createMockHandoff('003-mid', 'new', 'incoming', 'PiDashboard', '2026-01-08T12:00:00Z'),
    ];

    const result = sortByPriorityAndDate(handoffs);

    expect(result.map(h => h.frontmatter.handoff_id)).toEqual([
      '002-new',
      '003-mid',
      '001-old',
    ]);
  });

  it('should handle mixed statuses with dates correctly', () => {
    const handoffs = [
      createMockHandoff('001-blocked-old', 'blocked', 'incoming', 'PiDashboard', '2026-01-01T12:00:00Z'),
      createMockHandoff('002-new-old', 'new', 'incoming', 'PiDashboard', '2026-01-05T12:00:00Z'),
      createMockHandoff('003-new-recent', 'new', 'incoming', 'PiDashboard', '2026-01-10T12:00:00Z'),
      createMockHandoff('004-progress', 'in_progress', 'incoming', 'PiDashboard', '2026-01-08T12:00:00Z'),
    ];

    const result = sortByPriorityAndDate(handoffs);

    // First by status (new first), then by date within status
    expect(result.map(h => h.frontmatter.handoff_id)).toEqual([
      '003-new-recent',  // new, newest
      '002-new-old',     // new, older
      '004-progress',    // in_progress
      '001-blocked-old', // blocked
    ]);
  });

  it('should not modify original array', () => {
    const handoffs = [
      createMockHandoff('001-blocked', 'blocked'),
      createMockHandoff('002-new', 'new'),
    ];

    const original = [...handoffs];
    sortByPriorityAndDate(handoffs);

    expect(handoffs).toEqual(original);
  });

  it('should handle empty input', () => {
    const result = sortByPriorityAndDate([]);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// T027: Requirement Completion Tests (US3)
// =============================================================================

describe('markRequirementComplete', () => {
  it('should mark specified requirement as complete', () => {
    const requirements = [
      createMockRequirement('REQ-001', false),
      createMockRequirement('REQ-002', false),
      createMockRequirement('REQ-003', false),
    ];

    const result = markRequirementComplete(requirements, 'REQ-002');

    expect(result.find(r => r.id === 'REQ-002')?.completed).toBe(true);
    expect(result.find(r => r.id === 'REQ-001')?.completed).toBe(false);
    expect(result.find(r => r.id === 'REQ-003')?.completed).toBe(false);
  });

  it('should not modify other requirements', () => {
    const requirements = [
      createMockRequirement('REQ-001', true),
      createMockRequirement('REQ-002', false),
    ];

    const result = markRequirementComplete(requirements, 'REQ-002');

    expect(result.find(r => r.id === 'REQ-001')?.completed).toBe(true);
    expect(result.find(r => r.id === 'REQ-002')?.completed).toBe(true);
  });

  it('should handle non-existent requirement gracefully', () => {
    const requirements = [createMockRequirement('REQ-001', false)];

    const result = markRequirementComplete(requirements, 'REQ-999');

    expect(result).toHaveLength(1);
    expect(result[0].completed).toBe(false);
  });
});

// =============================================================================
// T028: Plan Status Transition Tests (US3)
// =============================================================================

describe('updatePlanStatus', () => {
  it('should return pending when no requirements done', () => {
    const plan = createMockPlan(0, 5);
    const result = updatePlanStatus(plan);
    expect(result).toBe('pending');
  });

  it('should return in_progress when some requirements done', () => {
    const plan = createMockPlan(2, 5);
    const result = updatePlanStatus(plan);
    expect(result).toBe('in_progress');
  });

  it('should return testing when all requirements done', () => {
    const plan = createMockPlan(5, 5);
    const result = updatePlanStatus(plan);
    expect(result).toBe('testing');
  });

  it('should handle zero total requirements', () => {
    const plan = createMockPlan(0, 0);
    const result = updatePlanStatus(plan);
    expect(result).toBe('pending');
  });
});

// =============================================================================
// T034-T035: Test Status Tracking & Validation (US4)
// =============================================================================

describe('validateTestsPassing', () => {
  it('should return true when all verification results pass', () => {
    const results: import('../../../scripts/handoff/types-consume.js').VerificationResult[] = [
      { command: 'npm test', expected: 'pass', actual: 'pass', passed: true },
      { command: 'npm run lint', expected: 'pass', actual: 'pass', passed: true },
    ];

    expect(validateTestsPassing(results)).toBe(true);
  });

  it('should return false when any verification result fails', () => {
    const results: import('../../../scripts/handoff/types-consume.js').VerificationResult[] = [
      { command: 'npm test', expected: 'pass', actual: 'pass', passed: true },
      { command: 'npm run lint', expected: 'pass', actual: 'fail', passed: false },
    ];

    expect(validateTestsPassing(results)).toBe(false);
  });

  it('should return true for empty results array', () => {
    expect(validateTestsPassing([])).toBe(true);
  });
});
