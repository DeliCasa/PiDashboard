# Implementation Plan: Pi Dashboard Frontend Integration with PiOrchestrator

> **Feature**: 002-pi-orchestrator-integration
> **Created**: 2026-01-06
> **Status**: Ready for Implementation

---

## Technical Context

| Aspect | Value |
|--------|-------|
| Project Type | Integration (no new development) |
| Frontend | React 19 + Vite 7 + TypeScript (Feature 001 - COMPLETE) |
| Backend | Go 1.23 + Hexagonal Architecture (Feature 019 - Backend COMPLETE) |
| Deployment Target | Raspberry Pi 4, ARM64 |
| Integration Method | Go embed directive for static assets |

---

## Constitution Check

### Principle 1: Code Quality
- **Status**: ✅ COMPLIANT
- **Notes**: No new code required; existing code passes TypeScript strict mode

### Principle 2: Testing Discipline
- **Status**: ⚠️ PARTIAL - Verification only
- **Notes**: This feature is verification tasks, not new test development
- **Justification**: Manual verification acceptable for integration tasks; automated tests exist in Feature 001

### Principle 3: Security
- **Status**: ✅ COMPLIANT
- **Notes**: No new security concerns; existing security measures in place

### Principle 4: User Experience
- **Status**: ✅ COMPLIANT
- **Notes**: UX already validated in Feature 001; verification confirms UX works end-to-end

### Principle 5: Observability
- **Status**: ✅ COMPLIANT
- **Notes**: System metrics, network status, and logs already implemented

### Principle 6: Maintainability
- **Status**: ✅ COMPLIANT
- **Notes**: No architectural changes; using existing patterns

### Principle 7: Documentation
- **Status**: ✅ COMPLIANT
- **Notes**: quickstart.md provides deployment procedures; CHANGELOG will be updated

---

## Gate Evaluation

| Gate | Status | Notes |
|------|--------|-------|
| TypeScript strict mode | ✅ | Existing code compliant |
| ESLint zero errors | ✅ | `npm run lint` passes |
| Test coverage >70% | ⚠️ | N/A for integration tasks |
| CHANGELOG updated | 🔲 | Required after implementation |
| Security audit | ✅ | No new dependencies |

**Overall**: ✅ PASS - Feature can proceed to implementation

---

## Implementation Phases

### Phase 1: Build and Asset Deployment

**Estimated Effort**: 15 minutes

**Tasks**:

| # | Task | Command/Action |
|---|------|----------------|
| 1.1 | Build frontend | `npm run build` in PiDashboard |
| 1.2 | Verify build output | Check `dist/` contains index.html and assets |
| 1.3 | Copy assets | `make copy-assets` in PiOrchestrator |
| 1.4 | Build Go binary | `make dashboard` in PiOrchestrator |
| 1.5 | Verify embedding | Start binary, check dashboard loads |

**Exit Criteria**:
- [ ] Dashboard loads at `http://localhost:8082/`
- [ ] All static assets served correctly (no 404s)
- [ ] SPA routing works (refresh on any page works)

---

### Phase 2: Feature Verification

**Estimated Effort**: 30 minutes

**Tasks**:

| # | Task | Verification Steps |
|---|------|-------------------|
| 2.1 | System tab | Verify CPU, memory, disk, temp display |
| 2.2 | WiFi tab | Scan networks, verify list populates |
| 2.3 | Devices tab | Scan for BLE devices, verify provisioning UI |
| 2.4 | Cameras tab | List cameras, test capture (if available) |
| 2.5 | Door tab | Verify door controls render |
| 2.6 | Network tab | Verify Tailscale, MQTT, Bridge status |
| 2.7 | Logs tab | Verify SSE streaming works |
| 2.8 | Config tab | Verify configuration display |
| 2.9 | Theme toggle | Toggle light/dark, verify persistence |
| 2.10 | Binary size | Measure and document (~32MB expected) |

**Exit Criteria**:
- [ ] All 8 tabs functional
- [ ] Theme persists across refresh
- [ ] No JavaScript console errors
- [ ] Binary size documented

---

### Phase 3: Pi Deployment

**Estimated Effort**: 30 minutes

**Tasks**:

| # | Task | Command/Action |
|---|------|----------------|
| 3.1 | Build ARM64 binary | `make build-pi-hex` |
| 3.2 | Deploy to Pi | `make deploy-dashboard` |
| 3.3 | Verify service | `ssh pi 'sudo systemctl status piorchestrator'` |
| 3.4 | Test dashboard | Access `http://192.168.1.124:8082/` |
| 3.5 | Verify all features | Repeat Phase 2 verification on Pi |
| 3.6 | PWA installation | Install on mobile, verify standalone mode |
| 3.7 | Offline test | Disconnect network, verify cached content |

**Exit Criteria**:
- [ ] Dashboard accessible on Pi network
- [ ] All features work identically to local
- [ ] PWA installs and launches correctly
- [ ] Offline mode works for cached content

---

## Task Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1: Build and Deploy | 5 | 🔲 Pending |
| Phase 2: Verification | 10 | 🔲 Pending |
| Phase 3: Pi Deployment | 7 | 🔲 Pending |
| **Total** | **22** | |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Asset copy fails | Low | High | Manual copy as fallback |
| API mismatch | Low | Medium | Use MOCK_MODE for initial testing |
| Pi unavailable | Medium | Medium | Complete all local verification first |
| PWA not prompting | Low | Low | Check manifest and HTTPS requirements |

---

## Post-Implementation

### Required Updates

1. **CHANGELOG.md**: Document integration completion
2. **Feature 019 tasks.md**: Mark remaining tasks complete
3. **Spec status**: Update to "Complete"

### Verification Sign-off

After all phases complete, obtain sign-off:

- [ ] All quickstart.md checklist items verified
- [ ] No outstanding issues
- [ ] Documentation updated
- [ ] Feature marked complete

---

## Appendix: File Locations

| File | Path |
|------|------|
| Frontend source | `/home/notroot/Documents/Code/CITi/DeliCasa/PiDashboard/` |
| Build output | `/home/notroot/Documents/Code/CITi/DeliCasa/PiDashboard/dist/` |
| Embedded directory | `/home/notroot/Documents/Code/CITi/DeliCasa/PiOrchestrator/internal/embedded/web/dashboard/` |
| Go embed file | `/home/notroot/Documents/Code/CITi/DeliCasa/PiOrchestrator/internal/embedded/embed.go` |
| Makefile | `/home/notroot/Documents/Code/CITi/DeliCasa/PiOrchestrator/Makefile` |
| Pi binary | `/home/pi/Documents/Code/PiOrchestrator/bin/piorch-hex` |
