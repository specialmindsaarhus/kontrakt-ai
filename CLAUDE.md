# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Status

**Last Updated:** 2025-12-17 (Phase 7 - Frontend Specifications Complete)
**GitHub Repository:** https://github.com/specialmindsaarhus/kontrakt-ai.git

**Completed Phases:**
- ✅ Phase 0-7: Backend, design, and specifications complete
- ⏳ **Next:** Phase 8 - Frontend Implementation

**System Status:** Backend complete | Visual design approved | Frontend specs complete | Ready for implementation

**What Works:**
- ✅ Complete document analysis workflow (Claude CLI)
- ✅ Multi-format report generation (PDF, Word, Markdown)
- ✅ Automatic file organization by client and date
- ✅ Persistent user settings
- ✅ Enhanced error handling with Danish messages
- ✅ Comprehensive logging system

**Known Issues:**
- ⚠️ Claude CLI analysis takes 1-5 minutes (not a bug, just slow - need progress UI)

For detailed phase completion summaries, see [HISTORY.md](./HISTORY.md).

## Key Files Reference

**Backend (Complete):**
- `src/services/analysis-runner.js` - Main orchestrator
- `src/adapters/claude-adapter.js` - Claude CLI integration
- `src/utils/report-generator.js` - PDF/Word/Markdown generation
- `src/utils/settings-manager.js` - Persistent settings
- `src/utils/output-manager.js` - File organization
- `src/utils/logger.js` - Logging and error handling
- `src/utils/prompt-loader.js` - System prompt loading
- `prompts/*.md` - 3 Danish system prompts

**Design & Specs (Complete):**
- `mockups/main-screen-v4.html` - Final approved interactive mockup
- `specs/ui-components.spec.md` - 15 React components
- `specs/state-management.spec.md` - Context + reducer architecture
- `specs/ipc-contracts.spec.md` - Secure Electron IPC
- `specs/user-flows.spec.md` - 10 user workflows

**Frontend (To Be Implemented):**
- `electron/preload.js` - IPC bridge (to implement)
- `electron/main.js` - Main process with IPC handlers (to update)
- `src/context/AppContext.jsx` - State management (to implement)
- `src/components/*.jsx` - UI components (to implement)
- `src/App.jsx` - Main app (to update)
- `src/index.css` - Styling (to update)

## Resuming Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Test Backend
```bash
node tests/test-end-to-end.js
```

### 3. View Design Mockup
Open `mockups/main-screen-v4.html` in browser to see approved design with all 6 UI states.

### 4. Review Specifications
- Read `specs/*.spec.md` for complete frontend requirements
- Reference `HISTORY.md` for phase-by-phase implementation details

## Project Overview

**Contract Reviewer** is an Electron desktop app that provides a GUI for reviewing franchise documents (contracts, manuals) using LLM CLI tools. Target user is a franchise consultant who needs professional, client-ready reports.

**Key Design Principles:**
- CLI-based (no API keys, leverages existing subscriptions)
- Local-first (client confidentiality, no cloud uploads)
- Multi-LLM support (Claude, Gemini*, OpenAI*)
- Professional output (PDF/Word reports)

*Future implementation

## Architecture

### System Layers

1. **CLI Layer** - Adapter pattern for multiple providers
2. **Prompt Layer** - 3 Danish system prompts
3. **Report Layer** - PDF/Word/Markdown generation
4. **Management Layer** - Settings, organization, logging
5. **Orchestration Layer** - Analysis runner (complete workflow)
6. **UI Layer** - Electron + React (to be implemented)

### Data Flow

```
User drops document → Select prompt → Analysis Runner executes:
  1. Validate inputs
  2. Detect CLI
  3. Load prompt
  4. Execute CLI
  5. Generate reports (PDF/Word/Markdown)
  6. Organize output (client/date folders)
  7. Update settings
  8. Return results
```

### File Organization

```
Project Files:
├── electron/           # Main process + IPC
├── src/
│   ├── adapters/       # CLI adapters
│   ├── services/       # Analysis runner
│   ├── utils/          # Settings, output, logging, prompts, reports
│   ├── context/        # React Context (to implement)
│   └── components/     # React components (to implement)
├── prompts/            # Danish system prompts
├── specs/              # Technical specifications
├── mockups/            # Visual design
└── tests/              # Test suite

User Files:
~/.contract-reviewer/
├── settings.json       # Persistent preferences
└── logs/app.log       # Application logs

Output:
output/
└── client-name/
    └── YYYY-MM-DD/
        └── reports.{pdf,docx,md}
```

## Important Implementation Notes

### Claude CLI Syntax

The actual Claude CLI syntax differs from initial assumptions:

**Correct Usage:**
```bash
claude --print --system-prompt "System prompt text" "User prompt with document content"
```

**Key Points:**
- NO `--files` flag - read file contents and pass as prompt text
- System prompt is passed as text, not file path
- Must use `--print` flag for non-interactive output
- Reference materials must be read and included in prompt

### Multi-CLI Integration

- Detect available CLIs: `which claude` / `which gemini` / `which openai`
- User must have at least one CLI installed
- Show only available CLIs in dropdown
- No API keys needed - leverages user's CLI subscriptions

### Report Generation

- PDF: Professional cover page, formatted content (pdfkit)
- Word: Editable DOCX with structured headings (docx package)
- Markdown: With metadata header for archiving
- All include branding, client name, date, document info

### Security & Privacy

- All processing happens locally (client confidentiality)
- No external API calls
- Clean up temporary files after processing
- Organized output by client/date for privacy

### Error Handling

- Danish error messages with recovery suggestions
- Common scenarios: CLI not found, auth required, file errors, timeout
- Graceful degradation (show raw output on parse errors)

## Development Commands

```bash
# Setup
npm install

# Development
npm run dev              # Vite dev server
npm run electron:dev     # Electron app with hot reload

# Testing
npm test                 # Vitest unit tests
node tests/test-*.js     # Individual integration tests

# Production
npm run build           # Build for production
npm run build:win       # Windows .exe installer
npm run build:mac       # macOS .dmg installer
```

## Design System (Phase 6)

**Mockup:** `mockups/main-screen-v4.html`

**Colors:**
```css
--primary-dark: #0d1321;      /* Dark blue-tinted black */
--primary-accent: #2563eb;    /* Blue for selected states */
--success-green: #10b981;     /* Vibrant green for success */
--error-red: #dc2626;         /* Strong red for errors */
--background-light: #FAFAFA;  /* Light gray background */
```

**Typography:**
- Font: Inter (Google Fonts)
- Weights: 400 (regular), 500 (medium), 600 (semi-bold)
- Typography-led design (text does more work than boxes)

**Key Design Decisions:**
- Light buttons with borders (reversed from dark outline)
- Solid borders with varying thickness for state (1px → 2px → 3px)
- Full-screen layout (no scrolling)
- Strategic color (neutral UI, color only for state)
- Lucide icons (professional SVG icons)

**Animations:**
- Checkmark pop: 600ms elastic bounce
- Progress bars: 400ms ease-out
- Button transitions: 400ms
- All defined in mockup

## Next Steps: Phase 8 Implementation

All specifications complete. Ready to implement frontend:

### 1. Setup Secure Electron IPC
- Implement `electron/preload.js` with contextBridge
- Add IPC handlers in `electron/main.js`
- Enable progress events for analysis
- Security: contextIsolation, sandbox mode

See: `specs/ipc-contracts.spec.md`

### 2. Implement State Management
- Create `src/context/AppContext.jsx`
- Reducer with 20+ action types
- Custom hooks (useAppState, useAppDispatch, useApp)
- Settings persistence

See: `specs/state-management.spec.md`

### 3. Build React Components
- Implement 15 components per spec
- Match mockup design exactly
- Add animations (checkmark, spinner, progress)
- Ensure accessibility

See: `specs/ui-components.spec.md`

### 4. Integrate & Style
- Connect components to Context
- Wire up user workflows
- Implement IPC communication
- Add styling matching mockup

See: `specs/user-flows.spec.md` + `mockups/main-screen-v4.html`

### 5. Testing
- Unit tests: Reducer logic, file validation
- Integration tests: Component interactions, IPC
- E2E tests: Critical user workflows

**Design Reference:** `mockups/main-screen-v4.html`
**Technical Reference:** `specs/*.spec.md`
**Backend Integration:** Use `src/services/analysis-runner.js` via IPC

## User Workflow (End Goal)

1. **Drop document** → File zone shows checkmark
2. **Select prompt** → Button turns dark (selected)
3. **Auto-start analysis** → Spinner + progress bars
4. **View results** → Preview with formatted output
5. **Export reports** → Download PDF/Word/Markdown
6. **Organized output** → `output/client-name/YYYY-MM-DD/`

**Key UX Decision:** Analysis auto-starts when file + prompt selected (no "Run" button needed).

## Additional Resources

- **HISTORY.md** - Detailed phase completion summaries
- **USAGE.md** - API examples and usage guide
- **specs/*.spec.md** - Complete technical specifications
- **mockups/main-screen-v4.html** - Interactive design mockup
