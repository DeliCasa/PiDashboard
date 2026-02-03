# Research: Test Reliability & Hardening

**Feature**: 040-test-reliability-hardening
**Date**: 2026-02-01
**Status**: Complete

## R1: Root Cause — 12 Failing Test Files

### Decision
The single root cause is a **missing fixture file** `tests/mocks/diagnostics/session-fixtures.ts`. This file is imported by `tests/mocks/handlers/diagnostics.ts` (line 13), which is in turn imported into `tests/integration/mocks/handlers.ts` (line 821), which combines all handlers into `allHandlers`. Since every integration test uses `allHandlers` via the shared MSW server, the missing import cascades to fail all 12 test files.

### Evidence

**Import chain**:
```
tests/integration/mocks/server.ts
  → tests/integration/mocks/handlers.ts (allHandlers)
    → tests/mocks/handlers/diagnostics.ts
      → tests/mocks/diagnostics/session-fixtures.ts  ← MISSING
```

**Error message** (identical across all 12 failures):
```
Error: Failed to resolve import "../diagnostics/session-fixtures"
  from "tests/mocks/handlers/diagnostics.ts". Does the file exist?
```

**Failing files** (all share this single root cause):
1. `tests/integration/contracts/diagnostics.contract.test.ts`
2. `tests/integration/hooks/useConfig.test.tsx`
3. `tests/integration/hooks/useDoor.test.tsx`
4. `tests/integration/hooks/useLogs.test.tsx`
5. `tests/integration/hooks/useSessions.test.tsx`
6. `tests/integration/hooks/useDevices.test.tsx`
7. `tests/integration/hooks/useDiagnostics.test.tsx`
8. `tests/integration/hooks/useEvidence.test.tsx`
9. `tests/integration/hooks/useSystemStatus.test.tsx`
10. `tests/integration/hooks/useWifi.test.tsx`
11. `tests/unit/api/evidence.test.ts`
12. `tests/unit/api/sessions.test.ts`

### Required Exports

The missing file must export **11 named constants** consumed by 4 different files:

| Export | Type | Consumers |
| ------ | ---- | --------- |
| `sessionListApiResponse` | V1 envelope with `data.sessions: Session[]` (3 items) | handlers, unit tests, contract tests |
| `sessionListEmptyApiResponse` | V1 envelope with `data.sessions: []` | handlers, unit tests |
| `sessionDetailApiResponse` | V1 envelope with single `data: Session` | unit tests |
| `activeSessionRecent` | `Session` with `last_capture_at` < 5 min ago | unit tests, contract tests |
| `activeSessionStale` | `Session` with `last_capture_at` > 5 min ago | unit tests, contract tests |
| `completedSession` | `Session` with `status: 'completed'` | contract tests |
| `evidenceListApiResponse` | V1 envelope with `data.evidence: EvidenceCapture[]` (3 items) | handlers, unit tests, contract tests |
| `evidenceListEmptyApiResponse` | V1 envelope with `data.evidence: []` | handlers, unit tests |
| `validEvidenceCapture` | `EvidenceCapture` with all fields | contract tests |
| `minimalEvidenceCapture` | `EvidenceCapture` with required fields only | contract tests |
| `presignApiResponse` | V1 envelope with `data.url` + `data.expires_at` | unit tests |

### Rationale
Creating this single file unblocks all 12 test files. The file was intended to be part of Feature 038 (dev-observability-panels) but was not committed. The `tests/mocks/diagnostics/index.ts` already has a re-export line for it.

### Alternatives Considered
- **Stub the import with empty exports**: Rejected — would fix imports but fail contract validation tests.
- **Remove diagnostics handlers from allHandlers**: Rejected — breaks modularity (FR-009) and requires downstream handler changes.
- **Move diagnostics to optional lazy import**: Over-engineering; the fixture file is the correct fix.

---

## R2: AbortSignal instanceof Error in Vitest + jsdom

### Decision
The existing `IS_TEST_ENV` workaround in `src/infrastructure/api/client.ts` (lines 14-16, 136-138) is the **correct approach**. No changes needed for this feature.

### Root Cause
jsdom polyfills `AbortController`/`AbortSignal` with its own implementation. Node.js 24+'s native `fetch` (undici) performs `instanceof AbortSignal` checks against the Node-native class, not jsdom's polyfill. The classes share the same API but fail `instanceof` because they come from different prototype chains (different "realms").

### Current Workaround (already implemented)
```typescript
// src/infrastructure/api/client.ts:14-16
const IS_TEST_ENV = typeof process !== 'undefined' &&
  (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true');

// Line 136-138: conditionally skip signal in test env
...(IS_TEST_ENV ? {} : { signal: controller.signal }),
```

### Upstream Tracking
- [vitest-dev/vitest#8374](https://github.com/vitest-dev/vitest/issues/8374) — Vitest tracking issue
- [jsdom/jsdom#3682](https://github.com/jsdom/jsdom/issues/3682) — jsdom proposal to stop polyfilling existing globals
- [reduxjs/redux-toolkit#4966](https://github.com/reduxjs/redux-toolkit/issues/4966) — Same issue in RTK Query

### Alternative Workarounds (for reference)

| Workaround | Effort | Trade-offs |
| ---------- | ------ | ---------- |
| Switch to `happy-dom` | Medium | Different DOM fidelity, may break other tests |
| Switch to `environment: 'node'` | Medium | No DOM APIs, breaks component tests |
| `customExportConditions: ['']` | Low | May affect other package resolutions |
| Pin Node.js < 24 | Low | Temporary, blocks security updates |
| `IS_TEST_ENV` flag (current) | Low | Production code aware of tests |

### Rationale
The `IS_TEST_ENV` flag is the lowest-risk workaround. It doesn't change test fidelity (MSW still intercepts requests), doesn't require environment switches, and can be removed when Vitest v4 ships the upstream fix.

---

## R3: Handoff Sentinel Failures (8 Errors)

### Decision
Add YAML frontmatter to all 7 handoff files and exclude the template file from validation.

### Files Requiring Frontmatter

| File | handoff_id | Direction | Status |
| ---- | ---------- | --------- | ------ |
| `docs/HANDOFF_028_API_COMPAT_COMPLETE.md` | `028-api-compat-complete` | incoming | done |
| `docs/HANDOFF_029_ROUTE_NORMALIZATION.md` | `029-route-normalization` | outgoing | new |
| `docs/HANDOFF_030_DASHBOARD_RECOVERY.md` | `030-dashboard-recovery` | outgoing | done |
| `docs/HANDOFF_030_RECOVERY_COMPLETE.md` | `030-recovery-complete` | outgoing | done |
| `docs/HANDOFF_PIORCH_DASHBOARD_INTEGRATION.md` | `027-piorchestrator-integration` | incoming | acknowledged |
| `docs/handoffs/incoming/HANDOFF-PIO-PID-20260113-001.md` | `031-logs-v1-sse` | incoming | new |
| `docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md` | `035-auto-onboard-api` | incoming | new |

### Template File Fix
`specs/032-handoff-sentinel/contracts/handoff-template.md` has `handoff_id: "NNN-slug"` which fails the `^\d{3}-[a-z][a-z0-9-]*$` pattern. Options:
1. Exclude templates from scanning (modify detect script glob)
2. Use a valid placeholder like `000-template-example`

**Decision**: Use `000-template-example` as the handoff_id — simpler than modifying scanning logic.

### Required Frontmatter Schema
Per `specs/032-handoff-sentinel/contracts/handoff-schema.yaml`:
```yaml
handoff_id:      "NNN-slug"          # pattern: ^\d{3}-[a-z][a-z0-9-]*$
direction:       "incoming|outgoing"
from_repo:       string
to_repo:         string
created_at:      ISO 8601 datetime
status:          "new|acknowledged|in_progress|done|blocked"
related_prs:     []
related_commits: []
requires:        []
acceptance:      []
verification:    []
risks:           []
notes:           ""
```

---

## R4: Lint Errors (16 Errors)

### Decision
Fix all 10 in-scope errors (handoff scripts + diagnostics). Exclude 6 out-of-scope errors (shadcn/ui primitives + allowlist).

### In-Scope Fixes

| File | Line | Issue | Fix |
| ---- | ---- | ----- | --- |
| `.claude/scripts/handoff/state.ts` | 36 | `err` unused in catch | `_err` |
| `.claude/scripts/handoff/state.ts` | 54 | `err` unused in catch | `_err` |
| `.claude/scripts/handoff/utils.ts` | 19 | `DetectionSummary` unused import | Remove |
| `.claude/scripts/handoff/utils.ts` | 181 | `summary` unused destructure | Remove |
| `.claude/scripts/handoff/validate.ts` | 13 | `VALID_REPOS` unused import | Remove |
| `.claude/scripts/handoff/consume.ts` | 234 | `options` unused param | `_options` |
| `.claude/scripts/handoff/consume.ts` | 360 | `options` unused param | `_options` |
| `.claude/scripts/handoff/consume.ts` | 422 | `stdout` unused destructure | `_stdout` |
| `.claude/scripts/handoff/extract.ts` | 6 | `Requirement` unused import | Remove |
| `.claude/scripts/handoff/extract.ts` | 10 | `RequirementSource` unused import | Remove |

### Out-of-Scope (not fixed in this feature)

| File | Error | Reason |
| ---- | ----- | ------ |
| `src/components/ui/badge.tsx:46` | react-refresh/only-export-components | shadcn/ui generated — `badgeVariants` CVA export |
| `src/components/ui/button.tsx:62` | react-refresh/only-export-components | shadcn/ui generated — `buttonVariants` CVA export |
| `src/presentation/components/allowlist/AllowlistEntryForm.tsx:231` | react-refresh (x2) | Utility exports `isValidMac`/`normalizeMac` — separate feature scope |

---

## R5: Dashboard State Machine Audit

### Decision
All 5 major dashboard sections already implement correct state handling. The loading-vs-empty distinction is correct across all sections. Document the existing behavior in `docs/dashboard_states.md`.

### Audit Results

| Section | Loading | Success | Empty | Error | Unavailable | testids |
| ------- | ------- | ------- | ----- | ----- | ----------- | ------- |
| Camera | Spinner | Grid | "No cameras" | Alert + Retry | N/A (core) | Good |
| WiFi | "Loading status..." | Network list | "No networks" | Silent 404/503 | `isFeatureUnavailable()` | Limited |
| Door | Spinner | Controls | N/A | "Unavailable" msg | Via error prop | Good |
| System | Skeleton | Metric cards | N/A | Alert + Retry | N/A (core) | Good |
| Logs | Connection indicator | Log stream | "No logs yet" | Reconnect status | N/A (core) | Limited |

### Key Findings
1. **Camera section**: Correctly shows spinner during loading, not "No cameras". Verified in `CameraSection.tsx`.
2. **WiFi section**: Only section using `isFeatureUnavailable()` explicitly (Feature 037). Silently degrades on 404/503.
3. **Door section**: Handles unavailability through the error prop in `DoorControls.tsx`, showing "Door Control Unavailable".
4. **System section**: Uses skeleton loading pattern. Has WebSocket → polling fallback chain.
5. **Logs section**: SSE-based with exponential backoff reconnection. Shows connection status during loading.

### Documentation Needed
Create `docs/dashboard_states.md` documenting each section's state machine as a reference for contributors and as a test verification checklist.

---

## R6: MSW Handler Architecture

### Decision
Maintain the current modular handler architecture. No structural changes needed.

### Current Architecture
```
allHandlers = [...handlers, ...v1Handlers, ...diagnosticsHandlers]
```

- `handlers` — Legacy `/api/*` endpoints (WiFi, system, config, door, logs, devices)
- `v1Handlers` — V1 `/api/v1/*` endpoints (provisioning, allowlist, sessions)
- `diagnosticsHandlers` — Diagnostics `/api/v1/diagnostics/*` + evidence + sessions

### Rationale
This modular structure allows:
- Testing individual handler sets in isolation
- Adding new handler modules without touching existing ones
- Overriding specific handlers in tests via `server.use()`

---

## References

- [vitest-dev/vitest#8374](https://github.com/vitest-dev/vitest/issues/8374) — AbortSignal + jsdom realm mismatch
- [jsdom/jsdom#3682](https://github.com/jsdom/jsdom/issues/3682) — jsdom polyfill proposal
- [MSW FAQ: Request handler not intercepting requests](https://mswjs.io/docs/faq/) — MSW debugging guide
- [MSW 1.x to 2.x migration](https://mswjs.io/docs/migrations/1.x-to-2.x/) — Breaking changes reference
