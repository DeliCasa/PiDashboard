/**
 * Tests for Requirement Extraction & Categorization
 * Feature 033 - US2: Extract Actionable Requirements
 */

import { describe, it, expect } from 'vitest';
import type { HandoffDocument } from '../../../scripts/handoff/types.js';
import {
  parseHandoffToRequirements,
  categorizeRequirement,
  assignPriorities,
  generateRequirementId,
  inferImpactedFiles,
  detectBackwardsCompatMode,
  checkValidationRemovalWarning,
} from '../../../scripts/handoff/extract.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockHandoff(overrides: Partial<HandoffDocument> = {}): HandoffDocument {
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
        'UI displays updated data fields',
      ],
      ...overrides.frontmatter,
    },
    content: overrides.content || `---
handoff_id: 031-test-handoff
---

# Test Handoff

This is test content.
`,
    filePath: overrides.filePath || 'docs/HANDOFF_031_TEST_HANDOFF.md',
  };
}

// =============================================================================
// T016: Requirement Extraction Tests
// =============================================================================

describe('parseHandoffToRequirements', () => {
  it('should extract requirements from frontmatter.requires', () => {
    const handoff = createMockHandoff();

    const result = parseHandoffToRequirements(handoff);

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.some(r => r.description.includes('API endpoint'))).toBe(true);
    expect(result.some(r => r.description.includes('component display'))).toBe(true);
  });

  it('should extract requirements from frontmatter.acceptance', () => {
    const handoff = createMockHandoff();

    const result = parseHandoffToRequirements(handoff);

    expect(result.some(r => r.description.includes('response schema'))).toBe(true);
    expect(result.some(r => r.description.includes('data fields'))).toBe(true);
  });

  it('should assign unique IDs to each requirement', () => {
    const handoff = createMockHandoff();

    const result = parseHandoffToRequirements(handoff);
    const ids = result.map(r => r.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should mark source as frontmatter for requires array', () => {
    const handoff = createMockHandoff();

    const result = parseHandoffToRequirements(handoff);
    const fromRequires = result.filter(r => r.source.field?.startsWith('requires'));

    expect(fromRequires.length).toBeGreaterThan(0);
    expect(fromRequires[0].source.type).toBe('frontmatter');
  });

  it('should sort requirements by priority (lowest first)', () => {
    const handoff = createMockHandoff();

    const result = parseHandoffToRequirements(handoff);

    // Should be sorted by priority
    for (let i = 1; i < result.length; i++) {
      expect(result[i].priority).toBeGreaterThanOrEqual(result[i - 1].priority);
    }
  });

  it('should handle handoff with no requires or acceptance', () => {
    const handoff = createMockHandoff({
      frontmatter: {
        handoff_id: '031-empty',
        direction: 'incoming',
        from_repo: 'PiOrchestrator',
        to_repo: 'PiDashboard',
        created_at: '2026-01-10T12:00:00Z',
        status: 'new',
      },
    });

    const result = parseHandoffToRequirements(handoff);

    // May have content-based requirements, but should not throw
    expect(Array.isArray(result)).toBe(true);
  });

  it('should extract requirements from content checklist items', () => {
    const handoff = createMockHandoff({
      content: `---
handoff_id: 031-content
---

# Changes Required

- [ ] Update the WiFi scan endpoint handler
- [ ] Fix the device provisioning flow
`,
    });

    const result = parseHandoffToRequirements(handoff);

    expect(result.some(r => r.description.includes('WiFi scan'))).toBe(true);
    expect(result.some(r => r.description.includes('device provisioning'))).toBe(true);
  });
});

// =============================================================================
// T017: Categorization Tests
// =============================================================================

describe('categorizeRequirement', () => {
  it('should categorize API-related requirements as api_client', () => {
    expect(categorizeRequirement('Update API endpoint routes')).toBe('api_client');
    expect(categorizeRequirement('Fix fetch request headers')).toBe('api_client');
    expect(categorizeRequirement('Handle HTTP response errors')).toBe('api_client');
  });

  it('should categorize schema-related requirements as schema', () => {
    expect(categorizeRequirement('Update Zod validation schema')).toBe('schema');
    expect(categorizeRequirement('Add new interface fields')).toBe('schema');
    expect(categorizeRequirement('Fix type definition for DTO')).toBe('schema');
  });

  it('should categorize UI-related requirements as ui', () => {
    expect(categorizeRequirement('Update component display logic')).toBe('ui');
    expect(categorizeRequirement('Fix button rendering issue')).toBe('ui');
    expect(categorizeRequirement('Add new form input validation')).toBe('ui');
  });

  it('should categorize logging-related requirements as logging', () => {
    expect(categorizeRequirement('Add telemetry and logging')).toBe('logging');
    expect(categorizeRequirement('Fix debug log output format')).toBe('logging');
    expect(categorizeRequirement('Add metric and trace collection')).toBe('logging');
  });

  it('should categorize testing-related requirements as testing', () => {
    expect(categorizeRequirement('Add unit tests for new feature')).toBe('testing');
    expect(categorizeRequirement('Update integration test mocks')).toBe('testing');
    expect(categorizeRequirement('Fix vitest configuration')).toBe('testing');
  });

  it('should categorize deployment-related requirements as deployment', () => {
    expect(categorizeRequirement('Update Docker build configuration')).toBe('deployment');
    expect(categorizeRequirement('Fix environment variables setup')).toBe('deployment');
    expect(categorizeRequirement('Add CI pipeline step')).toBe('deployment');
  });

  it('should default to api_client for ambiguous requirements', () => {
    expect(categorizeRequirement('Fix the bug')).toBe('api_client');
    expect(categorizeRequirement('Make it work better')).toBe('api_client');
  });
});

describe('assignPriorities', () => {
  it('should assign correct priorities based on category', () => {
    const requirements = [
      { id: 'REQ-001', category: 'ui' as const, description: '', source: { type: 'content' as const }, priority: 0, completed: false, tests: [], files: [] },
      { id: 'REQ-002', category: 'api_client' as const, description: '', source: { type: 'content' as const }, priority: 0, completed: false, tests: [], files: [] },
      { id: 'REQ-003', category: 'schema' as const, description: '', source: { type: 'content' as const }, priority: 0, completed: false, tests: [], files: [] },
    ];

    const result = assignPriorities(requirements);

    expect(result.find(r => r.category === 'api_client')?.priority).toBe(1);
    expect(result.find(r => r.category === 'schema')?.priority).toBe(2);
    expect(result.find(r => r.category === 'ui')?.priority).toBe(3);
  });
});

describe('generateRequirementId', () => {
  it('should generate zero-padded IDs', () => {
    expect(generateRequirementId(1)).toBe('REQ-001');
    expect(generateRequirementId(10)).toBe('REQ-010');
    expect(generateRequirementId(100)).toBe('REQ-100');
  });
});

describe('inferImpactedFiles', () => {
  it('should return API-related paths for api_client category', () => {
    const files = inferImpactedFiles('api_client');

    expect(files.some(f => f.includes('api'))).toBe(true);
  });

  it('should return component paths for ui category', () => {
    const files = inferImpactedFiles('ui');

    expect(files.some(f => f.includes('components'))).toBe(true);
  });

  it('should return test paths for testing category', () => {
    const files = inferImpactedFiles('testing');

    expect(files.some(f => f.includes('tests'))).toBe(true);
  });
});

// =============================================================================
// FR-011: Backwards Compatibility Detection (T033a)
// =============================================================================

describe('detectBackwardsCompatMode', () => {
  it('should return true (compat required) by default', () => {
    const handoff = createMockHandoff();

    expect(detectBackwardsCompatMode(handoff)).toBe(true);
  });

  it('should return false when breaking_change flag is true', () => {
    const handoff = createMockHandoff({
      frontmatter: {
        handoff_id: '031-breaking',
        direction: 'incoming',
        from_repo: 'PiOrchestrator',
        to_repo: 'PiDashboard',
        created_at: '2026-01-10T12:00:00Z',
        status: 'new',
        // @ts-expect-error - Custom field
        breaking_change: true,
      },
    });

    expect(detectBackwardsCompatMode(handoff)).toBe(false);
  });

  it('should detect breaking change authorization in content', () => {
    const handoff = createMockHandoff({
      content: `---
handoff_id: 031-breaking
---

# Breaking Changes

Breaking change authorized for this release.
`,
    });

    expect(detectBackwardsCompatMode(handoff)).toBe(false);
  });
});

// =============================================================================
// FR-012: Validation Guard (T026a)
// =============================================================================

describe('checkValidationRemovalWarning', () => {
  it('should return warning for "remove validation"', () => {
    const result = checkValidationRemovalWarning('Remove validation for WiFi endpoint');

    expect(result).not.toBeNull();
    expect(result).toContain('WARNING');
    expect(result).toContain('FR-012');
  });

  it('should return warning for "skip validation"', () => {
    const result = checkValidationRemovalWarning('Skip validation to fix the bug');

    expect(result).not.toBeNull();
  });

  it('should return null for safe descriptions', () => {
    expect(checkValidationRemovalWarning('Update validation schema')).toBeNull();
    expect(checkValidationRemovalWarning('Add new validation rules')).toBeNull();
    expect(checkValidationRemovalWarning('Fix API endpoint')).toBeNull();
  });
});
