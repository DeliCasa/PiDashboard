# Quickstart: 059 Real Ops Drilldown

**Branch**: `059-real-ops-drilldown`
**Date**: 2026-02-20

## Prerequisites

1. PiOrchestrator running on the Pi (port 8082)
2. SSH tunnel to Pi: `ssh -L 8082:localhost:8082 pi`
3. MinIO running on the Pi with evidence bucket
4. At least one session created (via PiOrchestrator smoke run or manual trigger)

## Dev Setup

```bash
# Switch to feature branch
git checkout 059-real-ops-drilldown

# Install dependencies
npm install

# Start dev server (proxies /api to Pi:8082)
ssh -L 8082:localhost:8082 pi &
npm run dev
```

Open http://localhost:5173 → navigate to Operations tab.

## Validation Checklist

### Step 1: Verify PiOrchestrator Endpoints

```bash
# Check sessions endpoint
curl -s http://localhost:8082/api/v1/diagnostics/sessions | jq '.data.sessions | length'

# Check evidence for a session (replace SESSION_ID)
curl -s http://localhost:8082/api/v1/sessions/SESSION_ID/evidence | jq '.data.captures | length'

# Check evidence pair
curl -s http://localhost:8082/api/v1/sessions/SESSION_ID/evidence/pair | jq '.data.pair_status'

# Check camera diagnostics
curl -s http://localhost:8082/api/v1/dashboard/diagnostics/cameras | jq '.data | length'
```

### Step 2: Verify Dashboard Rendering

1. Open Operations tab → sessions list should show real sessions
2. Click a session → detail view with evidence images
3. Check browser DevTools Network tab:
   - No requests to `192.168.x.x` (direct MinIO)
   - All `/api/` requests return JSON (not HTML)
4. Check browser Console:
   - No uncaught errors
   - Zod validation warnings are acceptable (log only, no crash)

### Step 3: Test Edge Cases

1. Stop PiOrchestrator → dashboard shows "Service unavailable" with Retry
2. Restart PiOrchestrator → Retry button recovers
3. Failed session → shows failure reason and correlation ID
4. Copy session ID → toast confirms clipboard copy

## Key Files to Modify

| Layer | File | Change |
|-------|------|--------|
| Schema | `src/infrastructure/api/diagnostics-schemas.ts` | Update Zod schemas to match PiOrchestrator |
| API | `src/infrastructure/api/sessions.ts` | Update endpoint URLs and field mapping |
| API | `src/infrastructure/api/evidence.ts` | Update endpoint URLs, add base64/proxy support |
| Hook | `src/application/hooks/useSessions.ts` | Update stale detection logic |
| Hook | `src/application/hooks/useEvidence.ts` | Handle base64 images + object key fallback |
| UI | `src/presentation/components/operations/SessionListView.tsx` | Update status tabs, field names |
| UI | `src/presentation/components/operations/SessionDetailView.tsx` | Update metadata display |
| UI | `src/presentation/components/diagnostics/EvidencePanel.tsx` | Handle base64 vs proxy images |
| UI | `src/presentation/components/diagnostics/EvidenceThumbnail.tsx` | Replace presigned URL logic with base64/proxy |
| Test | `tests/integration/contracts/` | Add/update contract tests for new schemas |
| Test | `tests/integration/mocks/` | Update MSW handlers to return realistic data |

## Architecture Decision: Image Rendering

```
Evidence capture has image_data?
  ├── YES → <img src="data:image/jpeg;base64,{image_data}" />
  └── NO → Evidence has object_key + upload_status=uploaded?
              ├── YES → <img src="/api/v1/evidence/image?key={object_key}" />
              │         (requires PiOrchestrator image proxy endpoint)
              └── NO → Show "Image not available" placeholder
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Sessions list empty | Endpoint returns 404 | Check PiOrchestrator version, verify route is registered on port 8082 |
| Zod validation warnings | Schema mismatch | Update Zod schemas to match actual response |
| Images don't load | base64 data cleared from memory | Need image proxy endpoint (handoff to PiOrchestrator) |
| CORS errors | Proxy not configured | Ensure Vite proxy targets correct port |
| "Failed" tab shows no sessions | Status enum mismatch | Update status enum from `cancelled` to `failed` |
