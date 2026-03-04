# Implementation Plan: PiOrchestrator Connect RPC Client Migration

**Branch**: `062-piorch-grpc-client` | **Date**: 2026-03-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/062-piorch-grpc-client/spec.md`

## Summary

Replace 9 REST API calls (cameras, sessions, evidence, capture) with Connect RPC calls via `@delicasa/wire` service descriptors and `@connectrpc/connect-web`. This eliminates REST response-shape drift for the core operational endpoints while keeping all other REST endpoints (WiFi, door, config, containers, inventory, onboarding) unchanged.

**Approach**: Add device service protos to `@delicasa/wire`, generate Connect service descriptors, create a centralized RPC client module in PiDashboard's infrastructure layer, and migrate hooks from REST `queryFn` to RPC calls while keeping hook signatures stable.

## Technical Context

**Language/Version**: TypeScript ~5.9.3
**Primary Dependencies**: React 19.2.0, @connectrpc/connect-web ^2.1.x, @delicasa/wire v0.2.x (local), @bufbuild/protobuf ^2.2.x, TanStack React Query 5.x
**Storage**: N/A (API-driven)
**Testing**: Vitest 3.2.4, MSW 2.x, Playwright 1.57.0
**Target Platform**: Browser (Chrome, Firefox — Raspberry Pi Chromium kiosk + desktop)
**Project Type**: Web (frontend SPA)
**Performance Goals**: RPC calls complete within existing REST latency thresholds (~200ms p95 for list, ~500ms for capture)
**Constraints**: Connect JSON over HTTP/1.1 (no HTTP/2 — Cloudflare Tunnel limitation), browser CORS
**Scale/Scope**: 9 REST→RPC migrations, 4 service clients, ~7 hooks modified, 3 infrastructure files created

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Hexagonal Architecture — PASS

| Rule | Status | Detail |
|------|--------|--------|
| Domain types NO external deps | PASS | Proto-generated types stay in infrastructure; domain types unchanged |
| Application hooks no direct fetch | PASS | Hooks call RPC adapter functions, not `createClient` directly |
| Infrastructure implements domain contracts | PASS | New `src/infrastructure/rpc/` module is an infrastructure adapter |
| Presentation via hooks only | PASS | Components unchanged — hooks keep same signatures |

**Design**: RPC client lives in `src/infrastructure/rpc/` (infrastructure layer). Hooks in `src/application/hooks/` call adapter functions that wrap RPC calls. Presentation layer untouched.

### II. Contract-First API — PASS

| Rule | Status | Detail |
|------|--------|--------|
| Zod schema for every endpoint | PASS | Proto-generated types are the contract; wire Zod schemas validate at presentation boundary |
| No raw JSON in components | PASS | RPC responses are typed proto objects; adapter converts to domain types |
| Schema changes require test updates | PASS | Proto changes regenerate types — compile errors catch drift |
| MSW handlers match contracts | PASS | Tests mock at RPC transport level or hook level |

**Design**: Two-layer validation:
1. Proto-generated types guarantee RPC response shape (compile-time)
2. Wire Zod schemas validate at presentation boundary (runtime, for domain type conversion)

### III. Test Discipline — PASS

| Rule | Status | Detail |
|------|--------|--------|
| Contract tests for schemas | PASS | Proto types have compile-time guarantees; Zod boundary tests remain |
| Component tests with data-testid | PASS | No component changes — existing tests unaffected |
| MSW-backed hook tests | PASS | Updated to mock RPC transport instead of REST endpoints |
| Resource constraints | PASS | VITEST_MAX_WORKERS=1 for CI, 50% cap for local |

### IV. Simplicity & YAGNI — PASS

| Rule | Status | Detail |
|------|--------|--------|
| No features beyond requested | PASS | Only migrating endpoints with RPC equivalents |
| No future-proofing abstractions | PASS | Thin adapter — no repository pattern, no service factory |
| Minimal code | PASS | ~3 new files, ~7 hook modifications |

### Post-Design Re-Check — PASS

No violations identified. The design adds `src/infrastructure/rpc/` as a new infrastructure adapter, following the established hexagonal pattern exactly.

## Project Structure

### Documentation (this feature)

```text
specs/062-piorch-grpc-client/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: entity/type documentation
├── quickstart.md        # Phase 1: developer quickstart
├── contracts/
│   └── rpc-surface.md   # Phase 1: RPC contract reference
└── tasks.md             # Phase 2: implementation tasks (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── infrastructure/
│   ├── rpc/                          # NEW — Connect RPC adapters
│   │   ├── transport.ts              # Connect transport + interceptors
│   │   ├── clients.ts                # Service client instances (4 clients)
│   │   ├── adapters/                 # Proto → domain type converters
│   │   │   ├── camera-adapter.ts     # Camera proto → domain Camera
│   │   │   ├── session-adapter.ts    # OperationSession proto → domain Session
│   │   │   └── evidence-adapter.ts   # EvidencePair/Capture proto → domain Evidence
│   │   └── error-mapper.ts           # ConnectError → PiDashboard error types
│   └── api/                          # EXISTING — REST clients (unchanged for non-RPC endpoints)
│       ├── client.ts                 # Base HTTP client (unchanged)
│       ├── v1-client.ts              # V1 envelope wrapper (unchanged)
│       ├── sessions.ts               # MODIFIED — swap REST for RPC
│       ├── evidence.ts               # MODIFIED — swap REST for RPC
│       ├── v1-cameras.ts             # MODIFIED — swap REST for RPC
│       └── ...                       # All other API files unchanged
├── application/
│   └── hooks/                        # EXISTING — hook signatures unchanged
│       ├── useSessions.ts            # MODIFIED queryFn
│       ├── useEvidence.ts            # MODIFIED queryFn
│       ├── useCameras.ts             # MODIFIED queryFn
│       └── ...                       # All other hooks unchanged
└── domain/
    └── types/                        # EXISTING — unchanged
```

```text
tests/
├── integration/
│   ├── hooks/                        # MODIFIED — mock RPC instead of REST
│   └── contracts/                    # Proto contract validation tests
└── unit/
    └── rpc/                          # NEW — RPC adapter unit tests
        ├── camera-adapter.test.ts
        ├── session-adapter.test.ts
        ├── evidence-adapter.test.ts
        └── error-mapper.test.ts
```

**Structure Decision**: Extends existing hexagonal architecture. New `src/infrastructure/rpc/` directory is an infrastructure adapter (same layer as `src/infrastructure/api/`). No new layers or patterns introduced.

## Complexity Tracking

No constitution violations — this section is empty.
