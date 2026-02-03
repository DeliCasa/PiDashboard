# Data Model: Test Fixtures

**Feature**: 039-msw-hook-tests | **Date**: 2026-02-01

This document defines the data models for test fixtures used across MSW handlers and test files.

## Session Fixtures

### Session Entity

Matches `SessionSchema` in `src/infrastructure/api/diagnostics-schemas.ts`.

```typescript
interface Session {
  id: string;              // Unique session identifier, e.g., "session-001"
  delivery_id?: string;    // Optional delivery reference, e.g., "delivery-abc-123"
  started_at: string;      // ISO 8601 timestamp
  status: 'active' | 'completed' | 'cancelled';
  capture_count: number;   // Integer >= 0
  last_capture_at?: string; // ISO 8601 timestamp, optional
}
```

### Session Variants

| Fixture Name | Status | Capture Count | Stale? | Purpose |
|-------------|--------|--------------|--------|---------|
| `activeSessionRecent` | active | 5 | No | Active session with recent captures |
| `activeSessionStale` | active | 3 | Yes | Active session, no captures in >5 min |
| `completedSession` | completed | 12 | N/A | Completed delivery session |
| `cancelledSession` | cancelled | 0 | N/A | Session cancelled before captures |

### SessionWithStale Extension

```typescript
interface SessionWithStale extends Session {
  is_stale?: boolean;  // Derived field for UI display
}
```

## Evidence Fixtures

### Evidence Capture Entity

Matches `EvidenceCaptureSchema` in `src/infrastructure/api/diagnostics-schemas.ts`.

```typescript
interface EvidenceCapture {
  id: string;              // e.g., "evidence-001"
  session_id: string;      // References Session.id
  captured_at: string;     // ISO 8601 timestamp
  camera_id: string;       // Pattern: /^espcam-[0-9a-f]{6}$/i
  thumbnail_url: string;   // Valid URL
  full_url: string;        // Valid URL
  expires_at: string;      // ISO 8601 timestamp (presigned URL expiry)
  size_bytes?: number;     // Positive integer, optional
  content_type?: string;   // MIME type, optional
}
```

### Evidence Variants

| Fixture Name | Camera | Has Size | Purpose |
|-------------|--------|----------|---------|
| `evidenceCapture1` | espcam-aabbcc | Yes | Standard capture with metadata |
| `evidenceCapture2` | espcam-ddeeff | No | Minimal capture without optional fields |

## API Response Wrappers

### SessionListResponse

```typescript
interface SessionListResponse {
  success: boolean;
  data: {
    sessions: Session[];
  };
}
```

| Fixture | Sessions | Purpose |
|---------|----------|---------|
| `sessionListApiResponse` | 3 sessions (active, completed, cancelled) | Normal response |
| `sessionListEmptyApiResponse` | Empty array | No sessions available |

### SessionDetailResponse

```typescript
interface SessionDetailResponse {
  success: boolean;
  data: Session;
}
```

| Fixture | Session | Purpose |
|---------|---------|---------|
| `sessionDetailApiResponse` | Active session with captures | Detail view |

### EvidenceListResponse

```typescript
interface EvidenceListResponse {
  success: boolean;
  data: {
    evidence: EvidenceCapture[];
  };
}
```

| Fixture | Evidence Count | Purpose |
|---------|---------------|---------|
| `evidenceListApiResponse` | 2 captures | Normal evidence list |
| `evidenceListEmptyApiResponse` | 0 captures | Empty evidence state |

## Door Status Fixtures (Updated)

### DoorStatus Entity

Matches `DoorStatusSchema` in `src/infrastructure/api/schemas.ts` (transformed/camelCase format).

```typescript
interface DoorStatus {
  id: string;
  state: 'open' | 'closed' | 'unknown' | 'error';
  lockState: 'locked' | 'unlocked' | 'unknown' | 'error';
  lastCommand?: string;
  relayPin: number;
}
```

### Door Variants (for contract tests)

| Fixture | State | Lock State | Purpose |
|---------|-------|-----------|---------|
| `validDoorStatus` | closed | locked | Complete valid status |
| `closedLocked` | closed | locked | Standard closed state |
| `openUnlocked` | open | unlocked | Standard open state |
| `errorState` | error | unknown | Error condition |
| `minimalStatus` | closed | locked | Required fields only |
