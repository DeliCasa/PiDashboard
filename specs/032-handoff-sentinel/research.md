# Research: Handoff Sentinel

**Feature**: 032-handoff-sentinel
**Date**: 2026-01-13
**Status**: Complete

## Research Questions

### 1. YAML Frontmatter Parsing Library

**Decision**: Use `gray-matter`

**Rationale**:
- Most popular frontmatter parser in Node.js ecosystem (17M weekly downloads)
- Already battle-tested in similar tools (Jekyll, Hugo, Gatsby)
- Supports custom delimiters if needed
- Returns both data (parsed YAML) and content (markdown body)
- TypeScript types available via `@types/gray-matter`

**Alternatives Considered**:
| Library | Why Rejected |
|---------|--------------|
| `yaml` + manual parsing | More code, error-prone delimiter handling |
| `front-matter` | Less popular, fewer features |
| `js-yaml` | Low-level, no frontmatter extraction |

**Usage Example**:
```typescript
import matter from 'gray-matter';

const { data, content } = matter(fileContents);
// data = { handoff_id: '031-...', status: 'new', ... }
// content = markdown body
```

---

### 2. File Glob Pattern Matching

**Decision**: Use `fast-glob`

**Rationale**:
- Faster than native `glob` package
- Cross-platform path handling
- Supports all required patterns (`**/*.md`, `HANDOFF_*.md`)
- Promise-based API (async/await friendly)
- Already used in many build tools (Vite, Rollup)

**Alternatives Considered**:
| Library | Why Rejected |
|---------|--------------|
| `glob` | Slower, callback-based API |
| `globby` | Wrapper around fast-glob, unnecessary layer |
| `fs.readdir` + manual filtering | More code, less maintainable |

**Patterns to Support**:
```typescript
const patterns = [
  'docs/HANDOFF_*.md',
  'docs/handoffs/**/*.md',
  'specs/**/HANDOFF*.md',
  'specs/**/handoff*.md',
];
```

---

### 3. Terminal Output Formatting

**Decision**: Use `chalk` for colors, built-in `console` for structure

**Rationale**:
- `chalk` is the standard for terminal colors in Node.js
- Already widely used, familiar to contributors
- Lightweight, no dependencies
- Supports both TTY and non-TTY output

**Output Format Design**:
```
┌─────────────────────────────────────────────────────────────┐
│ 📬 HANDOFF SENTINEL                                         │
├─────────────────────────────────────────────────────────────┤
│ ⚠️  2 unacknowledged handoffs require attention             │
│                                                             │
│ NEW:                                                        │
│   • 031-backend-gaps (2026-01-12) [api, deploy]            │
│     → PiOrchestrator backend implementation gaps            │
│                                                             │
│ IN PROGRESS:                                                │
│   • 030-recovery (2026-01-10) [ui, test]                   │
│     → Dashboard recovery verification                       │
└─────────────────────────────────────────────────────────────┘

Run 'npm run handoff:list' for details or edit status in frontmatter.
```

---

### 4. npm Script Hook Integration

**Decision**: Use `pre` hooks in package.json scripts

**Rationale**:
- Native npm feature, no extra dependencies
- Runs automatically before main script
- Familiar pattern for Node.js developers
- Can be bypassed with `--ignore-scripts` if needed

**Implementation**:
```json
{
  "scripts": {
    "predev": "node scripts/handoff/detect.js --quiet",
    "pretest": "node scripts/handoff/detect.js --quiet",
    "handoff:detect": "node scripts/handoff/detect.js",
    "handoff:generate": "node scripts/handoff/generate.js",
    "handoff:list": "node scripts/handoff/detect.js --verbose"
  }
}
```

**Alternatives Considered**:
| Approach | Why Rejected |
|----------|--------------|
| Husky pre-commit hook | Too late in workflow, want earlier detection |
| Custom Vite plugin | Overkill, adds complexity |
| Watch mode integration | Would slow down HMR |

---

### 5. State Persistence for "New Since Last Run"

**Decision**: JSON file (`.handoff-state.json`) in project root

**Rationale**:
- Simple, no database required
- Human-readable for debugging
- Can be gitignored (local state)
- Fast read/write for small data

**Schema**:
```typescript
interface HandoffState {
  lastRun: string;  // ISO timestamp
  seen: {
    [handoffId: string]: {
      status: string;
      lastSeen: string;
      hash: string;  // MD5 of content for change detection
    };
  };
}
```

**Storage Location**: Project root, added to `.gitignore`

---

### 6. CI Integration Approach

**Decision**: Exit codes + optional GitHub Actions workflow

**Rationale**:
- Exit code 0 = pass, 1 = fail (standard Unix convention)
- Works with any CI system (GitHub Actions, GitLab CI, Jenkins)
- No CI-specific code in scripts
- Optional GitHub Actions workflow as reference

**Flags**:
- `--strict`: Exit 1 if unacknowledged handoffs exist
- `--quiet`: No output on success (for CI logs)
- `--json`: Machine-readable output for tooling

---

### 7. Handoff Template Structure

**Decision**: Structured markdown with required sections

**Rationale**:
- Familiar format for developers
- Easy to read/edit manually
- Supports rich formatting (code blocks, tables)
- Frontmatter provides machine-readable metadata

**Template Sections**:
1. Frontmatter (YAML)
2. Summary (1-2 paragraphs)
3. Requirements (bulleted list with types)
4. Contract Changes (before/after code blocks)
5. Acceptance Criteria (numbered list)
6. Verification Steps (checklist)
7. Risks (optional)
8. Notes (optional)

---

### 8. TypeScript vs JavaScript

**Decision**: TypeScript with tsx for direct execution

**Rationale**:
- Type safety for complex data structures (frontmatter schema)
- Better IDE support and refactoring
- Consistent with existing PiDashboard codebase
- `tsx` allows running .ts files directly without build step

**Alternatives Considered**:
| Approach | Why Rejected |
|----------|--------------|
| Plain JavaScript | Loses type safety benefits |
| Compile to JS first | Extra build step, slower development |
| Bun runtime | Not standard in project |

---

### 9. Validation Library for Frontmatter

**Decision**: Zod for runtime schema validation

**Rationale**:
- Already used in PiDashboard API contracts
- TypeScript-first with type inference
- Excellent error messages
- Composable schema definitions

**Schema Definition**:
```typescript
import { z } from 'zod';

const HandoffSchema = z.object({
  handoff_id: z.string().regex(/^\d{3}-[a-z-]+$/),
  direction: z.enum(['incoming', 'outgoing']),
  from_repo: z.string(),
  to_repo: z.string(),
  created_at: z.string().datetime(),
  status: z.enum(['new', 'acknowledged', 'in_progress', 'done', 'blocked']),
  // Optional fields...
});
```

---

### 10. Claude Code Skill vs npm Script

**Decision**: Both - npm script primary, Claude skill optional

**Rationale**:
- npm script works for all developers (no Claude Code required)
- Claude skill provides interactive generation experience
- Skill can invoke npm script under the hood
- Maintains flexibility for different workflows

**Skill Path**: `.claude/skills/handoff-generate.md`

---

## Dependency Summary

| Package | Purpose | Version |
|---------|---------|---------|
| `gray-matter` | YAML frontmatter parsing | ^4.0.3 |
| `fast-glob` | File pattern matching | ^3.3.2 |
| `chalk` | Terminal colors | ^5.3.0 |
| `zod` | Schema validation | (existing) |
| `tsx` | TypeScript execution | (dev, existing or add) |

## Implementation Notes

1. **Startup Performance**: Detection script should complete in <500ms for empty results. Use lazy loading for heavy dependencies.

2. **Error Handling**: Invalid frontmatter should warn but not crash. Continue processing other files.

3. **Encoding**: Assume UTF-8 for all handoff files. Handle BOM if present.

4. **Path Normalization**: Use `path.normalize()` to handle Windows vs Unix paths.

5. **Concurrent Reads**: Use `Promise.all()` for parallel file reading to improve performance.
