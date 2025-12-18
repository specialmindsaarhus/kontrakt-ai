# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Status

**Last Updated:** 2025-12-18 (GUI Testing & Quality Assurance Complete)
**GitHub Repository:** https://github.com/specialmindsaarhus/kontrakt-ai.git

**Completed Phases:**
- ✅ **Phase 0-8:** Complete application (backend + frontend + IPC)
- ✅ **Gemini CLI Integration:** Full Gemini support with stdin input method
- ✅ **MVP Testing:** Complete end-to-end workflow tested and working
- ✅ **GUI Testing & Polish:** User testing complete, UX improvements implemented
- ✅ **Quality Assurance:** ESLint, pre-commit hooks, automated testing
- ⏳ **Next:** Manual start button, ESC key cancel, Settings modal

**System Status:** ✅ **PRODUCTION READY** - Fully tested with quality assurance in place!

**Recent Changes (GUI Testing & QA Session 2025-12-18 Evening):**
- ✅ Fixed checkmark display (now shows immediately after file upload, not just after analysis)
- ✅ Fixed progress bar animation (smooth incremental updates, no "stuck" appearance)
- ✅ Improved progress stage timing (mapped to actual workflow: 20%, 60%, 20% not equal thirds)
- ✅ Changed date format from YYYY-MM-DD to DD-MM-YYYY (Danish standard)
- ✅ Fixed janky border animation on button selection (consistent 2px borders + lift effect)
- ✅ Fixed scoping bug in analysis-runner.js (cliResult variable scope)
- ✅ **MAJOR:** Set up ESLint with React support (catches undefined variables, scoping issues)
- ✅ **MAJOR:** Set up Husky pre-commit hooks (auto-validates before commits)
- ✅ **MAJOR:** Created smoke test for rapid validation (30s full workflow test)
- ✅ Created comprehensive development workflow documentation
- ✅ All code changes now validated with ESLint + smoke test before completion

**Recent Changes (MVP Testing Session 2025-12-18 Morning):**
- ✅ Fixed provider selection priority (Gemini → Claude → OpenAI)
- ✅ Fixed ES module error in analysis-runner.js (require → import)
- ✅ Fixed export button auto-open functionality
- ✅ Successful end-to-end test with Gemini (~72 seconds)
- ✅ All 3 report formats generated successfully (PDF, DOCX, MD)
- ✅ Added ProviderSelector component to UI specs (future implementation)
- ✅ Updated cli-detector.js with provider priority order

**Recent Changes (Debugging Session 2025-12-17 Evening):**
- ✅ Fixed IPC error serialization (plain objects → Error objects)
- ✅ Fixed metadata undefined errors (added success check + optional chaining)
- ✅ Created Gemini CLI adapter with stdin support
- ✅ Fixed ES module errors (require → import)
- ✅ Increased timeout to 5 minutes (Gemini takes ~2.7 min)
- ✅ Added comprehensive debug logging throughout
- ✅ Added Content-Security-Policy (production only)
- ✅ Created TROUBLESHOOTING.md with all lessons learned

**Recent Changes (Session 2025-12-17 Morning):**
- ✅ Phase 8 Part 1: Secure IPC + State Management (commit `19c8adf`)
  - Created electron/preload.js with contextBridge IPC API
  - Updated electron/main.js with 7 IPC handlers
  - Created src/context/AppContext.jsx with complete state management
- ✅ Phase 8 Part 2: 15 React components + styling (commit `109096e`)
  - Created all 15 components in src/components/
  - Updated src/App.jsx with full integration
  - Complete styling in src/index.css matching mockup
- ✅ Bug Fix: listAvailablePrompts function name (commit `1dac0a2`)
- ✅ Bug Fix: Progress callback + result format (commit `543726e`)
  - Added progressCallback parameter to analysis-runner.js
  - Fixed result format transformation in IPC handler
  - Added progress updates at 8 key stages

**What Works:**
- ✅ Complete Electron GUI with drag-and-drop
- ✅ 3 Danish prompt types (Kontrakt, Manual, Compliance)
- ✅ Real-time progress updates during analysis (smooth, incremental, mapped to actual timing)
- ✅ Checkmark appears immediately after file upload
- ✅ Success animation (bouncy checkmark with elastic bounce)
- ✅ Error handling with Danish messages + retry
- ✅ Export to Word, PDF, Markdown (auto-open on button click)
- ✅ Auto-save settings (debounced)
- ✅ CLI provider detection (Claude Code, Gemini, OpenAI)
- ✅ **Gemini CLI integration** (stdin method, ~90 sec analysis)
- ✅ Complete document analysis workflow
- ✅ Multi-format report generation (PDF, DOCX, MD)
- ✅ Automatic file organization by client and date (DD-MM-YYYY format)
- ✅ Comprehensive error handling and debug logging
- ✅ **ESLint code quality checks** (catches scoping issues, undefined variables)
- ✅ **Pre-commit hooks** (auto-validates before commits)
- ✅ **Smoke test** (30s rapid validation of full workflow)

**Known Issues & TODO:**
- 🎯 **HIGH PRIORITY:** Add ProviderSelector UI component (spec ready in specs/ui-components.spec.md)
- ⚠️ Temporary: Provider order hardcoded in cli-detector.js (Gemini → Claude → OpenAI)
- ⚠️ Hamburger menu does nothing (settings modal not implemented)
- ⚠️ Auto-start behavior (should be manual with Start button)
- ⚠️ No ESC key to cancel analysis
- 📋 **Future:** OpenAI CLI support
- 📋 **Future:** Leverage Claude context bleed for personalized client analysis (chat feature)

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
- `specs/progress-mapping.spec.md` - Progress animation timing specification

**Frontend (Complete):**
- `electron/preload.js` - IPC bridge with contextBridge
- `electron/main.js` - Main process with 7 IPC handlers
- `src/context/AppContext.jsx` - State management (Context + useReducer)
- `src/components/*.jsx` - 15 UI components
- `src/App.jsx` - Main app with full integration
- `src/index.css` - Complete styling matching mockup

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
6. **UI Layer** - Electron + React (complete)

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
│   ├── context/        # React Context (AppContext.jsx)
│   └── components/     # React components (15 components)
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
    └── DD-MM-YYYY/
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

# Code Quality (Run after making changes!)
npm run lint             # Check code with ESLint (catches scoping issues!)
npm run lint:fix         # Auto-fix simple ESLint issues

# Testing
npm run test:smoke       # Quick 30s validation (run after backend changes)
npm run test:integration # Full end-to-end test (run before commits)
npm test                 # Vitest unit tests

# Production
npm run build           # Build for production
npm run build:win       # Windows .exe installer
npm run build:mac       # macOS .dmg installer
```

## Quality Assurance

**ESLint Configuration:** `eslint.config.js`
- ✅ Catches undefined variables (prevents scoping bugs!)
- ✅ Warns on unused variables
- ✅ React/JSX support with hooks validation
- ✅ Configured for Node.js + Browser + Electron

**Pre-commit Hooks:** `.husky/pre-commit`
- ✅ Auto-runs ESLint before every commit
- ✅ Auto-runs smoke test before every commit
- ✅ Blocks commits if either fails
- ⚠️ Use `git commit --no-verify` only in emergencies

**Smoke Test:** `tests/smoke-test.js`
- ✅ 30-second full workflow validation
- ✅ Tests: file upload → analysis → report generation
- ✅ Catches runtime errors before they reach production

**Development Workflow:** See `DEV-WORKFLOW.md` and `CLAUDE-WORKFLOW.md`
- Comprehensive best practices
- Common error patterns to avoid
- Pre-commit checklist
- Refactoring safety guidelines

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

## Next Steps: Testing & Feature Enhancements

Phase 8 (Frontend Implementation) is complete! MVP awaiting approval.

### ✅ Full Flow Testing Complete (2025-12-18)

**MVP Testing Results:**
- ✅ File upload via GUI (drag-and-drop) - Working
- ✅ Complete workflow: Upload → Select prompt → Analysis → Reports generated - Working
- ✅ All 3 output formats (PDF, Word, Markdown) created correctly
- ✅ Files accessible and properly organized
- ✅ Test with sample contract document (tests/sample-contract.txt) - Success
- ✅ Validated organized output structure (output/unnamed-client/2025-12-18/)
- ✅ Gemini execution time: ~72 seconds (1:12)
- ✅ Report sizes: PDF (6.7 KB), DOCX (10 KB), MD (6.3 KB)
- **Status:** ✅ **MVP APPROVED** - Core functionality working!

### Immediate TODO (User Requests - After MVP Approval)

1. **ESC Key to Cancel Analysis**
   - Add ESC key handler during analysis
   - Show confirmation dialog: "Vil du afslutte analyse?"
   - Return to ready-to-start state (file uploaded, can restart or upload new)
   - Implement cancel IPC method

2. **Manual Start Button**
   - Remove auto-start behavior
   - Add 'ready-to-start' state
   - Show Start button inside drop zone when file + prompt selected
   - User explicitly clicks to begin analysis

3. **Settings Modal (Hamburger Menu)**
   - Implement settings UI
   - Branding configuration (company name, colors)
   - Output preferences (default formats, organization)
   - CLI provider preferences

4. **Better Time Estimates**
   - Show estimated time based on file size
   - Display remaining time during analysis
   - Learn from past analyses for better predictions

### Testing & Polish

- Real document testing with franchise consultants
- Performance optimization for large files
- Error message refinement based on user feedback
- Accessibility testing with screen readers

**Current Status:** ✅ **MVP COMPLETE AND TESTED** - Ready for feature enhancements

## User Workflow (Current)

1. **Drop document** → File zone shows checkmark
2. **Select prompt** → Button turns dark (selected)
3. **Auto-start analysis** → Spinner + progress bars (3 stages)
4. **Success animation** → Bouncy green checkmark
5. **Export reports** → Click Word/PDF/Markdown buttons
6. **Organized output** → `output/client-name/YYYY-MM-DD/`

**Current UX:** Analysis auto-starts when file + prompt selected (no "Run" button).
**Planned Change:** Manual Start button (user explicitly clicks to begin analysis).

## Additional Resources

**Documentation:**
- **HISTORY.md** - Detailed phase completion summaries
- **USAGE.md** - API examples and usage guide
- **DEV-WORKFLOW.md** - Development best practices and workflow
- **CLAUDE-WORKFLOW.md** - AI assistant code quality checklist
- **PREVENTION-SETUP-COMPLETE.md** - Quality assurance setup guide
- **TROUBLESHOOTING.md** - Common issues and solutions

**Specifications:**
- **specs/*.spec.md** - Complete technical specifications
- **specs/progress-mapping.spec.md** - Progress animation timing details
- **mockups/main-screen-v4.html** - Interactive design mockup

**Testing:**
- **tests/smoke-test.js** - 30s rapid validation test
- **tests/test-end-to-end.js** - Full integration test
- **TESTING-CHECKLIST.md** - MVP testing results and findings
