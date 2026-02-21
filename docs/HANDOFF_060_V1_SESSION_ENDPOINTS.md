---
handoff_id: "060-v1-session-endpoints"
direction: outgoing
from_repo: PiDashboard
to_repo: PiOrchestrator
created_at: "2026-02-21T15:20:00.000Z"
status: new
related_prs: []
related_commits: []
requires:
  - type: api
    description: "V1 session list endpoint registered on config UI server (port 8082)"
  - type: api
    description: "V1 session detail endpoint registered on config UI server (port 8082)"
  - type: api
    description: "V1 evidence list endpoint registered on config UI server (port 8082)"
  - type: api
    description: "V1 evidence pair endpoint registered on config UI server (port 8082)"
  - type: api
    description: "V1 inventory delta endpoint registered on config UI server (port 8082)"
acceptance:
  - "GET /api/v1/diagnostics/sessions returns 200 with session list on port 8082"
  - "GET /api/v1/sessions/:sessionId returns 200 with session detail on port 8082"
  - "GET /api/v1/sessions/:sessionId/evidence returns 200 with evidence list on port 8082"
  - "GET /api/v1/sessions/:sessionId/evidence/pair returns 200 with evidence pair on port 8082"
  - "GET /api/v1/sessions/:sessionId/inventory-delta returns 200 with delta on port 8082"
  - "No API key authentication required on port 8082 (config UI server)"
  - "Response schemas match existing V1 schemas already served on port 8081"
verification:
  - "curl -s http://localhost:8082/api/v1/diagnostics/sessions | python3 -m json.tool returns valid JSON with data.sessions array"
  - "curl -s http://localhost:8082/api/v1/sessions/{session_id}/evidence | python3 -m json.tool returns valid JSON with data.captures array"
  - "PiDashboard Operations tab loads sessions from live endpoint (no mocks)"
  - "PiDashboard session drill-down shows evidence images"
risks:
  - "Port 8082 has no authentication — session data is accessible without API key. This is acceptable for local network config UI but should not be exposed via Tailscale Funnel without auth."
  - "V1 endpoints on port 8081 use API key middleware — the same handlers can be reused on 8082 by registering them without the auth middleware."
notes: |
  ## Context

  PiDashboard's Operations tab has full UI for sessions, evidence, and inventory delta
  (Features 057-059). However, these V1 endpoints are only registered on the main API
  server (port 8081) which requires API key authentication. PiDashboard proxies to
  port 8082 (config UI server) which has no auth.

  ## What Already Works on Port 8082

  - `GET /api/dashboard/cameras` — Camera list (confirmed 200)
  - `GET /api/dashboard/diagnostics/cameras` — Camera diagnostics (confirmed 200)
  - Dashboard static file serving

  ## What Needs to Be Added to Port 8082

  The following V1 endpoints need to be registered on the config UI HTTP server
  (setupConfigWebRoutes in `cmd/server/main.go` around line 750):

  1. `GET /api/v1/diagnostics/sessions` — List all sessions with metadata
  2. `GET /api/v1/sessions/:sessionId` — Get session detail
  3. `GET /api/v1/sessions/:sessionId/evidence` — List evidence for session
  4. `GET /api/v1/sessions/:sessionId/evidence/pair` — Get before/after evidence pair
  5. `GET /api/v1/sessions/:sessionId/inventory-delta` — Get inventory delta

  These handlers already exist and are registered on port 8081. They just need to be
  additionally registered on the port 8082 router without the API key middleware.

  ## PiDashboard Validation Status

  - All test fixtures aligned to V1 schema (128 files, 2692 tests pass)
  - Camera health: VALIDATED against live data
  - Sessions/Evidence/Delta: UI ready, blocked only by endpoint registration
  - Image proxy (HANDOFF_058) is a separate dependency for evidence images
---

# Handoff: V1 Session Endpoints on Config UI Server

## Summary

PiDashboard needs V1 session/evidence/delta endpoints registered on the config UI
server (port 8082) without API key authentication. These endpoints already exist on
the main API server (port 8081) but PiDashboard proxies to 8082.

## Priority

**HIGH** — This is the sole blocker for live session viewing in the Operations tab.
All PiDashboard UI, hooks, API clients, and test infrastructure are complete and
validated. Only the endpoint registration is missing.

## Implementation Guidance

In `PiOrchestrator/cmd/server/main.go`, find `setupConfigWebRoutes` (around line 750)
and add the V1 session routes to the config UI router, reusing existing handlers
without the API key auth middleware.

## Validation

After implementation, verify:
```bash
curl -s http://localhost:8082/api/v1/diagnostics/sessions | python3 -m json.tool
curl -s http://localhost:8082/api/v1/sessions/{session_id}/evidence | python3 -m json.tool
```

Then open PiDashboard at http://localhost:5173, navigate to Operations tab, and verify
sessions load with real data.
