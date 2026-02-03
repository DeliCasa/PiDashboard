---
handoff_id: "031-logs-v1-sse"
direction: "incoming"
from_repo: "PiOrchestrator"
to_repo: "PiDashboard"
created_at: "2026-01-13T00:00:00Z"
status: "done"
related_prs: []
related_commits: []
requires: []
acceptance: []
verification: []
risks: []
notes: ""
---

# Handoff: Fix Dashboard Logs to Use V1 SSE Endpoint

**ID**: HANDOFF-PIO-PID-20260113-001
**Date**: 2026-01-13
**From**: PiOrchestrator
**To**: PiDashboard
**Priority**: P1
**Status**: NEW

## Summary

The dashboard logs page shows "Waiting for logs..." because it's calling a deprecated endpoint. Need to switch from `/api/dashboard/logs` to the V1 SSE stream at `/api/v1/dashboard/logs`.

## Context

During investigation of Feature 030 (Dashboard Recovery), we found that the logs endpoint being called is deprecated. The PiOrchestrator backend logs show:

```json
{"event":"deprecated_endpoint","path":"/api/dashboard/logs","successor":"/api/v1/dashboard"}
```

The V1 endpoint uses Server-Sent Events (SSE) for real-time log streaming and is fully functional.

## Requirements

### Must Have
- [ ] Update logs API client to use SSE instead of REST polling
- [ ] Connect to `/api/v1/dashboard/logs` endpoint
- [ ] Parse SSE event stream for log entries
- [ ] Display logs in real-time as they arrive

### Nice to Have
- [ ] Add reconnection logic if SSE connection drops
- [ ] Show connection status indicator
- [ ] Allow filtering logs by level

## Technical Details

### Affected Files/Components
| File | Change Required |
|------|-----------------|
| `src/infrastructure/api/logs.ts` | Switch from REST to SSE |
| `src/application/hooks/useLogs.ts` | Handle SSE stream |
| `src/presentation/pages/LogsPage.tsx` | Update to use streaming hook |

### Current Implementation (broken)
```typescript
// src/infrastructure/api/logs.ts
getRecent: async (params?: LogsParams): Promise<LogEntry[]> => {
    const response = await apiClient.get<LogsApiResponse>(buildUrl('/dashboard/logs', params));
    return response.data.entries;
}
```

### Required Implementation
```typescript
// src/infrastructure/api/logs.ts
streamLogs: (onLog: (entry: LogEntry) => void, onError?: (error: Error) => void): () => void => {
    const eventSource = new EventSource('/api/v1/dashboard/logs');

    eventSource.onmessage = (event) => {
        try {
            const entry = JSON.parse(event.data) as LogEntry;
            onLog(entry);
        } catch (e) {
            console.error('Failed to parse log entry:', e);
        }
    };

    eventSource.onerror = (error) => {
        if (onError) onError(new Error('SSE connection failed'));
    };

    // Return cleanup function
    return () => eventSource.close();
}
```

### SSE Event Format
```
event: log
data: {"timestamp":"2026-01-13T01:00:00Z","level":"info","message":"Request received","fields":{"path":"/api/v1/cameras"}}

event: log
data: {"timestamp":"2026-01-13T01:00:01Z","level":"error","message":"Connection failed","fields":{"error":"timeout"}}
```

## Testing Checklist

- [ ] Logs page shows real-time entries
- [ ] SSE connection stays open
- [ ] Page loads without errors
- [ ] Logs display timestamp, level, and message
- [ ] Connection recovers after network interruption

## Dependencies

- Depends on: PiOrchestrator V1 SSE endpoint (already working)
- Blocks: Dashboard logs functionality

## Notes

- The old `/api/dashboard/logs` endpoint returns empty data
- V1 endpoint is available on both port 8081 and 8082
- SSE requires `Accept: text/event-stream` header (browser handles this automatically with EventSource)
