# API Contracts Reference

**Feature**: 044-evidence-ci-remediation
**Date**: 2026-02-04

## Overview

This feature uses **existing API contracts**. No new endpoints are defined.

## Contract Locations

All contracts are defined in the codebase:

| Domain | Schema File | API Client |
|--------|-------------|------------|
| Evidence | `src/infrastructure/api/diagnostics-schemas.ts` | `src/infrastructure/api/evidence.ts` |
| Sessions | `src/infrastructure/api/diagnostics-schemas.ts` | `src/infrastructure/api/sessions.ts` |
| Containers | `src/infrastructure/api/v1-containers-schemas.ts` | `src/infrastructure/api/v1-containers.ts` |

## Canonical Contract Documentation

The primary API type contract documentation is maintained at:

```
docs/contracts/API-TYPE-CONTRACTS.md
```

This file defines the canonical type mappings between PiOrchestrator Go types and PiDashboard TypeScript types.

## Contract Testing

Contract tests validate that Zod schemas match expected API responses:

```bash
# Run contract tests only
npm test -- tests/integration/contracts
```

Test files:
- `tests/integration/contracts/cameras.contract.test.ts`
- `tests/integration/contracts/camera-diagnostics.contract.test.ts`
- `tests/integration/contracts/containers.contract.test.ts`

## No New Contracts

This feature does not add new API endpoints. It wires existing evidence/session infrastructure to UI components and remediates CI issues.

For new endpoint requirements, see:
- Feature 043: Container Identity Model UI (container management API)
- Feature 034: ESP Camera Integration (camera and evidence API)
