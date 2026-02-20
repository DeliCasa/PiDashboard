# Implementation Plan: Real Ops Drilldown

**Branch**: `059-real-ops-drilldown` | **Date**: 2026-02-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/059-real-ops-drilldown/spec.md`

## Summary

Wire PiDashboard's existing operations UI (features 055-058) to real PiOrchestrator endpoints. The primary work is **schema reconciliation** — updating Zod schemas, API client URLs, and field references to match PiOrchestrator's actual V1 response shapes. Secondary work includes adapting the evidence image rendering from presigned-URL-based to base64-inline/proxy-based, and creating a DEV validation workflow.

No new UI components are needed. Existing components require field name and enum value updates.

## Technical Context

**Language/Version**: TypeScript ~5.9.3
**Primary Dependencies**: React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4
**Storage**: N/A (API-driven; PiOrchestrator + MinIO handle persistence)
**Testing**: Vitest 3.2.4, MSW 2.x, Playwright 1.57.0
**Target Platform**: Chromium-based browsers on local network or Tailscale
**Project Type**: Web SPA (embedded in PiOrchestrator Go binary)
**Performance Goals**: Session list loads <3s on LAN, images render <5s
**Constraints**: Test parallelism ≤50% CPU cores; images must never load directly from MinIO LAN
**Scale/Scope**: ~15 files modified, 0 new components, 3 Zod schemas updated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | All changes follow existing layer boundaries. Schema changes in infrastructure/, hook changes in application/, component changes in presentation/. No cross-layer violations. |
| II. Contract-First API | PASS | Updating Zod schemas to match real PiOrchestrator responses (Go is source of truth per II.A). Contract tests will be updated per III.A. |
| II.A Zod Schema Conventions | PASS | New schemas follow snake_case field naming matching Go JSON tags, z.string() for timestamps. |
| II.B Enum Synchronization | PASS | Session status enum updated from PiOrchestrator's actual values. PiOrchestrator-first rule maintained. |
| II.C API Integration Workflow | PASS | Following checklist: update schemas → update API clients → update contract tests → update MSW handlers → update hooks. |
| III. Test Discipline | PASS | Contract tests updated, MSW handlers aligned, component tests updated. Resource constraints respected. |
| IV. Simplicity & YAGNI | PASS | No new abstractions. Updating existing code to match real data. Base64 rendering is simpler than presigned URL refresh chain. |

### Post-Design Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | Evidence image source abstraction (base64 vs proxy) lives in infrastructure/ API client, not leaked into presentation/. |
| II. Contract-First API | PASS | All three response shapes (sessions, evidence, evidence-pair) have Zod schemas validated against PiOrchestrator Go structs. |
| III. Test Discipline | PASS | Contract tests validate new schemas. Mock data uses PiOrchestrator-format responses. |
| IV. Simplicity & YAGNI | PASS | Removed presigned URL refresh complexity (not needed with base64 inline). No speculative proxy abstractions — will be added when PiOrchestrator ships the endpoint. |

## Project Structure

### Documentation (this feature)

```text
specs/059-real-ops-drilldown/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Schema gap analysis
├── data-model.md        # Phase 1: Entity definitions
├── quickstart.md        # Phase 1: DEV validation guide
├── contracts/           # Phase 1: API contracts
│   ├── sessions-api.md
│   └── evidence-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/types/
│   └── diagnostics.ts                          # Update TypeScript interfaces
├── infrastructure/api/
│   ├── diagnostics-schemas.ts                  # UPDATE: Zod schemas for sessions + evidence
│   ├── sessions.ts                             # UPDATE: API URLs + field mapping
│   └── evidence.ts                             # UPDATE: API URLs + base64/proxy image logic
├── application/hooks/
│   ├── useSessions.ts                          # UPDATE: Stale detection from elapsed_seconds
│   └── useEvidence.ts                          # UPDATE: Remove presigned URL refresh, add base64
├── presentation/components/
│   ├── operations/
│   │   ├── SessionListView.tsx                 # UPDATE: Status tabs + field names
│   │   ├── SessionDetailView.tsx               # UPDATE: Metadata fields + error display
│   │   ├── CameraHealthDashboard.tsx           # VERIFY: Works with V1 camera diagnostics
│   │   └── CameraHealthCard.tsx                # VERIFY: Field compatibility
│   └── diagnostics/
│       ├── EvidencePanel.tsx                    # UPDATE: Handle base64 images
│       ├── EvidenceThumbnail.tsx                # UPDATE: base64 src + fallback logic
│       └── EvidencePreviewModal.tsx             # UPDATE: base64 full-size display
tests/
├── integration/
│   ├── contracts/
│   │   └── diagnostics.contract.test.ts        # UPDATE: New schema contract tests
│   └── mocks/
│       └── diagnostics-mocks.ts                # UPDATE: PiOrchestrator-format mock data
├── component/
│   ├── operations/
│   │   └── SessionListView.test.tsx            # UPDATE: New field names in assertions
│   └── diagnostics/
│       └── EvidencePanel.test.tsx               # UPDATE: base64 image assertions
└── e2e/
    └── operations.spec.ts                      # UPDATE: New data-testid + field values
```

**Structure Decision**: No structural changes. All modifications are to existing files following the established hexagonal architecture. The feature is a reconciliation/alignment effort, not a new feature build.

## Implementation Phases

### Phase 1: Schema Reconciliation (Blocking — all other phases depend on this)

Update Zod schemas to match PiOrchestrator's actual response shapes. This is the foundation that everything else builds on.

**Files**:
- `src/infrastructure/api/diagnostics-schemas.ts` — Rewrite session and evidence schemas
- `src/domain/types/diagnostics.ts` — Update TypeScript interfaces to match

**Key changes**:
1. Session: `id` → `session_id`, `delivery_id` → `container_id`, status enum update, add new fields
2. Evidence: Replace presigned-URL-centric model with base64/object-key model
3. Add new schemas: `LastErrorSchema`, `CaptureTagSchema`, `CaptureStatusSchema`, `EvidencePairSchema`
4. Add `SessionEvidenceResponseSchema` for the evidence list endpoint (includes `captures` array + `summary`)

### Phase 2: API Client Updates (Depends on Phase 1)

Update API clients to call correct V1 endpoints and parse new response shapes.

**Files**:
- `src/infrastructure/api/sessions.ts` — Update URL from `/dashboard/diagnostics/sessions` to `/v1/diagnostics/sessions`, update response parsing
- `src/infrastructure/api/evidence.ts` — Update URL to `/v1/sessions/{id}/evidence`, replace presigned URL logic with base64/object-key logic, add evidence pair endpoint support

**Key changes**:
1. Sessions client: New URL, parse `data.sessions` array, derive `is_stale` from `elapsed_seconds > 300`
2. Evidence client: New URL, parse `data.captures` array, remove `refreshPresignedUrl()`, add `getImageSrc()` helper for base64/proxy resolution
3. Add evidence pair client: `GET /v1/sessions/{id}/evidence/pair` for structured before/after

### Phase 3: Hook Updates (Depends on Phase 2)

Update React Query hooks to work with new API shapes.

**Files**:
- `src/application/hooks/useSessions.ts` — Update type references, stale detection
- `src/application/hooks/useEvidence.ts` — Remove presigned URL refresh hooks, simplify to base64/proxy

**Key changes**:
1. `useSessions`: Works with `SessionWithStale` derived from `elapsed_seconds` instead of `last_capture_at`
2. `useSessionEvidence`: Returns new `CaptureEntry[]` shape instead of `EvidenceCapture[]`
3. Remove `useRefreshPresignedUrl` — no longer needed with base64 inline images
4. Add `useEvidencePair(sessionId)` — fetches structured before/after pair

### Phase 4: Component Updates (Depends on Phase 3)

Update UI components for new field names and image rendering.

**Files**:
- `SessionListView.tsx` — Status tabs: add "Partial" tab, rename "Failed" to map to `failed` status
- `SessionDetailView.tsx` — Display `container_id` (was `delivery_id`), show `last_error` block, display capture summary
- `EvidencePanel.tsx` — Render from `CaptureEntry[]`, show capture tags (BEFORE_OPEN/AFTER_CLOSE)
- `EvidenceThumbnail.tsx` — Use `data:image/jpeg;base64,...` src when `image_data` present, fallback to "Stored in S3" placeholder
- `EvidencePreviewModal.tsx` — Support base64 full-size images

**Key changes**:
1. Session list: Four tabs (All/Active/Complete/Partial/Failed) instead of three
2. Session detail: Show `last_error.failure_reason` and `last_error.correlation_id` with copy button
3. Evidence: Render base64 inline images instead of presigned URL images
4. Capture tags displayed as badges: "Before Open", "After Close", etc.

### Phase 5: Test Updates (Depends on Phases 1-4)

Update all tests to use new schemas and mock data.

**Files**:
- `tests/integration/contracts/diagnostics.contract.test.ts` — New schema contract tests
- `tests/integration/mocks/diagnostics-mocks.ts` — PiOrchestrator-format mock data
- Component test files — Update field references in assertions
- `tests/e2e/operations.spec.ts` — Update assertions for new field values

**Key changes**:
1. Contract tests validate all three Zod schemas against realistic PiOrchestrator responses
2. MSW handlers return V1-format responses
3. Component tests check base64 image rendering instead of presigned URLs
4. Mock data includes all status variants (active, complete, partial, failed)

### Phase 6: DEV Validation & Documentation (Depends on Phase 5)

Create reproducible validation procedure against real PiOrchestrator.

**Deliverables**:
- Validation script or documented procedure in `quickstart.md`
- Screenshots or Playwright recording demonstrating real session + evidence rendering
- Handoff document for PiOrchestrator (image proxy endpoint)

---

## Handoff Requirements

The following PiOrchestrator changes are needed for full feature completion. Generate a handoff document via `/handoff-generate`:

1. **Session/evidence endpoints on port 8082**: Expose `/api/v1/diagnostics/sessions` and `/api/v1/sessions/{id}/evidence` on the config UI server (port 8082) without API key authentication.
2. **Image proxy endpoint** (new): `GET /api/v1/evidence/image?key={object_key}` — proxies image bytes from MinIO so the browser never makes direct MinIO LAN requests.
3. **Optional: Session detail endpoint**: `GET /api/v1/diagnostics/sessions/{id}` for single-session fetch.

**Without handoff item 1**, the dashboard cannot reach session/evidence data from port 8082.
**Without handoff item 2**, evidence images that have been cleared from memory (>24h) will show "Stored in S3" placeholders instead of actual images.

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| PiOrchestrator doesn't expose V1 routes on port 8082 | Dashboard can't fetch sessions/evidence | Handoff item 1; fallback: add proxy routes in PiOrchestrator |
| Schema drift after initial alignment | Zod validation warnings, broken UI | Contract tests catch drift early; `safeParseWithErrors` logs warnings without crashing |
| Base64 images too large for rendering | Slow page load, memory pressure | PiOrchestrator stores images in S3; base64 only present for recent (<24h) captures |
| Image proxy endpoint not available | Old images show placeholder | Graceful degradation: "Stored in S3" placeholder with object key visible for manual retrieval |
| In-memory session store (24h TTL) loses old sessions | Operator can't see historical sessions | Documented limitation; sessions >24h old are not available without persistent storage |

## Complexity Tracking

No complexity violations. All changes update existing code to match real data shapes. No new abstractions, patterns, or layers introduced.
