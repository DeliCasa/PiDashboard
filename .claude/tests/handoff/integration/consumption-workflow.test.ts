/**
 * Integration Tests for Handoff Consumption Workflow
 * Feature 033 - End-to-end workflow validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { discoverIncomingHandoffs } from '../../../scripts/handoff/consume.js';
import { generateConsumptionPlan, writeConsumptionPlan } from '../../../scripts/handoff/plan-generator.js';
import type { HandoffDocument } from '../../../scripts/handoff/types.js';

// =============================================================================
// Test Setup
// =============================================================================

const TEST_DIR = path.join(process.cwd(), 'tests', 'integration', 'handoff', '__fixtures__');
const TEST_HANDOFF_PATH = path.join(TEST_DIR, 'HANDOFF_999_TEST_INTEGRATION.md');
const TEST_PLAN_DIR = path.join(process.cwd(), 'specs', '999-test-integration-consumption');

const MOCK_HANDOFF_CONTENT = `---
handoff_id: "999-test-integration"
direction: incoming
from_repo: PiOrchestrator
to_repo: PiDashboard
created_at: "2026-01-10T12:00:00Z"
status: new
requires:
  - type: api
    description: Update WiFi scan endpoint to v2 format
  - type: ui
    description: Update NetworkList component to display signal quality
acceptance:
  - WiFi scan returns networks with signalQuality field
  - NetworkList shows quality indicator
risks:
  - Breaking change to WiFi API response schema
---

# Test Integration Handoff

## Summary

This is a test handoff for integration testing the consumption workflow.

## Details

- New WiFi API endpoint format
- Updated response schema
`;

describe('Handoff Consumption Workflow Integration', () => {
  beforeAll(async () => {
    // Create test fixtures directory
    await fs.mkdir(TEST_DIR, { recursive: true });
    // Create test handoff file
    await fs.writeFile(TEST_HANDOFF_PATH, MOCK_HANDOFF_CONTENT, 'utf-8');
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
      await fs.rm(TEST_PLAN_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // =============================================================================
  // Discovery Tests
  // =============================================================================

  describe('Discovery Workflow', () => {
    it('should discover handoffs without errors', async () => {
      const result = await discoverIncomingHandoffs();

      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(Array.isArray(result.incoming)).toBe(true);
      expect(Array.isArray(result.unresolved)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should categorize handoffs by status correctly', async () => {
      const result = await discoverIncomingHandoffs();

      // All returned handoffs should be incoming to PiDashboard
      for (const h of result.incoming) {
        expect(h.frontmatter.direction).toBe('incoming');
        expect(h.frontmatter.to_repo).toBe('PiDashboard');
      }
    });
  });

  // =============================================================================
  // Plan Generation Tests
  // =============================================================================

  describe('Plan Generation Workflow', () => {
    it('should generate valid consumption plan from handoff', () => {
      const mockHandoff: HandoffDocument = {
        frontmatter: {
          handoff_id: '999-test-integration',
          direction: 'incoming',
          from_repo: 'PiOrchestrator',
          to_repo: 'PiDashboard',
          created_at: '2026-01-10T12:00:00Z',
          status: 'new',
          requires: [
            { type: 'api', description: 'Update WiFi scan endpoint' },
            { type: 'ui', description: 'Update component display' },
          ],
          acceptance: ['WiFi scan works correctly'],
          risks: ['Breaking change'],
        },
        content: MOCK_HANDOFF_CONTENT,
        filePath: TEST_HANDOFF_PATH,
      };

      const plan = generateConsumptionPlan(mockHandoff);

      expect(plan.frontmatter.handoff_id).toBe('999-test-integration');
      expect(plan.frontmatter.status).toBe('pending');
      expect(plan.requirements.length).toBeGreaterThan(0);
      expect(plan.risks.length).toBeGreaterThan(0);
    });

    it('should write consumption plan to filesystem', async () => {
      const mockHandoff: HandoffDocument = {
        frontmatter: {
          handoff_id: '999-test-integration',
          direction: 'incoming',
          from_repo: 'PiOrchestrator',
          to_repo: 'PiDashboard',
          created_at: '2026-01-10T12:00:00Z',
          status: 'new',
          requires: [{ type: 'api', description: 'Test requirement' }],
        },
        content: '# Test',
        filePath: TEST_HANDOFF_PATH,
      };

      const plan = generateConsumptionPlan(mockHandoff);
      const writtenPath = await writeConsumptionPlan(plan, TEST_PLAN_DIR);

      expect(writtenPath).toContain('plan.md');

      // Verify file exists
      const exists = await fs.access(writtenPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Verify content
      const content = await fs.readFile(writtenPath, 'utf-8');
      expect(content).toContain('handoff_id:');
      expect(content).toContain('999-test-integration');
    });
  });

  // =============================================================================
  // Status Transition Tests
  // =============================================================================

  describe('Status Transitions', () => {
    it('should track requirements progress', () => {
      const mockHandoff: HandoffDocument = {
        frontmatter: {
          handoff_id: '999-test-integration',
          direction: 'incoming',
          from_repo: 'PiOrchestrator',
          to_repo: 'PiDashboard',
          created_at: '2026-01-10T12:00:00Z',
          status: 'new',
          requires: [
            { type: 'api', description: 'Req 1' },
            { type: 'api', description: 'Req 2' },
            { type: 'api', description: 'Req 3' },
          ],
        },
        content: '# Test',
        filePath: TEST_HANDOFF_PATH,
      };

      const plan = generateConsumptionPlan(mockHandoff);

      expect(plan.frontmatter.requirements_total).toBeGreaterThanOrEqual(3);
      expect(plan.frontmatter.requirements_done).toBe(0);
      expect(plan.frontmatter.status).toBe('pending');
    });
  });
});
