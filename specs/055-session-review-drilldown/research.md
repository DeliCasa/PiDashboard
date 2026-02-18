# Research: 055-session-review-drilldown

**Date**: 2026-02-18
**Status**: Complete — all unknowns resolved

## R1: Timeline Visualization Pattern

**Decision**: Custom `SessionStatusTimeline` component using native Tailwind + Radix primitives.

**Rationale**: No stepper/timeline component exists in the current shadcn/ui installation. The timeline is a simple 5-step horizontal indicator — a custom component with `div` elements, Tailwind utilities, and lucide icons is simpler than adding a library dependency.

**Alternatives considered**:
- `@radix-ui/react-steps` — doesn't exist; Radix has no stepper primitive.
- `react-step-wizard` — overkill for a read-only display (not a wizard form).
- Headless UI — no stepper component.

**Implementation sketch**:
```
[✓ Created] ——— [✓ Capture] ——— [● Analysis] ——— [○ Delta Ready] ——— [○ Finalized]
```
- Completed: green check icon, solid connector line
- Active: pulsing dot, animated connector
- Error: red X icon, dashed connector
- Upcoming: gray circle, dashed connector

## R2: Re-run API Endpoint Discovery

**Decision**: Use runtime feature detection via a guarded POST request.

**Rationale**: The `POST /v1/inventory/:runId/rerun` endpoint does not exist in the current PiDashboard API client (`inventory-delta.ts`). The PiOrchestrator/BridgeServer may or may not implement it. Rather than requiring backend coordination before shipping this feature, we use feature detection:

1. When a run has `status === 'error'`, attempt `POST /v1/inventory/:runId/rerun`.
2. Cache the result: 404/501 → hide button (stale forever); 200/202 → show button.
3. Use React Query's `enabled` + `staleTime: Infinity` to avoid repeated probes.

**Alternatives considered**:
- Hardcode button visibility behind a config flag — requires manual toggle, not self-discovering.
- Check a `/v1/capabilities` endpoint — doesn't exist, would require backend work.
- Always show button and handle errors inline — confusing for operators when endpoint doesn't exist.

## R3: request_id Capture Strategy

**Decision**: Module-level `lastRequestId` variable in `inventory-delta.ts`.

**Rationale**: The response envelope's `request_id` is currently parsed by Zod but discarded when the API client extracts `data`. Changing the return type of all API methods to `{ data, requestId }` would break every consumer (hooks, tests, components). Instead:

- Add `let lastRequestId: string | undefined` in `inventory-delta.ts`.
- Set it inside `getLatest()` and `getBySession()` after successful Zod parse.
- Export `getLastRequestId()` getter.
- `RunDebugInfo` component calls `getLastRequestId()` on render.

This is intentionally simple. If request_id needs to be per-query in the future, it can be refactored into the hook return value with minimal blast radius.

**Alternatives considered**:
- Return tuple `{ data, requestId }` — breaks all consumers, over-engineered for current need.
- Store in React Context — overkill for a single debug display.
- Store in Zustand — mixing server metadata with client state.

## R4: Copy-to-Clipboard Browser API

**Decision**: Use `navigator.clipboard.writeText()` directly.

**Rationale**: The PiDashboard targets Chromium-based browsers on the local network. `navigator.clipboard.writeText()` is supported in all Chromium versions since Chrome 66 (2018). No polyfill or library needed.

**Pattern**:
```typescript
async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  toast.success('Copied');
}
```

**Alternatives considered**:
- `copy-to-clipboard` npm package — unnecessary dependency for a one-liner.
- `document.execCommand('copy')` — deprecated.

## R5: Stale Analysis Detection

**Decision**: Client-side timer comparison, matching existing `isStaleCapture()` pattern.

**Rationale**: The existing sessions API already uses a 5-minute stale threshold (`STALE_THRESHOLD_MS` in `sessions.ts`). The spec requires a similar "stale analysis" warning when processing exceeds 5 minutes. We derive this from `metadata.created_at` on `processing` status runs.

```typescript
const isStaleProcessing = run.status === 'processing' &&
  Date.now() - new Date(run.metadata.created_at).getTime() > 5 * 60 * 1000;
```

No backend change needed — this is a pure client-side derivation.

## R6: Empty Delta Approval UX

**Decision**: Modify `InventoryReviewForm` guard condition to render for empty deltas.

**Rationale**: Currently, the form checks `run.review !== null` and `run.status` to decide visibility, but the parent `InventoryRunDetail` conditionally shows the delta table OR a "No delta data available" message. The review form should appear regardless of delta presence when the run is in a reviewable state.

**Change**: In `InventoryRunDetail.tsx`, show `InventoryReviewForm` whenever `!data.review && (data.status === 'done' || data.status === 'needs_review')` — regardless of whether `data.delta` is present or empty. The form's "Approve" action already handles empty corrections.

## R7: Auth Error Handling in Inventory Context

**Decision**: Catch 401/403 from any inventory API call and show a specific banner message.

**Rationale**: The PiDashboard has no operator authentication, but the backend APIs may return 401/403 if the Pi's API key is expired or revoked. Currently, `shouldRetry()` in `queryClient.ts` already skips retries for 4xx errors. The enhancement is purely UI: detect `isAuthError()` on the error object and display a guidance banner in the drill-down.

The existing `V1ApiError` class already has `isAuthError()` method and `UNAUTHORIZED` error code. The `ERROR_MESSAGES` registry has the message. No new error infrastructure needed.
