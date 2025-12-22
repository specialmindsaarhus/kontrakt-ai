# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Status

**Last Updated:** 2025-12-21
**GitHub Repository:** https://github.com/specialmindsaarhus/kontrakt-ai.git
**Platform:** Windows (macOS support pending)
**Status:** ✅ **PRODUCTION READY - Windows MVP v1.1**

### What Works Right Now

- ✅ Complete Electron GUI with drag-and-drop
- ✅ 3 Danish prompt types (Kontrakt, Manual, Compliance)
- ✅ Manual provider selection (Gemini, Claude, OpenAI)
- ✅ Both Claude and Gemini CLI working reliably (~60-130s analysis time)
- ✅ Real-time progress updates during analysis
- ✅ ESC key cancellation (graceful Ctrl+C + force kill)
- ✅ Settings modal with Phase 2 features:
  - ✅ Logo upload with 60x60px thumbnail preview
  - ✅ Format selection (PDF, Word, Markdown)
  - ✅ Auto-open toggle
  - ✅ Recent analyses list (5 most recent)
  - ✅ Reset to defaults button (with confirmation)
  - ✅ Auto-save with toast feedback
- ✅ Export to Word, PDF, Markdown (auto-open on button click)
- ✅ Auto-save settings (debounced 1s, asynchronous, persists between reloads)
- ✅ CLI provider detection
- ✅ Multi-format report generation (PDF, DOCX, MD)
- ✅ Automatic file organization by client and date (DD-MM-YYYY)
- ✅ ESLint code quality checks + pre-commit hooks
- ✅ Smoke test (30s rapid validation)

For detailed implementation history, see [HISTORY.md](./HISTORY.md).

---

## Product Roadmap

### ✅ Windows MVP v1.1 - Settings Phase 2 (COMPLETED 2025-12-21)

**Implemented:**
1. ✅ Logo thumbnail preview (60x60px, replaces filename text)
2. ✅ Reset to defaults button (with confirmation dialog)

**Success Criteria Met:**
- ✅ All settings persist across restarts
- ✅ Logo preview shows actual image before saving
- ✅ Reset button restores factory defaults:
  - K logo (no custom logo)
  - All 3 formats selected (PDF, Word, Markdown)
  - Auto-open disabled
  - Recent provider empty
  - Recent analyses empty
- ✅ Settings auto-save with debouncing (1s delay)

**Changes from Original Plan:**
- ❌ Company name removed (didn't work as expected)
- ❌ Color picker deferred to future release
- ❌ Contact info deferred to future release

---

### 🎯 Windows MVP v1.2 - Provider Abstraction
**Target:** Before OpenAI adapter
**Estimated Effort:** 20-24 hours
**Specs:**
- Main: `specs/provider-abstraction.spec.md`
- Supplemental:
  - `specs/provider-abstraction-cli-pattern.spec.md` - Base CLI provider pattern
  - `specs/provider-abstraction-error-mapping.spec.md` - Error classification guide
  - `specs/provider-abstraction-testing.spec.md` - Test strategy & requirements
  - `specs/provider-abstraction-migration.spec.md` - Step-by-step migration guide

**Must-Haves:**
1. Refactor adapters to stateless provider interface
2. Standardized error handling across all providers
3. Provider capability detection (streaming, max tokens, etc.)
4. Unified progress reporting interface
5. Automated adapter tests (all providers)

**Why This Matters:**
- **Current Problem:** Adapters tightly coupled to CLI syntax and file paths
- **Solution:** Clean interface makes adding new providers trivial
- **Future Benefit:** Easy to add APIs, local models, web sessions

**Success Criteria:**
- Adding new provider requires <2 hours
- All existing functionality works unchanged
- No performance regression
- Test coverage >90%

---

### 🎯 Windows MVP v1.3 - Custom Instructions
**Target:** After provider abstraction
**Estimated Effort:** 16-20 hours
**Spec:** `specs/provider-custom-instructions.spec.md`

**Must-Haves:**
1. Separate `provider-configs/` directory for runtime analysis instructions
2. Per-provider instruction files (claude-instructions.md, gemini-instructions.md)
3. Settings UI for editing provider instructions
4. Validation and error handling
5. Default instructions bundled with app

**Why This Matters:**
- **Current Problem:** Development CLAUDE.md causes errors when Claude CLI reads it during analysis
- **Solution:** Separate user-facing instructions from dev instructions
- **Future Benefit:** Users can customize LLM behavior without modifying code

**Success Criteria:**
- CLAUDE.md never read by runtime analysis
- Users can edit instructions via GUI
- Changes apply to next analysis (not current)
- Default instructions always available (reset button)

---

### 🍎 macOS Beta Release
**Target:** After Windows v1.2
**Estimated Effort:** 38 hours (critical path only)

**Critical Must-Haves (Blocking Beta):**
1. Fix PATH environment loading from shell profile (12 hours)
   - Load `.zshrc` or `.bash_profile` before spawning CLIs
   - Fallback to common paths: `/opt/homebrew/bin`, `/usr/local/bin`, `~/.npm-global/bin`
2. CLI location fallback checks (8 hours)
   - Check Homebrew paths for Intel (x86_64) and Apple Silicon (ARM64)
   - Check npm global paths
3. Pre-flight CLI authentication check (6 hours)
   - Detect "auth required" errors
   - Show helpful Danish messages: "Åbn Terminal og kør: `claude login`"
4. Fix process group termination (8 hours)
   - Kill process group with `process.kill(-pid, 'SIGKILL')`
   - Prevent background processes after cancellation
5. Build universal binary (4 hours)
   - ARM64 + x86_64 support
   - No Rosetta 2 issues

**Success Criteria:**
- CLIs detected on fresh macOS install (Homebrew or npm)
- Analysis works on Intel and Apple Silicon Macs
- ESC cancellation kills all processes (no zombie CLIs)
- Auth errors show actionable guidance
- DMG installer works without Gatekeeper bypass

**Deferred to Production:**
- Code signing and notarization (8 hours) - works after Gatekeeper bypass
- Platform-specific data directories (4 hours) - nice-to-have
- Homebrew cask distribution (4 hours) - post-launch

---

### 🔮 Future Enhancements (Post-MVP)

**Not Scheduled Yet:**
- OpenAI CLI adapter (needs provider abstraction first)
- Manual start button (optional - user prefers auto-start)
- Better time estimates (based on file size, historical data)
- Chat feature (leverage Claude context bleed for personalized client analysis)
- Auto-updater (electron-updater package)
- First-run wizard and onboarding

---

## Project Overview

**Contract Reviewer** is an Electron desktop app that provides a GUI for reviewing franchise documents (contracts, manuals) using LLM CLI tools. Target user is a franchise consultant who needs professional, client-ready reports.

**Key Design Principles:**
- CLI-based (no API keys, leverages existing subscriptions)
  - *See ADR-001 for rationale and future HTTP session consideration*
- Local-first (client confidentiality, no cloud uploads)
- Multi-LLM support (Claude, Gemini, OpenAI*)
- Professional output (PDF/Word reports)

*Future implementation

---

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

---

## Key Files Reference

**Backend:**
- `src/services/analysis-runner.js` - Main orchestrator
- `src/adapters/claude-adapter.js` - Claude CLI integration
- `src/adapters/gemini-adapter.js` - Gemini CLI integration
- `src/utils/report-generator.js` - PDF/Word/Markdown generation
- `src/utils/settings-manager.js` - Persistent settings
- `src/utils/output-manager.js` - File organization
- `src/utils/logger.js` - Logging and error handling
- `src/utils/prompt-loader.js` - System prompt loading
- `prompts/*.md` - 3 Danish system prompts

**Frontend:**
- `electron/preload.js` - IPC bridge with contextBridge
- `electron/main.js` - Main process with 7 IPC handlers
- `src/context/AppContext.jsx` - State management (Context + useReducer)
- `src/components/*.jsx` - 15 UI components
- `src/App.jsx` - Main app with full integration
- `src/index.css` - Complete styling matching mockup

**Design & Specs:**
- `mockups/main-screen-v4.html` - Final approved interactive mockup
- `specs/ui-components.spec.md` - 15 React components (✅ implemented)
- `specs/settings-modal.spec.md` - Settings panel component (✅ implemented)
- `specs/state-management.spec.md` - Context + reducer architecture (✅ implemented)
- `specs/ipc-contracts.spec.md` - Secure Electron IPC (✅ implemented)
- `specs/user-flows.spec.md` - 10 user workflows (✅ implemented)
- `specs/progress-mapping.spec.md` - Progress animation timing (✅ implemented)
- `specs/provider-abstraction.spec.md` - LLM provider interface (❌ not implemented)
  - `specs/provider-abstraction-cli-pattern.spec.md` - CLI provider base class pattern
  - `specs/provider-abstraction-error-mapping.spec.md` - Error classification & Danish messages
  - `specs/provider-abstraction-testing.spec.md` - Test strategy & coverage requirements
  - `specs/provider-abstraction-migration.spec.md` - Step-by-step refactoring guide
- `specs/provider-custom-instructions.spec.md` - Custom instructions system (❌ not implemented)

---

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

---

## Important Implementation Notes

### Claude CLI Syntax

The actual Claude CLI syntax differs from initial assumptions:

**Correct Usage:**
```bash
# Stdin method (PREFERRED - avoids Windows CLI arg length limits)
echo "prompt" | claude --print --system-prompt "system prompt"

# Alternative (CLI args - only for short prompts)
claude --print --system-prompt "system prompt text" "user prompt"
```

**Key Points:**
- NO `--files` flag - read file contents and pass as prompt text
- System prompt is passed as text, not file path
- Must use `--print` flag for non-interactive output
- Always close stdin with `child.stdin.end()` to signal EOF

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

---

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

---

## Design System

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

---

## User Workflow (Current)

1. **Drop document** → File zone shows checkmark
2. **Select prompt** → Button turns dark (selected)
3. **Auto-start analysis** → Spinner + progress bars (3 stages)
4. **Success animation** → Bouncy green checkmark
5. **Export reports** → Click Word/PDF/Markdown buttons
6. **Organized output** → `output/client-name/DD-MM-YYYY/`

**Current UX:** Analysis auto-starts when file + prompt selected (no "Run" button).

---

## Additional Resources

**Documentation:**
- **HISTORY.md** - Detailed implementation history and bug fixes
- **USAGE.md** - API examples and usage guide
- **DEV-WORKFLOW.md** - Development best practices and workflow
- **CLAUDE-WORKFLOW.md** - AI assistant code quality checklist
- **PREVENTION-SETUP-COMPLETE.md** - Quality assurance setup guide
- **TROUBLESHOOTING.md** - Common issues and solutions

**Architecture Decisions:**
- **docs/architecture/** - Architecture Decision Records (ADRs)
- **docs/architecture/ADR-001-cli-vs-http-sessions.md** - CLI vs HTTP session approach

**Specifications:**
- **specs/*.spec.md** - Complete technical specifications
- **mockups/main-screen-v4.html** - Interactive design mockup

**Testing:**
- **tests/smoke-test.js** - 30s rapid validation test
- **tests/test-end-to-end.js** - Full integration test
- **TESTING-CHECKLIST.md** - MVP testing results and findings
