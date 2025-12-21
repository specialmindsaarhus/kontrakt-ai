# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Status

**Last Updated:** 2025-12-21 (Logo Loading Fix + Settings Modal Complete)
**GitHub Repository:** https://github.com/specialmindsaarhus/kontrakt-ai.git

**Completed Phases:**
- ✅ **Phase 0-8:** Complete application (backend + frontend + IPC)
- ✅ **Gemini CLI Integration:** Full Gemini support with stdin input method
- ✅ **Claude CLI Integration:** Full Claude support with stdin input method
- ✅ **MVP Testing:** Complete end-to-end workflow tested and working
- ✅ **GUI Testing & Polish:** User testing complete, UX improvements implemented
- ✅ **Quality Assurance:** ESLint, pre-commit hooks, automated testing
- ✅ **ProviderSelector UI:** Manual LLM provider selection
- ✅ **ESC Key Cancellation:** Graceful cancellation with Ctrl+C signal
- ✅ **CLI Timeout Fix:** Both Gemini and Claude working reliably (~60-130s)
- ✅ **Settings Modal:** Full implementation with verified non-blocking architecture (2025-12-21)
- ✅ **Logo Loading Fix:** IPC-based logo loading with base64 data URLs (2025-12-21)
- 🎯 **Next:** Settings modal Phase 2 (company name, color picker, contact info)

**System Status:** ✅ **PRODUCTION READY** - Both CLIs working reliably!

## Recent Critical Fix (2025-12-21)

**Problem:** Both Claude and Gemini CLI adapters were timing out (300s) during analysis, even though the CLIs themselves worked fine when tested directly.

**Root Cause:**
1. **Claude adapter:** Passing 4.8KB prompt as CLI argument exceeded Windows command-line length handling capacity
2. **Gemini adapter:** Not closing stdin after writing prompt caused process to hang indefinitely waiting for more input

**Solution:**
- **Claude adapter:** Switched from CLI arguments to stdin method
  ```javascript
  // BEFORE (broken):
  const fullArgs = [...args, prompt];
  spawn(cliCommand, fullArgs);

  // AFTER (working):
  const child = spawn(cliCommand, args);
  child.stdin.write(prompt);
  child.stdin.end();  // Critical!
  ```

- **Gemini adapter:** Added `child.stdin.end()` after writing prompt
  ```javascript
  child.stdin.write(prompt);
  child.stdin.end();  // CRITICAL: Signals input complete
  ```

**Results:**
- ✅ **Gemini:** Analysis completes in ~68 seconds (was timing out after 300s)
- ✅ **Claude:** Analysis completes in ~129 seconds (was timing out after 300s)
- ✅ **Both CLIs:** Now work reliably without timeouts
- ✅ **Output quality:** Claude produces ~2x more detailed analysis (12KB vs 7KB)

**Files Modified:**
- `src/adapters/claude-adapter.js` - stdin method instead of CLI arguments
- `src/adapters/gemini-adapter.js` - added stdin.end() call

**Key Learnings:**
1. **Stdin method is superior:** Avoids Windows CLI argument length limits
2. **Always close stdin:** `child.stdin.end()` signals EOF to child process
3. **`--system-prompt` flag prevents CLAUDE.md conflicts:** Development instructions in CLAUDE.md don't interfere with runtime analysis

**Testing:**
- ✅ Direct CLI test: `cat prompt | claude --print` worked (60s)
- ✅ App with fix: Both CLIs complete successfully
- ✅ No more "Analysen tog for lang tid" errors

---

## Settings Modal Implementation (2025-12-21)

**Status:** ✅ **COMPLETE AND VERIFIED NON-BLOCKING**

### Implementation Summary

The settings modal was already 95% complete (implemented earlier but temporarily disabled for testing). Re-enabled by uncommenting code in `src/App.jsx`.

### Architecture Verification ✅

**Confirmed:** Settings modal follows **settings.json approach** with NO backend interruption:

```
User changes setting in modal
    ↓
Modal calls onSettingChange(key, value)
    ↓
App.jsx dispatches to AppContext
    ↓
AppContext updates state + auto-saves to settings.json (debounced 1s)
    ↓
Backend reads settings.json at lifecycle points (analysis start, export, etc.)
```

**Key Benefits:**
- ✅ No tight coupling between UI and backend
- ✅ No race conditions (backend reads snapshot at analysis start)
- ✅ Single source of truth (settings.json file)
- ✅ Predictable behavior (changes apply to NEXT operation, not current)
- ✅ Fully asynchronous (no blocking I/O)

### Non-Blocking Tests Performed

**Test 1: Settings Changes During Running Analysis** ✅
- Opened modal while Claude analysis running (~4 minutes)
- Changed settings (formats, toggles)
- Analysis completed successfully without interruption
- Settings changes applied to NEXT analysis only

**Test 2: Modal Operations Are Non-Blocking** ✅
- Rapid checkbox toggling during analysis
- Progress bars continued smoothly
- No UI freezing or lag
- 400ms slide animations smooth

**Test 3: Auto-Save Debouncing** ✅
- Multiple rapid changes trigger single save (1s debounce)
- Toast notification appears after settling
- No excessive file writes
- Asynchronous I/O (non-blocking)

**Test 4: IPC Non-Blocking** ✅
- File picker (logo upload) doesn't block backend
- Recent analyses folder opening doesn't affect running analysis
- All IPC calls properly async

**Test 5: Settings Persistence** ✅
- Settings persist across app restarts
- Backend reads fresh settings.json at each analysis start
- No stale cache issues

### Files Modified

1. **src/App.jsx** - Uncommented lines 9 and 206-219 (re-enabled modal)

### Files Already Complete (No Changes Needed)

- `src/components/SettingsModal.jsx` - Full implementation (logo, formats, recent analyses)
- `src/context/AppContext.jsx` - Auto-save with debouncing
- `src/utils/settings-manager.js` - File I/O handling
- `electron/preload.js` - IPC handlers (selectFile, openPath)
- `electron/main.js` - IPC implementations
- `src/index.css` - Complete modal styling (480px panel, animations)

### Performance Results

**Analysis Performance (Unaffected):**
- Gemini: ~60-97 seconds (consistent with modal open/closed)
- Claude: ~128-245 seconds (varies by response length, not modal state)
- No timeout errors during modal usage
- No IPC blocking detected

**UI Performance:**
- Modal animations: Smooth 60fps (CSS transforms)
- Toast notifications: 2s display, fade in/out
- Debounced saves: 1s delay prevents excessive writes

### Current Capabilities

**Settings Modal Features (Phase 1 - MVP):**
- ✅ Logo upload with file picker
- ✅ Default formats multi-select (PDF, Word, Markdown)
- ✅ Auto-open toggle
- ✅ Last provider display (read-only)
- ✅ Recent analyses list (5 most recent, clickable to open folder)
- ✅ Auto-save with toast feedback ("Gemt")
- ✅ Three close methods (X button, ESC key, click outside)
- ✅ Smooth 400ms slide-in/out animation

**Future Enhancements (Phase 2):**
- ⏳ Company name input
- ⏳ Primary color picker
- ⏳ Contact info fields
- ⏳ Logo thumbnail preview (instead of filename)
- ⏳ Reset to defaults button

### Key Learnings

1. **Settings.json is the single source of truth** - All systems read from file
2. **Debouncing prevents excessive writes** - 1s delay after last change
3. **Snapshot at analysis start** - Settings immutable during execution
4. **Async IPC is critical** - All file operations return Promises
5. **CSS transforms > position** - Smooth 60fps animations

---

## Logo Loading Fix (2025-12-21)

**Status:** ✅ **FIXED - Logo displays correctly from settings**

### Problem

Logo selected in settings modal was not displaying in the GUI header - always showed fallback "K" logo instead.

**Root Cause:**
- Electron's sandbox mode (enabled in `electron/main.js:20`) blocks renderer process from accessing `file://` URLs directly
- Logo component attempted to load images using `file:///C:/path/to/logo.jpg` format
- Security policy prevented local file access from sandboxed renderer

### Solution

Implemented **IPC-based logo loading** with base64 data URLs:

**1. Created IPC handler** (`electron/main.js:352-384`):
```javascript
ipcMain.handle('logo:load', async (event, logoPath) => {
  const fileBuffer = fs.readFileSync(logoPath);
  const base64 = fileBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;
  return dataUrl;
});
```

**2. Exposed API** (`electron/preload.js:39`):
```javascript
loadLogo: (logoPath) => ipcRenderer.invoke('logo:load', logoPath)
```

**3. Updated Logo component** (`src/components/Logo.jsx`):
```javascript
// Load logo via IPC instead of file:// URL
const dataUrl = await window.electronAPI.loadLogo(logoPath);
setImageSrc(dataUrl);  // Safe base64 data URL
```

### How It Works

```
Settings modal → logoPath saved to settings.json
                        ↓
App loads settings → logoPath passed to Logo component
                        ↓
Logo calls window.electronAPI.loadLogo(path)
                        ↓
Main process reads file + converts to base64
                        ↓
Returns data URL to renderer (bypasses sandbox)
                        ↓
Logo displays image successfully
```

### Design Changes

- Changed logo from circle to rounded square: `border-radius: 50%` → `5px`
- Better alignment with modern UI design patterns

### Files Modified

- `electron/main.js` - Added `logo:load` IPC handler
- `electron/preload.js` - Exposed `loadLogo()` API
- `src/components/Logo.jsx` - Async IPC-based loading with error handling
- `src/index.css` - Updated border-radius to 5px

### Key Learnings

1. **Electron sandbox blocks file:// URLs** - Use IPC for local file access
2. **Base64 data URLs work in sandbox** - Main process reads file, renderer displays
3. **Secure by design** - Sandbox prevents arbitrary file access, IPC provides controlled access
4. **Hot reload works** - CSS changes (border-radius) apply immediately in dev mode

---

**Recent Changes (Settings Modal Spec - 2025-12-20):**
- ✅ Created comprehensive settings modal specification (`specs/settings-modal.spec.md`)
- ✅ Spec includes: Full-height panel (480px), slides from right, auto-save behavior
- ✅ Features defined: Logo upload, output preferences (formats, auto-open), recent analyses list
- ✅ Design decisions: Settings gear icon (tandhjul), subtle backdrop, 400ms animation
- ✅ Technical details: IPC integration, auto-save with toast feedback, 3 close methods
- ✅ Implementation phases: MVP (logo, formats, recent) → Phase 2 (colors, company name)

**Recent Changes (Feature Implementation Session 2025-12-18 Late Evening):**
- ✅ **MAJOR:** Implemented ProviderSelector UI component (manual provider selection)
- ✅ **MAJOR:** Implemented ESC key cancellation with confirmation dialog
- ✅ Fixed layout overflow issues (all content fits in viewport without scrolling)
- ✅ Refined ProviderSelector styling (subtle, text-based selector)
- ✅ Fixed Windows process termination (graceful Ctrl+C + force kill with SIGKILL)
- ✅ Fixed stdin handling in Gemini adapter (keep open for cancellation signals)
- ✅ Moved Promise resolution to EXIT event (more reliable than CLOSE event)
- ✅ Added comprehensive debug logging for process lifecycle
- ✅ StatusArea now properly hides when empty (prevents layout issues)

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
- ✅ **Manual provider selection** (Gemini, Claude, OpenAI) - subtle text-based UI
- ✅ **Both Claude and Gemini CLI working** - stdin method, ~60-130s analysis time
- ✅ Real-time progress updates during analysis (smooth, incremental, mapped to actual timing)
- ✅ **ESC key cancellation** - graceful Ctrl+C signal with 2s timeout, then force kill
- ✅ **Settings modal** - logo upload, format selection, recent analyses (verified non-blocking)
- ✅ **Logo display** - IPC-based loading, shows selected logo in header (5px border-radius)
- ✅ Checkmark appears immediately after file upload
- ✅ Success animation (bouncy checkmark with elastic bounce)
- ✅ Error handling with Danish messages + retry
- ✅ Export to Word, PDF, Markdown (auto-open on button click)
- ✅ Auto-save settings (debounced 1s, asynchronous)
- ✅ CLI provider detection (Claude Code, Gemini, OpenAI)
- ✅ Complete document analysis workflow
- ✅ Multi-format report generation (PDF, DOCX, MD)
- ✅ Automatic file organization by client and date (DD-MM-YYYY format)
- ✅ Comprehensive error handling and debug logging
- ✅ **ESLint code quality checks** (catches scoping issues, undefined variables)
- ✅ **Pre-commit hooks** (auto-validates before commits)
- ✅ **Smoke test** (30s rapid validation of full workflow)

**Known Issues & TODO:**
- ✅ ~~Add ProviderSelector UI component~~ (COMPLETED 2025-12-18)
- ✅ ~~ESC key to cancel analysis~~ (COMPLETED 2025-12-18)
- ✅ ~~Fix CLI timeout issues~~ (COMPLETED 2025-12-21 - stdin method)
- ✅ ~~Settings modal implementation~~ (COMPLETED 2025-12-21 - verified non-blocking)
- ✅ ~~Logo loading from settings~~ (COMPLETED 2025-12-21 - IPC-based loading)
- 🎯 **NEXT:** Settings modal Phase 2 enhancements (company name, color picker, contact info, logo thumbnail preview)
- ⚠️ Auto-start behavior (currently auto-starts, user requested to keep this)
- 📋 **Future (Foundational):** Provider abstraction refactoring (spec ready: specs/provider-abstraction.spec.md)
  - **Problem:** Current adapters tightly coupled to CLI syntax and file paths
  - **Solution:** Stateless provider interface with standardized error handling
  - **Benefit:** Easy to add new providers (APIs, local models, web sessions)
  - **Prerequisite:** Should be done before OpenAI adapter and custom instructions
- 📋 **Future:** Implement provider custom instructions (spec ready: specs/provider-custom-instructions.spec.md)
  - **Problem:** Development CLAUDE.md causes errors when Claude CLI reads it during analysis
  - **Solution:** Separate provider-configs/ directory for runtime analysis instructions
  - **Benefit:** Users can customize LLM behavior without modifying code
- 📋 **Future:** OpenAI CLI support (needs provider abstraction first)
- 📋 **Future:** Settings UI for editing provider instructions
- 📋 **Future:** Manual start button (optional - user prefers auto-start)
- 📋 **Future:** Leverage Claude context bleed for personalized client analysis (chat feature)

## macOS Integration To-Do

**Status:** 🍎 Windows version complete, macOS compatibility pending
**Estimated Effort:** 50-70 hours total (34-48 dev + 17-24 testing)
**Priority:** Before macOS beta release

### 🔴 Critical Issues (Must Fix Before macOS Release)

**1. PATH Environment Not Loaded from User Shell Profile** (12 hours)
- **Problem:** Electron spawns processes without loading `.zshrc`/`.bash_profile`
- **Impact:** CLIs installed via Homebrew/npm not detected (affects 90%+ of users)
- **Files:** `src/adapters/claude-adapter.js:236`, `src/adapters/gemini-adapter.js:240`
- **Solution:** Load shell profile before spawning or manually build PATH with common locations
- **Code locations:**
  ```javascript
  // Add to both adapters
  const customEnv = {
    ...process.env,
    PATH: '/opt/homebrew/bin:/usr/local/bin:~/.npm-global/bin:' + process.env.PATH
  };
  ```

**2. CLI Installation Location Diversity** (8 hours)
- **Problem:** Different package managers install to different locations
- **Impact:** `which claude` fails even when CLI properly installed
- **Files:** `src/utils/cli-detector.js:42`
- **Solution:** Fallback checks for common locations (/opt/homebrew/bin, /usr/local/bin, ~/.npm-global/bin)
- **Homebrew paths:**
  - Intel Mac: `/usr/local/bin/`
  - Apple Silicon: `/opt/homebrew/bin/`

**3. Apple Silicon (M1/M2/M3) Rosetta 2 Issues** (10 hours)
- **Problem:** Architecture mismatch between Electron app and CLI tools
- **Impact:** `spawn ENOEXEC` errors if ARM64 app spawns x86_64 CLI
- **Files:** Build configuration in `package.json`
- **Solution:** Build universal binary (ARM64 + x86_64)
- **Build config:**
  ```json
  "mac": {
    "target": [{ "target": "dmg", "arch": ["x64", "arm64"] }]
  }
  ```

**4. Gatekeeper User Experience** (8 hours) - *Downgraded from Critical*
- **Problem:** Unsigned apps trigger security warnings on first launch
- **Impact:** Poor UX, users may abandon installation (not a technical blocker)
- **Solution:** Code signing and notarization (Apple Developer Program $99/year)
- **Notes:** App works after user bypasses Gatekeeper (right-click → Open)

---

### 🟡 High Priority Issues

**5. Shell Profile Complexity (zsh vs bash)** (4 hours)
- **Problem:** macOS uses zsh (Catalina+) or bash (older versions)
- **Impact:** Need to detect which profile to load (`.zshrc` vs `.bash_profile`)
- **Solution:** Check `process.env.SHELL` to determine profile path
- **Implementation:**
  ```javascript
  function getUserShellProfile() {
    const shell = process.env.SHELL || '/bin/zsh';
    if (shell.includes('zsh')) return process.env.HOME + '/.zshrc';
    if (shell.includes('bash')) return process.env.HOME + '/.bash_profile';
    return null;
  }
  ```

**6. First-Run CLI Authentication Prompts** (6 hours)
- **Problem:** CLIs require `claude login` before first use, but app spawns non-interactively
- **Impact:** Users see "auth required" error with no clear resolution path
- **Files:** `src/adapters/claude-adapter.js:300`, `src/adapters/gemini-adapter.js:300`
- **Solution:** Pre-flight authentication check with helpful Danish error messages
- **Danish error:** "Claude CLI kræver autentificering. Åbn Terminal og kør: `claude login`"

**7. File System Case Sensitivity** (3 hours)
- **Problem:** APFS can be case-sensitive (developer option)
- **Impact:** `Output/` vs `output/` treated as different directories
- **Files:** `src/utils/output-manager.js:92`
- **Solution:** Consistent lowercase directory names (already done in `sanitizeName`)
- **Testing:** Test with case-sensitive APFS during development

**8. Process Group Termination Differences** (8 hours)
- **Problem:** Killing shell wrapper doesn't kill CLI subprocess on POSIX
- **Impact:** Cancelled analysis keeps running in background, wastes API quota
- **Files:** `src/adapters/claude-adapter.js:42`, `src/adapters/gemini-adapter.js:42`
- **Solution:** Kill process group with negative PID: `process.kill(-pid, 'SIGKILL')`
- **Process tree issue:**
  ```bash
  # Spawning with shell: true creates wrapper process
  23456 /bin/sh -c "claude --print ..."  # kill(23456) only kills this
    23457 claude --print ...              # This keeps running!
  ```

**9. Stdin Ctrl+C Reliability** (4 hours)
- **Problem:** POSIX systems prefer SIGINT signal over stdin Ctrl+C character
- **Impact:** Graceful cancellation may not work reliably
- **Files:** `src/adapters/gemini-adapter.js:30`
- **Solution:** Send SIGINT first (POSIX), fallback to stdin Ctrl+C (Windows)
- **Implementation:**
  ```javascript
  if (process.platform !== 'win32') {
    process.kill(this._currentProcess.pid, 'SIGINT');
  } else {
    this._currentProcess.stdin.write('\x03');
  }
  ```

---

### 🟢 Medium Priority Issues (Polish)

**10. Home Directory Structure Differences** (4 hours)
- **Problem:** Using `~/.contract-reviewer/` instead of macOS-standard `~/Library/Application Support/`
- **Impact:** Low - works but violates macOS conventions
- **Files:** `src/utils/settings-manager.js`, `src/utils/logger.js`
- **Solution:** Platform-specific data directories
- **macOS path:** `~/Library/Application Support/Contract Reviewer/`
- **Windows path:** `~/AppData/Local/Contract Reviewer/`

**11. Output Directory Organization Conventions** (3 hours)
- **Problem:** Using `output/` in project directory instead of `~/Documents/`
- **Impact:** Low - works but may confuse users about file locations
- **Files:** `src/utils/output-manager.js`
- **Solution:** Default to `~/Documents/Contract Reviewer/` on macOS
- **Note:** Show output directory in settings so users know where files are saved

**12. CLI Version Detection Reliability** (2 hours)
- **Problem:** Assumes all CLIs support `--version` flag
- **Impact:** Low - version detection fails but core functionality works
- **Files:** `src/utils/cli-detector.js:88`
- **Solution:** Make version detection non-fatal (return 'unknown' on error)
- **Notes:** Version is metadata only, not critical for operation

---

### Testing Requirements for macOS

**Hardware:**
- ✅ Intel Mac (x86_64)
- ✅ Apple Silicon Mac (ARM64 - M1/M2/M3)

**CLI Installation Methods:**
- ✅ Homebrew Intel (`/usr/local/bin`)
- ✅ Homebrew Apple Silicon (`/opt/homebrew/bin`)
- ✅ npm global install (`~/.npm-global/bin`)
- ✅ Manual installation

**System Configurations:**
- ✅ zsh shell (modern macOS default)
- ✅ bash shell (older macOS)
- ✅ Case-sensitive APFS file system
- ✅ Case-insensitive APFS (default)

**Security Testing:**
- ✅ Unsigned app (Gatekeeper bypass workflow)
- ✅ Signed app (production release)
- ✅ First-run CLI authentication flow
- ✅ Process cancellation (ESC key during analysis)

---

### Implementation Priority Order

**Before macOS beta release (38 hours):**
1. ✅ Fix PATH environment loading (#1) - 12 hours
2. ✅ Implement CLI location fallback checks (#2) - 8 hours
3. ✅ Pre-flight CLI authentication check (#6) - 6 hours
4. ✅ Fix process group termination (#8) - 8 hours
5. ✅ Build universal binary (#3) - 4 hours

**Before macOS production release (24 hours):**
6. ✅ Code signing and notarization (#4) - 8 hours
7. ✅ Platform-specific data directories (#10) - 4 hours
8. ✅ Improve cancellation with SIGINT (#9) - 4 hours
9. ✅ Shell profile detection (#5) - 4 hours
10. ✅ Test on case-sensitive file system (#7) - 4 hours

**Nice to have (9 hours):**
11. Output to Documents folder (#11) - 3 hours
12. Better version detection (#12) - 2 hours
13. Homebrew cask distribution - 4 hours

---

### Additional macOS Enhancements

**Homebrew Distribution** (8 hours)
```bash
# One-line install for users
brew install --cask contract-reviewer
```
- Handles code signing automatically
- Fixes PATH issues
- Trusted by macOS users
- Auto-updates support

**Auto-Updater** (4 hours)
```javascript
// electron-updater package
autoUpdater.checkForUpdatesAndNotify();
```
- App updates itself (like web app!)
- User never manually downloads new version

**Better Onboarding** (10 hours)
- First-run wizard
- CLI detection with install guides
- Permissions setup (file access)
- Quick tutorial

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

**Design & Specs:**
- `mockups/main-screen-v4.html` - Final approved interactive mockup
- `specs/ui-components.spec.md` - 15 React components (✅ implemented)
- `specs/settings-modal.spec.md` - Settings panel component (❌ not implemented, spec ready)
- `specs/state-management.spec.md` - Context + reducer architecture (✅ implemented)
- `specs/ipc-contracts.spec.md` - Secure Electron IPC (✅ implemented)
- `specs/user-flows.spec.md` - 10 user workflows (✅ implemented)
- `specs/progress-mapping.spec.md` - Progress animation timing (✅ implemented)
- `specs/provider-abstraction.spec.md` - LLM provider interface (❌ not implemented)
- `specs/provider-custom-instructions.spec.md` - Custom instructions system (❌ not implemented)

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
  - *See ADR-001 for rationale and future HTTP session consideration*
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

1. ✅ **ESC Key to Cancel Analysis** (COMPLETED 2025-12-18)
   - ✅ Add ESC key handler during analysis
   - ✅ Graceful Ctrl+C signal with 2s timeout, then force kill
   - ✅ Return to ready-to-start state (file uploaded, can restart or upload new)

2. **Settings Modal** 🎯 **NEXT PRIORITY** (Spec ready: `specs/settings-modal.spec.md`)
   - Implement settings panel UI (480px, slides from right, full-height)
   - Settings gear icon (tandhjul) in header
   - Logo upload (file picker button)
   - Output preferences (default formats, auto-open toggle)
   - Recent analyses list (5 most recent, click to open folder)
   - Auto-save with subtle toast notification

3. **Manual Start Button** (Optional - user prefers auto-start)
   - Remove auto-start behavior
   - Add 'ready-to-start' state
   - Show Start button inside drop zone when file + prompt selected
   - User explicitly clicks to begin analysis

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

**Architecture Decisions:**
- **docs/architecture/** - Architecture Decision Records (ADRs)
- **docs/architecture/ADR-001-cli-vs-http-sessions.md** - CLI vs HTTP session approach (rationale and pivot criteria)

**Specifications:**
- **specs/*.spec.md** - Complete technical specifications
- **specs/provider-abstraction.spec.md** - LLM provider interface (enables future HTTP session support)
- **specs/provider-custom-instructions.spec.md** - Custom instructions system (not yet implemented)
- **specs/progress-mapping.spec.md** - Progress animation timing details
- **mockups/main-screen-v4.html** - Interactive design mockup

**Testing:**
- **tests/smoke-test.js** - 30s rapid validation test
- **tests/test-end-to-end.js** - Full integration test
- **TESTING-CHECKLIST.md** - MVP testing results and findings
