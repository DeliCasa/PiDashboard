# Research: ESP Camera Integration via PiOrchestrator

**Feature**: 034-esp-camera-integration
**Date**: 2026-01-14
**Status**: Complete

## Research Tasks

### 1. V1 Cameras API Contract

**Question**: What is the exact API contract for PiOrchestrator V1 cameras endpoints?

**Findings**: Based on spec requirements and handoff document pattern:

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/v1/cameras` | GET | - | `{ cameras: Camera[], count: number }` |
| `/api/v1/cameras/:id` | GET | - | `Camera` |
| `/api/v1/cameras/diagnostics` | GET | - | `CameraDiagnostics[]` |
| `/api/v1/cameras/:id/capture` | POST | - | `{ success: boolean, image: string (base64), timestamp: string, camera_id: string }` |
| `/api/v1/cameras/:id/reboot` | POST | - | `{ success: boolean, message?: string }` |

**Decision**: Use envelope response pattern consistent with existing V1 API (see `src/infrastructure/api/v1-client.ts`).

**Rationale**: Maintains consistency with existing V1 error handling and response parsing.

**Alternatives considered**:
- Direct array responses (rejected: inconsistent with V1 patterns)
- GraphQL (rejected: overkill for simple CRUD operations)

---

### 2. Base64 Image Rendering Best Practices

**Question**: How to efficiently render and download base64 JPEG images in React?

**Findings**:

**Rendering**: Direct data URL in `<img>` tag is supported by all modern browsers.
```html
<img src="data:image/jpeg;base64,{base64string}" alt="Capture" />
```

**Download**: Convert base64 to Blob, create object URL, trigger download.
```typescript
function downloadBase64Image(base64: string, filename: string): void {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/jpeg' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

**Decision**: Create `src/lib/download.ts` with `downloadBase64Image` utility function.

**Rationale**: Reusable utility, clean separation from component logic.

**Alternatives considered**:
- Using `FileSaver.js` library (rejected: simple enough to implement directly)
- Using `fetch()` with data URL (rejected: unnecessary network abstraction)

---

### 3. TanStack Query Polling with Visibility Detection

**Question**: How to pause polling when browser tab is hidden?

**Findings**:

TanStack Query v5 supports `refetchInterval` that can be a function:
```typescript
useQuery({
  queryKey: ['cameras'],
  queryFn: fetchCameras,
  refetchInterval: (query) => {
    // Return false to disable, number for interval
    return document.hidden ? false : 10000;
  },
});
```

However, this doesn't immediately pause when tab becomes hidden. Better approach is combining with a visibility hook:

```typescript
function useDocumentVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handler = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return isVisible;
}

// In component
const isVisible = useDocumentVisibility();
const { data } = useCameras({
  pollingInterval: isVisible ? 10000 : false
});
```

**Decision**: Create `useDocumentVisibility` hook in `src/application/hooks/`. Update `useCameras` to accept `enabled` or `pollingInterval` that respects visibility.

**Rationale**: Clean separation, reusable for other polling hooks.

**Alternatives considered**:
- Using `refetchInterval` function (rejected: doesn't immediately pause)
- Using third-party library (rejected: simple enough to implement)

---

### 4. Modal Dialog Patterns in Existing Codebase

**Question**: What patterns does the codebase use for modal dialogs?

**Findings**:

Existing patterns from `CameraSection.tsx`:
```tsx
<Dialog
  open={captureState !== null}
  onOpenChange={(open: boolean) => !open && setCaptureState(null)}
>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Capture Preview</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

For confirmation dialogs, use `AlertDialog` from Radix UI:
```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
```

**Decision**: Use `Dialog` for camera detail view, `AlertDialog` for reboot confirmation.

**Rationale**: Follows established patterns, Radix UI handles accessibility.

**Alternatives considered**:
- Custom modal (rejected: Radix UI handles focus management, keyboard nav)
- Inline confirmation (rejected: destructive action needs explicit confirmation)

---

### 5. Error Handling Patterns

**Question**: How does the codebase handle API errors in hooks?

**Findings**:

From `src/infrastructure/api/errors.ts`:
- `V1ApiError` class with `code`, `message`, `retryable`, `retryAfterSeconds`
- `getErrorCategory()` for UI styling
- `getUserMessage()` for user-friendly messages

From `src/lib/queryClient.ts`:
- `shouldRetry()` function checks error type
- Don't retry 4xx errors
- Retry network/timeout/5xx errors

Hook pattern:
```typescript
const { data, isLoading, error, refetch } = useQuery({...});

// In component
if (error) {
  return <ErrorDisplay error={error} onRetry={refetch} />;
}
```

**Decision**: Use existing error infrastructure. Add camera-specific error codes if needed (CAMERA_OFFLINE, CAMERA_NOT_FOUND).

**Rationale**: Consistent error UX across the dashboard.

**Alternatives considered**:
- Custom error boundary per camera (rejected: overkill)
- Silent error logging (rejected: spec requires user feedback)

---

### 6. Diagnostics JSON Display

**Question**: How to display large JSON payloads without freezing the browser?

**Findings**:

For JSON under 1MB (typical diagnostics size):
- Simple `<pre>` with syntax highlighting is sufficient
- Use `JSON.stringify(data, null, 2)` for formatting

For search/filter:
- Filter locally with regex on stringified JSON
- Highlight matches with `<mark>` tags

For copy to clipboard:
```typescript
await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
toast.success('Copied to clipboard');
```

**Decision**: Use simple `<pre>` with Tailwind styling. Add search input that filters visible content. Use Clipboard API for copy.

**Rationale**: Simple solution covers spec requirements. Virtualization only if performance issues observed.

**Alternatives considered**:
- `react-json-view` library (rejected: adds dependency, overkill for read-only display)
- Virtual scrolling (rejected: premature optimization)

---

## Summary of Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| API Client | Create new `v1-cameras.ts` | Clean V1 implementation, parallel support |
| Base64 Download | Create `download.ts` utility | Reusable, clean separation |
| Polling Visibility | Create `useDocumentVisibility` hook | Immediate pause when tab hidden |
| Camera Detail | Use `Dialog` modal | Consistent with existing patterns |
| Reboot Confirm | Use `AlertDialog` | Accessibility-ready confirmation |
| Error Handling | Use existing infrastructure | Consistent UX |
| Diagnostics | Simple `<pre>` with search | Sufficient for expected payload sizes |

## Open Questions Resolved

All NEEDS CLARIFICATION items from Technical Context have been resolved through this research. No blocking unknowns remain.
