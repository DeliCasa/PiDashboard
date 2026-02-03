---
handoff_id: "029-route-normalization"
direction: "outgoing"
from_repo: "PiDashboard"
to_repo: "PiOrchestrator"
created_at: "2026-01-12T00:00:00Z"
status: "new"
related_prs: []
related_commits: []
requires: []
acceptance: []
verification: []
risks: []
notes: ""
---

# Handoff: Route Structure Normalization (029)

**From**: PiDashboard
**To**: PiOrchestrator
**Date**: 2026-01-12
**Priority**: High
**Status**: Ready for Implementation

---

## Summary

The PiDashboard deployment revealed a route architecture mismatch: the dashboard server (port 8082) lacks V1 provisioning API routes, causing the React frontend to fail when calling `/api/v1/provisioning/*` endpoints. This handoff requests route normalization so both ports serve a consistent API surface.

---

## Current Architecture

### Port Configuration

| Port | Server | Purpose | API Routes |
|------|--------|---------|------------|
| 8081 | Main API | Full API + docs | All V1 routes, health, OpenAPI |
| 8082 | Config Web | Dashboard + legacy API | Legacy `/api/*` only |
| 9090 | Prometheus | Metrics | Metrics endpoint |

### Route Availability Matrix

| Route Pattern | Port 8081 | Port 8082 | Used By Dashboard |
|---------------|-----------|-----------|-------------------|
| `/health` | ✅ | ❌ | ✅ Yes |
| `/api/wifi/*` | ✅ | ✅ | ✅ Yes |
| `/api/devices/*` | ✅ | ✅ | ✅ Yes |
| `/api/status` | ✅ | ✅ | ✅ Yes |
| `/api/v1/provisioning/allowlist` | ✅ | ❌ | ✅ Yes |
| `/api/v1/provisioning/batch/*` | ✅ | ❌ | ✅ Yes |
| `/api/v1/provisioning/sessions/*` | ✅ | ❌ | ✅ Yes |
| `/api/v1/config` | ✅ | ❌ | ✅ Yes |
| `/api/v1/logs` | ✅ | ❌ | ✅ Yes |
| `/docs` | ✅ | ❌ | ❌ No |

### Problem Statement

The PiDashboard React frontend makes API calls to `/api/v1/*` endpoints expecting them to be available on the same origin (port 8082 via Tailscale Funnel). Currently:

1. **Dashboard loads correctly** - Static files served from embedded `web/dashboard/`
2. **Legacy API works** - `/api/wifi/*`, `/api/devices/*` via `ConfigWebHandler`
3. **V1 API fails** - `/api/v1/provisioning/*` returns `index.html` (SPA fallback)

This breaks:
- Allowlist management
- Batch provisioning sessions
- Session recovery
- Real-time SSE events

---

## Proposed Solution

### Option A: Add V1 Routes to Config Server (Recommended)

Modify `setupConfigWebRoutes()` in `cmd/hexagonal/main.go` to include V1 API routes:

```go
func setupConfigWebRoutes(app *container.Container) *gin.Engine {
    gin.SetMode(gin.ReleaseMode)
    router := gin.New()

    // Standard middleware
    router.Use(gin.Recovery())
    router.Use(middleware.RequestID())
    router.Use(middleware.CORS())

    // Register web configuration routes (legacy /api/*)
    app.ConfigWebHandler.SetupRoutes(router)

    // Register dashboard routes
    app.DashboardHandler.SetupRoutes(router)

    // === NEW: Add V1 API routes ===
    setupV1Routes(router, app)

    // Register embedded static file handler (must be last - has NoRoute fallback)
    staticHandler := web.NewStaticHandler(embedded.DashboardFS, "web/dashboard")
    staticHandler.RegisterRoutes(router)

    return router
}

// setupV1Routes adds V1 API routes to any router
func setupV1Routes(router *gin.Engine, app *container.Container) {
    v1 := router.Group("/api/v1")
    v1.Use(middleware.RequestID())

    // Health check
    router.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "healthy", "version": app.Config.Version})
    })

    // Provisioning routes
    prov := v1.Group("/provisioning")
    {
        // Allowlist
        prov.GET("/allowlist", app.AllowlistHandler.List)
        prov.POST("/allowlist", app.AllowlistHandler.Add)
        prov.DELETE("/allowlist/:mac", app.AllowlistHandler.Remove)

        // Batch sessions
        prov.POST("/batch/start", app.BatchHandler.Start)
        prov.GET("/batch/:id", app.BatchHandler.Get)
        prov.POST("/batch/:id/stop", app.BatchHandler.Stop)
        prov.GET("/batch/:id/devices", app.BatchHandler.GetDevices)
        prov.POST("/batch/:id/devices/:mac/provision", app.BatchHandler.ProvisionDevice)
        prov.POST("/batch/:id/provision-all", app.BatchHandler.ProvisionAll)
        prov.GET("/batch/events", app.BatchHandler.SSEEvents)
        prov.GET("/batch/network", app.BatchHandler.NetworkStatus)

        // Session recovery
        prov.GET("/sessions/recoverable", app.SessionHandler.ListRecoverable)
        prov.POST("/sessions/:id/resume", app.SessionHandler.Resume)
    }

    // Config and logs
    v1.GET("/config", app.ConfigV1Handler.Get)
    v1.GET("/logs", app.LogsV1Handler.Get)
}
```

**Pros**:
- Single source of truth for route definitions
- No external proxy needed
- Maintains existing architecture

**Cons**:
- Some code duplication with main router setup
- Need to ensure handler dependencies are available

### Option B: Shared Route Registration

Extract route registration into a shared function used by both servers:

```go
// internal/api/routes/v1_routes.go
package routes

func RegisterV1Routes(router *gin.Engine, handlers *V1Handlers) {
    v1 := router.Group("/api/v1")
    // ... route definitions
}

// Used in both setupAPIRoutes() and setupConfigWebRoutes()
```

**Pros**:
- DRY principle
- Guaranteed consistency

**Cons**:
- Requires refactoring existing router setup

### Option C: Reverse Proxy on Port 8082

Add middleware to proxy `/api/v1/*` requests to port 8081:

```go
func apiProxyMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        if strings.HasPrefix(c.Request.URL.Path, "/api/v1/") {
            proxy := httputil.NewSingleHostReverseProxy(&url.URL{
                Scheme: "http",
                Host:   "localhost:8081",
            })
            proxy.ServeHTTP(c.Writer, c.Request)
            c.Abort()
            return
        }
        c.Next()
    }
}
```

**Pros**:
- Minimal code changes
- Quick to implement

**Cons**:
- Extra network hop
- Potential latency
- Complicates debugging

---

## Implementation Requirements

### Affected Files

| File | Change Required |
|------|-----------------|
| `cmd/hexagonal/main.go` | Add V1 routes to `setupConfigWebRoutes()` |
| `internal/api/router.go` | Extract shared route registration (Option B) |
| `internal/container/container.go` | Ensure handlers accessible for config server |

### Routes to Add to Port 8082

```
GET  /health
GET  /api/v1/provisioning/allowlist
POST /api/v1/provisioning/allowlist
DELETE /api/v1/provisioning/allowlist/:mac
POST /api/v1/provisioning/batch/start
GET  /api/v1/provisioning/batch/:id
POST /api/v1/provisioning/batch/:id/stop
POST /api/v1/provisioning/batch/:id/pause
POST /api/v1/provisioning/batch/:id/resume
GET  /api/v1/provisioning/batch/:id/devices
POST /api/v1/provisioning/batch/:id/devices/:mac/provision
POST /api/v1/provisioning/batch/:id/provision-all
POST /api/v1/provisioning/batch/:id/close
GET  /api/v1/provisioning/batch/events (SSE)
GET  /api/v1/provisioning/batch/network
GET  /api/v1/provisioning/sessions/recoverable
POST /api/v1/provisioning/sessions/:id/resume
DELETE /api/v1/provisioning/sessions/:id
GET  /api/v1/config
GET  /api/v1/logs
```

### Testing Checklist

After implementation, verify:

```bash
# Health check
curl http://localhost:8082/health
# Expected: {"status":"healthy",...}

# Allowlist (empty)
curl http://localhost:8082/api/v1/provisioning/allowlist
# Expected: {"success":true,"data":{"entries":[],"count":0},...}

# Network status
curl http://localhost:8082/api/v1/provisioning/batch/network
# Expected: {"success":true,"data":{...},...}

# Validation error
curl -X POST http://localhost:8082/api/v1/provisioning/allowlist \
  -H "Content-Type: application/json" \
  -d '{"mac":"invalid"}'
# Expected: {"success":false,"error":{"code":"VALIDATION_FAILED",...},...}
```

---

## Dashboard Route Definitions

For reference, here are the routes the PiDashboard expects (from `src/infrastructure/api/routes.ts`):

```typescript
export const PROVISIONING_ROUTES = {
  // Allowlist
  allowlistList: '/provisioning/allowlist',
  allowlistEntry: (mac: string) => `/provisioning/allowlist/${mac}`,
  allowlistBulkAdd: '/provisioning/allowlist/bulk',
  allowlistBulkRemove: '/provisioning/allowlist/bulk-remove',
  allowlistClearAll: '/provisioning/allowlist/all',
  allowlistStats: '/provisioning/allowlist/stats',

  // Batch Sessions
  batchStart: '/provisioning/batch/start',
  batchSession: (id: string) => `/provisioning/batch/${id}`,
  batchStop: (id: string) => `/provisioning/batch/${id}/stop`,
  batchPause: (id: string) => `/provisioning/batch/${id}/pause`,
  batchResume: (id: string) => `/provisioning/batch/${id}/resume`,
  batchDevices: (id: string) => `/provisioning/batch/${id}/devices`,
  batchProvisionDevice: (id: string, mac: string) =>
    `/provisioning/batch/${id}/devices/${mac}/provision`,
  batchProvisionAll: (id: string) => `/provisioning/batch/${id}/provision-all`,
  batchClose: (id: string) => `/provisioning/batch/${id}/close`,
  batchEvents: '/provisioning/batch/events',
  batchNetwork: '/provisioning/batch/network',

  // Session Recovery
  sessionsRecoverable: '/provisioning/sessions/recoverable',
  sessionResume: (id: string) => `/provisioning/sessions/${id}/resume`,
  sessionDiscard: (id: string) => `/provisioning/sessions/${id}`,
  sessionsHistory: '/provisioning/sessions/history',

  // Network
  networkStatus: '/provisioning/network/status',
} as const;

// All routes are prefixed with /api/v1 by the V1 client
```

---

## Success Criteria

1. **SC-001**: All `/api/v1/provisioning/*` endpoints return JSON on port 8082 (not HTML)
2. **SC-002**: Dashboard loads and displays allowlist without errors
3. **SC-003**: Batch provisioning sessions can be started from dashboard
4. **SC-004**: SSE event stream connects successfully from dashboard
5. **SC-005**: Error responses include `correlation_id` for debugging
6. **SC-006**: No 404 errors in browser DevTools Network tab

---

## Timeline Suggestion

| Phase | Task | Estimate |
|-------|------|----------|
| 1 | Review and select implementation option | 30 min |
| 2 | Implement route registration | 2 hrs |
| 3 | Test all endpoints via curl | 30 min |
| 4 | Test with live dashboard | 30 min |
| 5 | Update documentation | 30 min |

---

## Related Documents

- PiDashboard: `docs/INTEGRATION_028_SUMMARY.md`
- PiDashboard: `specs/001-api-compat-integration/`
- PiDashboard: `src/infrastructure/api/routes.ts`
- PiOrchestrator: `internal/api/router.go`
- PiOrchestrator: `cmd/hexagonal/main.go`

---

## Contact

For questions about dashboard expectations or API contracts, refer to:
- `PiDashboard/specs/001-api-compat-integration/contracts/v1-provisioning-api.md`
- `PiDashboard/docs/HANDOFF_028_API_COMPAT_COMPLETE.md`
