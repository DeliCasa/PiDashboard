# Contract: Session & Evidence Mock Fixtures

**File**: `tests/mocks/diagnostics/session-fixtures.ts`
**Validated by**: `tests/integration/contracts/diagnostics.contract.test.ts`

## Required Exports

### Session Fixtures

```typescript
// Individual session objects (must pass SessionSchema validation)
export const activeSessionRecent: {
  id: string;              // e.g. "sess-recent-001"
  started_at: string;      // ISO 8601
  status: "active";
  capture_count: number;   // >= 1
  last_capture_at: string; // ISO 8601, within last 5 minutes
  delivery_id?: string;
};

export const activeSessionStale: {
  id: string;              // e.g. "sess-stale-001"
  started_at: string;      // ISO 8601
  status: "active";
  capture_count: number;   // >= 1
  last_capture_at: string; // ISO 8601, older than 5 minutes
  delivery_id?: string;
};

export const completedSession: {
  id: string;              // e.g. "sess-completed-001"
  started_at: string;      // ISO 8601
  status: "completed";
  capture_count: number;   // >= 1
  last_capture_at: string; // ISO 8601
  delivery_id?: string;
};
```

### Session API Responses

```typescript
// V1 envelope: { success: true, data: { sessions: Session[] } }
export const sessionListApiResponse: {
  success: true;
  data: { sessions: Session[] };        // 3 items: recent, stale, completed
  correlation_id: string;
  timestamp: string;
};

export const sessionListEmptyApiResponse: {
  success: true;
  data: { sessions: [] };
  correlation_id: string;
  timestamp: string;
};

export const sessionDetailApiResponse: {
  success: true;
  data: Session;                        // activeSessionRecent
  correlation_id: string;
  timestamp: string;
};
```

### Evidence Fixtures

```typescript
// Individual evidence objects (must pass EvidenceCaptureSchema validation)
export const validEvidenceCapture: {
  id: string;              // min length 1
  session_id: string;      // min length 1
  captured_at: string;     // ISO 8601
  camera_id: string;       // pattern: /^espcam-[0-9a-f]{6}$/i
  thumbnail_url: string;   // valid URL
  full_url: string;        // valid URL
  expires_at: string;      // ISO 8601
  size_bytes: number;      // positive integer (optional field, included)
  content_type: string;    // e.g. "image/jpeg" (optional field, included)
};

export const minimalEvidenceCapture: {
  id: string;
  session_id: string;
  captured_at: string;
  camera_id: string;
  thumbnail_url: string;
  full_url: string;
  expires_at: string;
  // size_bytes: omitted
  // content_type: omitted
};
```

### Evidence API Responses

```typescript
export const evidenceListApiResponse: {
  success: true;
  data: { evidence: EvidenceCapture[] }; // 3 items
  correlation_id: string;
  timestamp: string;
};

export const evidenceListEmptyApiResponse: {
  success: true;
  data: { evidence: [] };
  correlation_id: string;
  timestamp: string;
};

export const presignApiResponse: {
  success: true;
  data: { url: string; expires_at: string };
  correlation_id: string;
  timestamp: string;
};
```

## Validation Rules

1. All session fixtures MUST pass `SessionSchema.safeParse()` from `src/infrastructure/api/diagnostics-schemas.ts`
2. All evidence fixtures MUST pass `EvidenceCaptureSchema.safeParse()`
3. All API response fixtures MUST pass their respective response schemas
4. `camera_id` MUST match `/^espcam-[0-9a-f]{6}$/i`
5. `activeSessionRecent.last_capture_at` MUST be within 5 minutes of "now" at test execution time — use relative time construction
6. `activeSessionStale.last_capture_at` MUST be older than 5 minutes from "now"

## Consumer Files

- `tests/mocks/handlers/diagnostics.ts` — MSW request handlers
- `tests/unit/api/sessions.test.ts` — Session API unit tests
- `tests/unit/api/evidence.test.ts` — Evidence API unit tests
- `tests/integration/contracts/diagnostics.contract.test.ts` — Schema contract validation
- `tests/mocks/diagnostics/index.ts` — Re-export barrel
