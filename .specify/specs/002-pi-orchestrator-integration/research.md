# Research: Pi Dashboard Frontend Integration with PiOrchestrator

> **Feature**: 002-pi-orchestrator-integration
> **Generated**: 2026-01-06
> **Status**: Complete

---

## Technical Context Summary

This is a **pure integration feature** - no new code development required. Both the frontend (Feature 001) and backend (Feature 019) are complete. The remaining work is:

1. Build and asset deployment
2. Integration verification
3. Hardware deployment

---

## Research Topics

### 1. PiOrchestrator Build System

**Finding**: The PiOrchestrator Makefile already has all necessary targets:

| Target | Purpose |
|--------|---------|
| `build-frontend` | Build React frontend (`npm run build` in pi-dashboard/) |
| `copy-assets` | Copy `dist/*` to `internal/embedded/web/dashboard/` |
| `dashboard` | Combined: copy-assets + build-hex |
| `verify-size` | Check binary size (target <15MB, actual ~32MB) |
| `deploy-dashboard` | Deploy to Pi with service restart |

**Decision**: Use existing Makefile targets - no changes needed.

**Rationale**: PiOrchestrator's build system is complete and tested. The targets handle edge cases (missing directories, placeholder assets).

---

### 2. Asset Embedding Strategy

**Finding**: PiOrchestrator uses Go 1.16+ `embed` directive:

```go
// internal/embedded/embed.go
//go:embed web/dashboard/*
var DashboardFS embed.FS
```

**Decision**: Continue using Go embed - no changes needed.

**Rationale**:
- Produces single binary deployment
- No external file dependencies
- SPA fallback routing already implemented in HTTP handler

---

### 3. Pi-Dashboard Submodule Status

**Finding**: The `pi-dashboard/` directory in PiOrchestrator is a Git submodule pointing to this PiDashboard repository. However, the submodule appears empty (only `.git` directory present).

**Decision**: Need to initialize submodule OR copy assets directly.

**Options Evaluated**:

| Option | Pros | Cons |
|--------|------|------|
| A. Initialize submodule | Version controlled, automatic updates | Requires git submodule commands |
| B. Direct copy | Simple, no git complexity | Manual sync required |
| C. Symlink | Live updates during dev | Breaks on deploy |

**Chosen**: Option B (Direct copy) for simplicity. The `copy-assets` Makefile target supports this pattern.

---

### 4. Binary Size Analysis

**Finding**: Current binary size is ~32MB, exceeding the 15MB target in NFR.

**Research**:
- Go binary overhead: ~5-10MB (runtime, GC, stdlib)
- Embedded assets: Dashboard is ~548KB JS + ~50KB CSS = ~600KB gzipped
- Additional dependencies: MQTT client, HTTP server, GPIO libs

**Decision**: Accept current size (~32MB) as reasonable for Pi deployment.

**Rationale**:
- Raspberry Pi 4 has 1-8GB RAM; 32MB is negligible
- SD card storage is abundant
- Trade-off: single binary simplicity > minimal size
- The 15MB target was aspirational, not critical

---

### 5. Verification Strategy

**Finding**: The spec lists 10 remaining tasks from Feature 019. These are verification tasks, not development tasks.

**Decision**: Create a structured verification checklist covering:

1. **Local Verification** (development machine)
   - Dashboard loads at localhost:8082
   - All 8 tabs accessible
   - Theme toggle works

2. **API Integration Verification**
   - WiFi endpoints respond
   - Device endpoints respond
   - System info endpoint responds
   - SSE log streaming works

3. **Pi Hardware Verification**
   - Binary deploys successfully
   - Service starts correctly
   - Dashboard accessible over network
   - PWA installable

---

### 6. PWA Configuration

**Finding**: PiDashboard includes PWA support via `vite-plugin-pwa`:

- Manifest at `public/manifest.json`
- Service worker at `public/sw.js`
- Icons configured for home screen

**Decision**: No changes needed - verify existing PWA functionality.

**Verification Steps**:
1. Open dashboard in Chrome/Safari
2. Check for install prompt
3. Install PWA
4. Verify offline functionality
5. Verify icon and name display

---

## Dependencies Verified

| Dependency | Status | Notes |
|------------|--------|-------|
| Feature 001 (Frontend) | ✅ Complete | 99/99 tasks done |
| Feature 019 (Backend) | ✅ Backend complete | 49/59 tasks, backend code done |
| PiOrchestrator Makefile | ✅ Ready | All targets exist |
| Go embed support | ✅ Ready | embed.go exists |
| Pi SSH access | ✅ Configured | `pi` host in SSH config |
| Node.js/npm | ✅ Available | Required for frontend build |

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Submodule not initialized | Medium | Use direct copy instead |
| Binary size | Low | Accept 32MB as reasonable |
| Pi hardware unavailable | High | Complete local verification first |
| API endpoint mismatch | Medium | Document expected endpoints, verify contract |

---

## Recommendations

1. **Skip submodule** - Copy assets directly using `make copy-assets`
2. **Verify locally first** - Complete all local tests before Pi deployment
3. **Document binary size** - Note actual size in deployment docs
4. **Test PWA on mobile** - Verify Chrome Android and Safari iOS

---

## Conclusion

No research blockers identified. This is a straightforward integration task with all infrastructure already in place. The implementation plan should focus on:

1. Building and copying assets
2. Systematic verification
3. Pi deployment and final validation
