/**
 * Tests for Plan Generator
 * Feature 033 - US2: Extract Actionable Requirements
 */

import { describe, it, expect } from 'vitest';
import type { HandoffDocument } from '../../../scripts/handoff/types.js';
import {
  generateConsumptionPlan,
  updatePlanFrontmatter,
  calculateAutoStatus,
} from '../../../scripts/handoff/plan-generator.js';
import type { ConsumptionPlan } from '../../../scripts/handoff/types-consume.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockHandoff(): HandoffDocument {
  return {
    frontmatter: {
      handoff_id: '031-test-handoff',
      direction: 'incoming',
      from_repo: 'PiOrchestrator',
      to_repo: 'PiDashboard',
      created_at: '2026-01-10T12:00:00Z',
      status: 'new',
      requires: [
        { type: 'api', description: 'Update API endpoint routes' },
        { type: 'ui', description: 'Update component display' },
      ],
      acceptance: [
        'System handles new response schema correctly',
      ],
      risks: ['Breaking change to WiFi API'],
    },
    content: `---
handoff_id: 031-test-handoff
---

# Test Handoff

## Summary

This is a test handoff for the WiFi feature.

## Details

Some detailed information here.
`,
    filePath: 'docs/HANDOFF_031_TEST_HANDOFF.md',
  };
}

function createMockPlan(overrides: Partial<ConsumptionPlan['frontmatter']> = {}): ConsumptionPlan {
  return {
    frontmatter: {
      handoff_id: '031-test',
      source_handoff: 'docs/HANDOFF_031_TEST.md',
      status: 'pending',
      created_at: '2026-01-10T12:00:00Z',
      updated_at: '2026-01-10T12:00:00Z',
      requirements_total: 5,
      requirements_done: 0,
      ...overrides,
    },
    summary: 'Test plan',
    requirements: [],
    risks: [],
    testPlan: [],
    impactedFiles: [],
  };
}

// =============================================================================
// T018: Plan Generation Tests
// =============================================================================

describe('generateConsumptionPlan', () => {
  it('should generate plan with valid frontmatter', () => {
    const handoff = createMockHandoff();

    const plan = generateConsumptionPlan(handoff);

    expect(plan.frontmatter.handoff_id).toBe('031-test-handoff');
    expect(plan.frontmatter.source_handoff).toBe('docs/HANDOFF_031_TEST_HANDOFF.md');
    expect(plan.frontmatter.status).toBe('pending');
    expect(plan.frontmatter.created_at).toBeDefined();
    expect(plan.frontmatter.updated_at).toBeDefined();
  });

  it('should extract requirements from handoff', () => {
    const handoff = createMockHandoff();

    const plan = generateConsumptionPlan(handoff);

    expect(plan.requirements.length).toBeGreaterThan(0);
    expect(plan.frontmatter.requirements_total).toBe(plan.requirements.length);
    expect(plan.frontmatter.requirements_done).toBe(0);
  });

  it('should generate checklist with unique IDs', () => {
    const handoff = createMockHandoff();

    const plan = generateConsumptionPlan(handoff);
    const ids = plan.requirements.map(r => r.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
    expect(ids.every(id => id.match(/^REQ-\d{3}$/))).toBe(true);
  });

  it('should extract risks from handoff', () => {
    const handoff = createMockHandoff();

    const plan = generateConsumptionPlan(handoff);

    expect(plan.risks.length).toBeGreaterThan(0);
  });

  it('should generate test plan items', () => {
    const handoff = createMockHandoff();

    const plan = generateConsumptionPlan(handoff);

    expect(plan.testPlan.length).toBeGreaterThan(0);
    expect(plan.testPlan.every(t => t.status === 'pending')).toBe(true);
  });

  it('should generate impacted files list', () => {
    const handoff = createMockHandoff();

    const plan = generateConsumptionPlan(handoff);

    expect(plan.impactedFiles.length).toBeGreaterThan(0);
    expect(plan.impactedFiles.every(f => f.path && f.changeType && f.reason)).toBe(true);
  });

  it('should generate summary from handoff content', () => {
    const handoff = createMockHandoff();

    const plan = generateConsumptionPlan(handoff);

    expect(plan.summary).toBeTruthy();
    expect(plan.summary.length).toBeGreaterThan(0);
  });

  it('should add backwards compatibility risk when not authorized', () => {
    const handoff = createMockHandoff();

    const plan = generateConsumptionPlan(handoff);

    expect(plan.risks.some(r => r.description.toLowerCase().includes('backwards compatibility'))).toBe(true);
  });
});

// =============================================================================
// Plan Update Tests
// =============================================================================

describe('updatePlanFrontmatter', () => {
  it('should update specified fields', () => {
    const plan = createMockPlan();

    const updated = updatePlanFrontmatter(plan, { status: 'in_progress' });

    expect(updated.frontmatter.status).toBe('in_progress');
  });

  it('should update updated_at timestamp', () => {
    const plan = createMockPlan();
    const originalTime = plan.frontmatter.updated_at;

    // Wait a tiny bit to ensure different timestamp
    const updated = updatePlanFrontmatter(plan, { requirements_done: 1 });

    expect(updated.frontmatter.updated_at).not.toBe(originalTime);
  });

  it('should preserve unmodified fields', () => {
    const plan = createMockPlan();

    const updated = updatePlanFrontmatter(plan, { status: 'testing' });

    expect(updated.frontmatter.handoff_id).toBe(plan.frontmatter.handoff_id);
    expect(updated.frontmatter.requirements_total).toBe(plan.frontmatter.requirements_total);
  });
});

describe('calculateAutoStatus', () => {
  it('should return pending when no requirements done', () => {
    const plan = createMockPlan({ requirements_done: 0, requirements_total: 5 });

    expect(calculateAutoStatus(plan)).toBe('pending');
  });

  it('should return in_progress when some requirements done', () => {
    const plan = createMockPlan({ requirements_done: 2, requirements_total: 5 });

    expect(calculateAutoStatus(plan)).toBe('in_progress');
  });

  it('should return testing when all requirements done', () => {
    const plan = createMockPlan({ requirements_done: 5, requirements_total: 5 });

    expect(calculateAutoStatus(plan)).toBe('testing');
  });
});
