---
description: Generate a new outgoing handoff document for PiOrchestrator
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Handoff Generator

Generate a standardized handoff document for cross-repo communication with PiOrchestrator.

## Instructions

1. First, gather information about the handoff from the user:
   - Feature number (e.g., 031)
   - Short slug (e.g., backend-gaps)
   - Title (e.g., "PiOrchestrator Backend Gaps")
   - Priority (High/Medium/Low)
   - Brief summary of what needs to change

2. Ask about requirements - what types of changes are needed:
   - `api` - Backend API changes
   - `route` - Route/endpoint changes
   - `ui` - UI changes in the other repo
   - `deploy` - Deployment/configuration changes
   - `test` - Test requirements
   - `docs` - Documentation updates

3. Ask about acceptance criteria - what specific conditions must be met.

4. Run the generator:
   ```bash
   npx tsx scripts/handoff/generate.ts \
     --feature <NUM> \
     --slug <SLUG> \
     --title "<TITLE>" \
     --to PiOrchestrator \
     --priority <PRIORITY>
   ```

5. Read the generated file and help the user fill in the details:
   - Summary section
   - Requirements with current/required state code blocks
   - Acceptance criteria checkboxes
   - Verification commands
   - Risk mitigation table
   - Related files table

6. Run detection to verify:
   ```bash
   npm run handoff:detect
   ```

## Output Format

The generated file will be at `docs/HANDOFF_<NUM>_<SLUG>.md` with:
- YAML frontmatter with all required fields
- Markdown body with structured sections
- TODO placeholders for user to fill in

## Example

User: "I need to create a handoff for feature 032 about implementing real WiFi scanning"

Generated: `docs/HANDOFF_032_WIFI_SCANNING.md`
