<!--
SYNC IMPACT REPORT
==================
Version change: N/A → 1.0.0 (Initial ratification)
Modified principles: N/A (new constitution)
Added sections:
  - Project Identity
  - 7 Core Principles (Code Quality, Testing Discipline, Security, User Experience, Observability, Maintainability, Documentation)
  - Governance
  - Deployment Policies
  - Design System
Removed sections: N/A
Templates requiring updates: N/A (initial setup)
Follow-up TODOs: None
-->

# PiDashboard Project Constitution

> **Version**: 1.0.0
> **Ratification Date**: 2026-01-06
> **Last Amended**: 2026-01-06
> **Status**: Active

## Project Identity

**Name**: DeliCasa Pi Dashboard
**Purpose**: Web dashboard for configuring and monitoring PiOrchestrator IoT devices
**Repository**: `PiDashboard/` within the DeliCasa monorepo
**Primary Stakeholders**: DeliCasa IoT team, field technicians, system administrators

### Mission Statement

Provide a reliable, lightweight, and user-friendly web interface for Raspberry Pi devices running PiOrchestrator, enabling WiFi configuration, device provisioning, system monitoring, and MQTT setup in both local development and production Pi environments.

---

## Core Principles

### Principle 1: Code Quality

**Statement**: All code MUST adhere to strict TypeScript standards with no implicit `any` types, proper error handling, and consistent formatting.

**Non-Negotiable Rules**:
- TypeScript strict mode MUST be enabled (`strict: true` in tsconfig)
- ESLint MUST pass with zero errors before any commit
- All React components MUST be functional components with proper TypeScript props interfaces
- No `@ts-ignore` or `@ts-expect-error` comments without accompanying issue tracker reference
- Utility functions MUST have explicit return types

**Rationale**: A dashboard running on resource-constrained IoT hardware requires predictable, type-safe code to prevent runtime errors that could disrupt device management operations.

---

### Principle 2: Testing Discipline

**Statement**: The project MUST maintain comprehensive test coverage across unit, integration, and end-to-end testing layers.

**Non-Negotiable Rules**:
- Unit tests MUST exist for all utility functions and custom hooks (Vitest)
- Component tests MUST cover user interactions and state changes (Testing Library)
- Integration tests MUST verify API proxy communication with PiOrchestrator backend
- E2E tests MUST validate critical user flows: WiFi connection, device provisioning, system monitoring (Playwright)
- Test coverage MUST remain above 70% for statements
- All tests MUST pass before merging to main branch

**Rationale**: Field-deployed dashboards cannot be easily debugged; comprehensive testing ensures reliability in production Pi environments where failures impact device management capabilities.

---

### Principle 3: Security

**Statement**: The dashboard MUST implement secure practices appropriate for IoT device management interfaces.

**Non-Negotiable Rules**:
- All API endpoints MUST validate input data before processing
- Sensitive configuration (MQTT credentials, WiFi passwords) MUST NOT be logged or exposed in client-side code
- CORS MUST be configured to restrict access to known origins
- Content Security Policy headers MUST be set in production builds
- No secrets or credentials MUST be committed to version control
- Dependencies MUST be audited for known vulnerabilities (`npm audit`) before releases

**Rationale**: IoT dashboards control physical devices; security vulnerabilities could allow unauthorized access to device configurations or network credentials.

---

### Principle 4: User Experience

**Statement**: The dashboard MUST provide a responsive, accessible, and intuitive interface optimized for both desktop development and Pi touchscreen/browser deployment.

**Non-Negotiable Rules**:
- All interactive elements MUST meet WCAG 2.1 AA accessibility standards
- UI MUST be responsive and functional on screens from 320px to 1920px width
- Loading states MUST be visible for all async operations
- Error states MUST provide actionable feedback to users
- Touch targets MUST be minimum 44x44 pixels for Pi touchscreen compatibility
- Theme toggle (dark/light) MUST persist user preference

**Rationale**: Field technicians use this dashboard in varying conditions (bright sunlight, low-light server rooms, touchscreens); the UI must adapt to all contexts.

---

### Principle 5: Observability

**Statement**: The dashboard MUST provide visibility into system health, performance metrics, and operational status.

**Non-Negotiable Rules**:
- Real-time system metrics (CPU, memory, disk, temperature) MUST update at configurable intervals
- Network status indicators MUST reflect actual connectivity state
- MQTT connection status MUST be visibly displayed
- API request failures MUST be logged with context for debugging
- Performance metrics MUST be available for critical operations (WiFi scan duration, provisioning time)

**Rationale**: Remote IoT devices require proactive monitoring; operators must quickly identify issues before they impact vending machine operations.

---

### Principle 6: Maintainability

**Statement**: Code architecture MUST facilitate easy updates, feature additions, and long-term maintenance.

**Non-Negotiable Rules**:
- Components MUST follow single responsibility principle (one concern per component)
- Shared logic MUST be extracted into custom hooks or utility functions
- API interactions MUST be abstracted into a dedicated service layer
- File naming MUST follow consistent conventions (PascalCase for components, camelCase for utilities)
- All components MUST have corresponding Storybook stories for visual documentation
- Dependencies MUST be kept up-to-date with quarterly audits

**Rationale**: This dashboard will evolve alongside PiOrchestrator; clean architecture reduces the cost of future changes and onboarding new contributors.

---

### Principle 7: Documentation

**Statement**: All features, APIs, and deployment procedures MUST be documented for both developers and operators.

**Non-Negotiable Rules**:
- README MUST include setup instructions, development commands, and deployment procedures
- API proxy endpoints MUST be documented with request/response examples
- Component props MUST include JSDoc comments explaining purpose and usage
- Deployment changes MUST be reflected in documentation before release
- CHANGELOG MUST be updated for all user-facing changes

**Rationale**: IoT projects involve cross-functional teams; clear documentation enables efficient collaboration between frontend, backend, and operations personnel.

---

## Governance

### Amendment Process

1. **Proposal**: Any team member may propose constitution amendments via pull request
2. **Review Period**: Amendments MUST be open for review for minimum 48 hours
3. **Approval**: Amendments require approval from at least one code owner
4. **Ratification**: Upon merge, `LAST_AMENDED_DATE` and `CONSTITUTION_VERSION` MUST be updated

### Version Numbering

This constitution follows Semantic Versioning:
- **MAJOR**: Backward-incompatible changes (principle removal, fundamental redefinition)
- **MINOR**: New principles, sections, or material expansions
- **PATCH**: Clarifications, typo fixes, non-semantic refinements

### Compliance Review

- Constitution compliance MUST be verified during code review
- Quarterly self-assessment SHOULD be conducted to identify drift
- Non-compliance MUST be addressed as technical debt with tracked issues

---

## Deployment Policies

### Target Environments

| Environment | Purpose | URL/Access |
|-------------|---------|------------|
| Local Dev | Development and testing | `http://localhost:5173` |
| Pi Production | Dashboard served by PiOrchestrator | `http://<pi-ip>:8082` |

### Deployment Procedures

**Local Development**:
```bash
npm install
npm run dev
```

**Pi Deployment**:
```bash
npm run build
scp -r dist/* pi:/home/pi/PiOrchestrator/web/dashboard/
```

### Release Checklist

1. All tests pass (`npm test`)
2. Build succeeds (`npm run build`)
3. CHANGELOG updated
4. Version bumped in package.json
5. Documentation reviewed
6. Security audit clean (`npm audit`)

---

## Design System

### Independence Statement

PiDashboard maintains its **own design system optimized for Pi hardware** while sharing common patterns with the DeliCasa ecosystem where practical.

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary Color | `#8c1815` | DeliCasa Red (brand alignment) |
| Background (Light) | `#ffffff` | Default background |
| Background (Dark) | `#0a0a0a` | Dark mode background |
| Border Radius | `8px` | Standard component radius |
| Font Family | `Geist, system-ui` | Primary typeface |
| Touch Target | `44px` minimum | Interactive elements |

### Component Library

- **Base**: shadcn/ui (new-york style variant)
- **Icons**: Lucide React
- **Theme**: next-themes for dark/light mode persistence

### Pi-Specific Adaptations

- Larger touch targets for touchscreen operation
- High contrast mode support for outdoor visibility
- Reduced animation for performance on Pi hardware
- Offline-first patterns for intermittent connectivity

---

## Appendix: Related Documents

- `README.md` - Project overview and quick start
- `CHANGELOG.md` - Version history and release notes
- `package.json` - Dependencies and scripts
- Parent DeliCasa `CLAUDE.md` - System-wide architecture context

---

*This constitution establishes the foundational principles for PiDashboard development. All contributors MUST read and adhere to these guidelines.*
