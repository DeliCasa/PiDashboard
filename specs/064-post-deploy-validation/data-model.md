# Data Model: Post-Deploy Validation Suite

**Feature**: 064-post-deploy-validation
**Date**: 2026-03-07

## Overview

This feature adds test infrastructure, not production data models. The entities below describe the test artifact structures.

## E2E Mock Configuration

### RpcMockConfig

Represents a single RPC endpoint mock configuration for Playwright `page.route()`.

| Field | Type | Description |
|-------|------|-------------|
| urlPattern | string | Glob pattern matching the RPC endpoint URL |
| responseFactory | function | Wire testing factory function producing response JSON |
| overrides | object (optional) | Custom overrides to pass to the factory |
| status | number (optional) | HTTP status code (default: 200) |
| errorCode | string (optional) | Connect error code for error scenarios |

### E2E Test Fixture Data

Session, evidence, and camera fixtures are produced by `@delicasa/wire/testing` factories. No custom data models are defined — all test data conforms to the protobuf schema via the factory functions.

## Transport Test Model

### TransportFetchBehavior

The custom fetch wrapper has 4 testable behaviors:

| Behavior | Input | Expected Output |
|----------|-------|-----------------|
| Signal stripping | `init: { signal: AbortSignal, headers: {...} }` | `init` without `signal` key |
| Pass-through | `init: { headers: {...} }` (no signal) | `init` unchanged |
| Late-binding | `globalThis.fetch` patched after import | Uses current `globalThis.fetch` |
| Undefined init | `init: undefined` | Passes `undefined` to fetch |

## No Production Data Model Changes

This feature does not modify any production entities, database schemas, or API contracts. All changes are confined to the test infrastructure layer.
