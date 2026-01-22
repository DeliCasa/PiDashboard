/**
 * Tests for Consumption Report Generation
 * Feature 033 - US5: Close the Loop with Documentation
 * Feature 033 - US6: Generate Outgoing Handoffs for Blockers
 */

import { describe, it, expect } from 'vitest';
import type { HandoffDocument } from '../../../scripts/handoff/types.js';
import type { ConsumptionPlan, VerificationResult } from '../../../scripts/handoff/types-consume.js';
import {
  generateConsumptionReport,
  generateBlockedReport,
} from '../../../scripts/handoff/report.js';

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
      status: 'in_progress',
      requires: [
        { type: 'api', description: 'Update API endpoint' },
      ],
      acceptance: ['System handles new response'],
    },
    content: '# Test Handoff\n\nContent here.',
    filePath: 'docs/HANDOFF_031_TEST_HANDOFF.md',
  };
}

function createMockPlan(): ConsumptionPlan {
  return {
    frontmatter: {
      handoff_id: '031-test-handoff',
      source_handoff: 'docs/HANDOFF_031_TEST_HANDOFF.md',
      status: 'testing',
      created_at: '2026-01-10T12:00:00Z',
      updated_at: '2026-01-12T12:00:00Z',
      requirements_total: 3,
      requirements_done: 3,
    },
    summary: 'Test plan summary',
    requirements: [],
    risks: [],
    testPlan: [],
    impactedFiles: [],
  };
}

function createVerificationResults(allPass: boolean = true): VerificationResult[] {
  return [
    { command: 'npm test', expected: 'pass', actual: 'pass', passed: true },
    { command: 'npm run lint', expected: 'pass', actual: allPass ? 'pass' : 'fail', passed: allPass },
  ];
}

// =============================================================================
// T040: Report Generation Tests (US5)
// =============================================================================

describe('generateConsumptionReport', () => {
  it('should generate report with all required sections', async () => {
    const handoff = createMockHandoff();
    const plan = createMockPlan();
    const verification = createVerificationResults(true);

    const report = await generateConsumptionReport(handoff, plan, verification);

    expect(report.frontmatter.handoff_id).toBe('031-test-handoff');
    expect(report.frontmatter.status).toBe('done');
    expect(report.frontmatter.completed_at).toBeDefined();
    expect(report.requestSummary).toBeTruthy();
    expect(report.changesSummary).toBeDefined();
    expect(report.verification).toEqual(verification);
  });

  it('should include consumption plan path in frontmatter', async () => {
    const handoff = createMockHandoff();
    const plan = createMockPlan();
    const verification = createVerificationResults(true);

    const report = await generateConsumptionReport(handoff, plan, verification);

    expect(report.frontmatter.consumption_plan).toContain('031-test-handoff');
    expect(report.frontmatter.consumption_plan).toContain('plan.md');
  });

  it('should populate related_commits array', async () => {
    const handoff = createMockHandoff();
    const plan = createMockPlan();
    const verification = createVerificationResults(true);

    const report = await generateConsumptionReport(handoff, plan, verification);

    expect(Array.isArray(report.frontmatter.related_commits)).toBe(true);
  });

  it('should include change summary with file stats', async () => {
    const handoff = createMockHandoff();
    const plan = createMockPlan();
    const verification = createVerificationResults(true);

    const report = await generateConsumptionReport(handoff, plan, verification);

    expect(report.changesSummary).toHaveProperty('filesModified');
    expect(report.changesSummary).toHaveProperty('linesAdded');
    expect(report.changesSummary).toHaveProperty('linesRemoved');
  });
});

// =============================================================================
// T041: Handoff Status Update Tests (US5)
// =============================================================================

describe('report frontmatter status', () => {
  it('should set status to done for successful reports', async () => {
    const handoff = createMockHandoff();
    const plan = createMockPlan();
    const verification = createVerificationResults(true);

    const report = await generateConsumptionReport(handoff, plan, verification);

    expect(report.frontmatter.status).toBe('done');
  });
});

// =============================================================================
// T048-T049: Blocker Handoff Tests (US6)
// =============================================================================

describe('generateBlockedReport', () => {
  it('should generate report with blocked status', async () => {
    const handoff = createMockHandoff();
    const plan = createMockPlan();
    const blockerReason = 'WiFi endpoint not implemented';
    const blockerPath = 'docs/HANDOFF_031_BLOCKER.md';

    const report = await generateBlockedReport(handoff, plan, blockerReason, blockerPath);

    expect(report.frontmatter.status).toBe('blocked');
    expect(report.frontmatter.blocker_handoff).toBe(blockerPath);
  });

  it('should include blocker reason in follow-ups', async () => {
    const handoff = createMockHandoff();
    const plan = createMockPlan();
    const blockerReason = 'WiFi endpoint not implemented';
    const blockerPath = 'docs/HANDOFF_031_BLOCKER.md';

    const report = await generateBlockedReport(handoff, plan, blockerReason, blockerPath);

    expect(report.followUps.some(f => f.includes(blockerReason))).toBe(true);
  });

  it('should link to outgoing handoff in follow-ups', async () => {
    const handoff = createMockHandoff();
    const plan = createMockPlan();
    const blockerReason = 'WiFi endpoint not implemented';
    const blockerPath = 'docs/HANDOFF_031_BLOCKER.md';

    const report = await generateBlockedReport(handoff, plan, blockerReason, blockerPath);

    expect(report.followUps.some(f => f.includes(blockerPath))).toBe(true);
  });
});
