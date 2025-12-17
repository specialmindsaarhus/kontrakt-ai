# User Flows Specification

## Overview

This document defines the complete user interaction flows for the Contract Reviewer application. Each flow includes the user's actions, system responses, state transitions, and error handling.

**Target User:** Franchise consultant who reviews contracts and manuals for clients

---

## Flow 1: First-Time Setup

**Goal:** Configure the application on first launch

### Prerequisites
- Application installed
- At least one CLI (Claude, Gemini, or OpenAI) installed on system

### Steps

| Step | User Action | System Response | State Transition | UI Changes |
|------|-------------|-----------------|------------------|------------|
| 1 | Launches app | Loads settings (empty on first launch) | `uiState: 'idle'` | Shows app with empty state |
| 2 | - | Detects available CLI providers | Updates `availableProviders` | Logo appears, menu button visible |
| 3 | - | Loads available prompts | Updates `availablePrompts` | Drop zone visible, prompt buttons visible |
| 4 | (Optional) Clicks menu button | Opens settings modal | - | Settings modal appears |
| 5 | (Optional) Enters company name, contact info | - | Updates `branding` | Branding fields updated |
| 6 | (Optional) Saves settings | Persists to `~/.contract-reviewer/settings.json` | - | Settings modal closes |

### Success Criteria
- CLI provider detected and selected
- Prompts loaded successfully
- UI is in idle state, ready for document upload

### Error Scenarios

**No CLI Installed:**
- **Detection:** Main process detects no available CLIs
- **UI Response:** Show error in drop zone area
- **Error Message:** "Ingen CLI fundet"
- **Suggestions:** "Installer Claude CLI, Gemini CLI eller OpenAI CLI for at fortsætte."
- **Recovery:** Show installation links for all CLIs

**Prompts Missing:**
- **Detection:** Prompt files not found in `/prompts/` directory
- **UI Response:** Prompt buttons disabled
- **Error Message:** "System prompts ikke fundet"
- **Suggestions:** "Geninstaller programmet eller kontakt support."
- **Recovery:** None (critical error)

---

## Flow 2: Basic Analysis (Happy Path)

**Goal:** Analyze a document and generate reports

### Prerequisites
- App configured (at least one CLI available)
- Document ready to upload (.txt, .pdf, or .docx)

### Steps

| Step | User Action | System Response | State Transition | UI Changes |
|------|-------------|-----------------|------------------|------------|
| 1 | Clicks prompt button (e.g., "Kontrakt") | Highlights button | `uiState: 'prompt-selected'`<br/>`selectedPrompt: 'franchise-contract-review'` | Button background turns dark (#0d1321), text turns white |
| 2 | - | - | - | Drop zone text changes to "Klar til at modtage" |
| 3 | Drags document file over drop zone | Visual feedback | `isDragOver: true` | Drop zone border thickens (3px), background lightens |
| 4 | Releases file (drops) | Validates file | `uiState: 'prompt-selected'`<br/>`documentFile: {...}` | Drop zone shows filename, prompt buttons remain visible |
| 5 | (Optional) Enters client name in input field | - | `clientName: "..."` | Client name field updated |
| 6 | System auto-starts analysis (file + prompt selected) | Sends IPC request to main process | `uiState: 'analysis-running'`<br/>`analysisProgress: 0`<br/>`currentStage: 0` | Drop zone shows spinner, prompt buttons hide |
| 7 | - | CLI executes in background | - | Status message: "Analyserer indhold" |
| 8 | - | Main process sends progress update (30%) | `analysisProgress: 30` | First progress bar fills |
| 9 | - | Progress update (60%, stage 1) | `analysisProgress: 60`<br/>`currentStage: 1` | Status message: "Genererer rapport"<br/>Second progress bar fills |
| 10 | - | Progress update (90%) | `analysisProgress: 90` | Third progress bar fills |
| 11 | - | Analysis complete, reports generated | `uiState: 'completed'`<br/>`analysisResult: {...}` | Drop zone shows checkmark (animated), output buttons appear |
| 12 | - | - | - | Status shows execution time (e.g., "58 sekunder") |
| 13 | Clicks "PDF" button | Opens PDF in default viewer | - | PDF opens in system app |
| 14 | Clicks "Word" button | Opens DOCX in default editor | - | Word/LibreOffice opens |
| 15 | Clicks "Markdown" button | Opens folder containing MD file | - | File explorer opens |
| 16 | (Optional) Clicks drop zone to start new analysis | Resets state | `uiState: 'idle'`<br/>`documentFile: null`<br/>`analysisResult: null` | Returns to initial state, prompt buttons reappear |

### State Transitions Diagram

```
idle
  ↓ (select prompt)
prompt-selected
  ↓ (upload file)
prompt-selected (with file)
  ↓ (auto-start analysis)
analysis-running
  ↓ (CLI completes)
completed
  ↓ (reset or upload new)
idle
```

### Success Criteria
- Document analyzed successfully
- Reports generated in all requested formats (PDF, DOCX, MD)
- Reports organized in `output/client-name/YYYY-MM-DD/` directory
- User can open reports directly from UI

### Timing Expectations
- **File validation:** Instant (< 100ms)
- **Analysis execution:** 30-90 seconds (depends on document size and CLI)
- **Report generation:** 2-5 seconds
- **Total workflow:** ~1-2 minutes

---

## Flow 3: Error Handling - CLI Not Authenticated

**Goal:** Handle authentication error gracefully

### Scenario
User has Claude CLI installed but hasn't logged in

### Steps

| Step | User Action | System Response | State Transition | UI Changes |
|------|-------------|-----------------|------------------|------------|
| 1 | Selects prompt + uploads file | Analysis starts | `uiState: 'analysis-running'` | Spinner appears |
| 2 | - | CLI returns authentication error | `uiState: 'error'`<br/>`error: { code: 'AUTH_REQUIRED', ... }` | Drop zone border turns red (3px) |
| 3 | - | - | - | Shows red triangle icon |
| 4 | - | - | - | Error message: "Claude CLI kræver autentificering" |
| 5 | - | - | - | Suggestions: "Kør `claude auth` i terminalen og følg instruktionerne." |
| 6 | - | - | - | "Prøv igen" button appears |
| 7 | Opens terminal, runs `claude auth`, completes login | - | - | (Outside app) |
| 8 | Clicks "Prøv igen" button | Resets state | `uiState: 'prompt-selected'`<br/>`error: null` | Returns to prompt-selected state |
| 9 | (Auto-retry) Analysis starts again | - | `uiState: 'analysis-running'` | Spinner appears |
| 10 | - | CLI executes successfully | `uiState: 'completed'` | Success checkmark appears |

### Error Message Format

```
┌─────────────────────────────────────┐
│  ⚠️  (red triangle icon)            │
│                                     │
│  Claude CLI kræver autentificering  │  (red, bold)
│                                     │
│  Kør claude auth i terminalen og    │  (gray, regular)
│  følg instruktionerne.              │
│                                     │
│      [Prøv igen]  (button)          │
└─────────────────────────────────────┘
```

### Recovery Options
1. **Authenticate:** User follows suggestions, then clicks "Prøv igen"
2. **Switch CLI:** User clicks menu → settings → select different CLI provider
3. **Cancel:** User clicks drop zone to reset and start over

---

## Flow 4: Error Handling - Invalid File

**Goal:** Prevent invalid files from being processed

### Scenario
User tries to upload an unsupported file type

### Steps

| Step | User Action | System Response | State Transition | UI Changes |
|------|-------------|-----------------|------------------|------------|
| 1 | Selects prompt | - | `uiState: 'prompt-selected'` | Button highlighted |
| 2 | Drags `.xlsx` file over drop zone | Client-side validation fails | - | No visual change (stays in prompt-selected) |
| 3 | Drops file | Validation error | `uiState: 'error'`<br/>`error: { code: 'INVALID_FILE_TYPE', ... }` | Drop zone border red, triangle icon |
| 4 | - | - | - | Error: "Ugyldigt filformat" |
| 5 | - | - | - | Suggestions: "Kun .txt, .pdf og .docx filer understøttes." |
| 6 | Clicks "Prøv igen" | Clears error | `uiState: 'prompt-selected'`<br/>`error: null` | Returns to prompt-selected state |
| 7 | Uploads valid `.pdf` file | Validation passes | `documentFile: {...}` | Filename appears, analysis starts |

### File Validation Rules

**Allowed Extensions:**
- `.txt` (plain text)
- `.pdf` (PDF documents)
- `.docx` (Word documents)

**Rejected Extensions:**
- `.xlsx`, `.xls` (Excel - not supported)
- `.pptx` (PowerPoint - not supported)
- `.jpg`, `.png` (Images - not supported)
- `.zip`, `.rar` (Archives - not supported)

**Size Limit:**
- Maximum: 10MB
- If exceeded: Error "Filen er for stor (max 10MB)"

### Validation Location
- **Client-side:** In `DropZone` component before calling `onFileUpload`
- **Why:** Immediate feedback, no unnecessary IPC calls

---

## Flow 5: Switching Prompts Mid-Session

**Goal:** Change prompt type without restarting

### Steps

| Step | User Action | System Response | State Transition | UI Changes |
|------|-------------|-----------------|------------------|------------|
| 1 | Selects "Kontrakt" prompt | - | `selectedPrompt: 'franchise-contract-review'` | "Kontrakt" button highlighted |
| 2 | Uploads document | - | `documentFile: {...}` | Filename appears |
| 3 | **Changes mind** - clicks "Manual" button | Switches prompt type | `selectedPrompt: 'franchise-manual-review'` | "Manual" button highlighted, "Kontrakt" unhighlighted |
| 4 | (Auto-restart analysis with new prompt) | Starts analysis with new prompt | `uiState: 'analysis-running'` | Spinner appears |
| 5 | - | Analysis completes | `uiState: 'completed'` | Success checkmark |

### Design Decision
- Clicking a different prompt button **after uploading a file** should automatically restart analysis
- Why: Streamlined UX, no need for separate "Run" button
- Alternative (rejected): Show "Apply" or "Run" button - adds extra click

---

## Flow 6: Batch Processing (Future Enhancement)

**Status:** Not MVP, included for reference

**Goal:** Analyze multiple documents in sequence

### Steps

| Step | User Action | System Response | State Transition | UI Changes |
|------|-------------|-----------------|------------------|------------|
| 1 | Selects prompt | - | `selectedPrompt: '...'` | Button highlighted |
| 2 | Uploads multiple files (drag-and-drop) | Adds to queue | `documentQueue: [...]` | Shows queue list (5 documents) |
| 3 | Clicks "Start Batch" | Processes first document | `uiState: 'batch-running'`<br/>`currentBatchIndex: 0` | Progress: "1 af 5" |
| 4 | - | First document completes | `currentBatchIndex: 1` | Progress: "2 af 5" |
| 5 | - | All documents complete | `uiState: 'batch-completed'` | Shows summary (4 success, 1 error) |
| 6 | Clicks "View Results" | Opens output folder | - | File explorer opens |

### UI Requirements (Future)
- Queue list component (draggable to reorder)
- Batch progress indicator (1/5, 2/5, etc.)
- Error handling per document (show which failed)
- Summary screen with export all option

---

## Flow 7: Settings Configuration

**Goal:** Customize branding and output preferences

### Steps

| Step | User Action | System Response | State Transition | UI Changes |
|------|-------------|-----------------|------------------|------------|
| 1 | Clicks hamburger menu | Opens settings modal | - | Modal appears (overlay) |
| 2 | Views current settings | - | - | Shows form with current values |
| 3 | Edits company name | - | `branding.companyName: "..."` | Field updates |
| 4 | Edits contact email | - | `branding.contactEmail: "..."` | Field updates |
| 5 | Changes primary color | Color picker | `branding.primaryColor: "#..."` | Preview updates |
| 6 | Selects default output formats (checkboxes) | - | `outputPreferences.defaultFormats: [...]` | Checkboxes toggle |
| 7 | Clicks "Gem" (Save) | Saves to settings.json | - | Modal closes |
| 8 | - | Settings persisted | - | Toast: "Indstillinger gemt" |
| 9 | Next analysis uses new settings | Reports include branding | - | PDF cover has company name/color |

### Settings Schema

```javascript
{
  // Branding
  companyName: "Special Minds ApS",
  logoPath: "/path/to/logo.png",  // Optional
  primaryColor: "#0d1321",
  contactEmail: "info@specialminds.com",
  contactPhone: "+45 12345678",
  footerText: "Generated by Special Minds Franchise Consulting",

  // Output Preferences
  defaultFormats: ["pdf", "docx", "md"],
  autoOpen: false,  // Auto-open reports after generation
  organizationMode: "client",  // client | date | flat

  // Last Session (auto-saved)
  lastProvider: "claude",
  lastPrompt: "franchise-contract-review",
  recentClients: ["Acme Corp", "Beta Ltd", ...]
}
```

### Settings Modal UI (Future)

```
┌─────────────────────────────────────────┐
│  Indstillinger                    [X]   │
├─────────────────────────────────────────┤
│                                         │
│  Branding                               │
│  ─────────                              │
│  Firmanavn:  [Special Minds ApS    ]    │
│  Email:      [info@specialminds.com]    │
│  Telefon:    [+45 12345678         ]    │
│  Farve:      [#0d1321] 🎨              │
│                                         │
│  Output                                 │
│  ──────                                 │
│  Standard formater:                     │
│    ☑ PDF    ☑ Word    ☑ Markdown       │
│                                         │
│  Åbn automatisk: ☐                      │
│                                         │
│  Organisering:                          │
│    ⦿ Efter klient                       │
│    ○ Efter dato                         │
│    ○ Fladt                              │
│                                         │
│         [Annuller]  [Gem]               │
└─────────────────────────────────────────┘
```

---

## Flow 8: Keyboard Shortcuts

**Goal:** Improve power user efficiency

### Keyboard Navigation

| Shortcut | Action | State Requirement |
|----------|--------|-------------------|
| Tab | Navigate between buttons | Any |
| Enter / Space | Activate focused button | Any |
| Ctrl+1 | Select "Kontrakt" prompt | Idle or prompt-selected |
| Ctrl+2 | Select "Manual" prompt | Idle or prompt-selected |
| Ctrl+3 | Select "Compliance" prompt | Idle or prompt-selected |
| Ctrl+O | Open file picker | Idle or prompt-selected |
| Ctrl+, | Open settings | Any |
| Esc | Close modal / Cancel | Modal open |
| Ctrl+R | Retry (on error) | Error state |
| Ctrl+N | New analysis (reset) | Completed or error |

### Implementation
```javascript
// In App.jsx
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === '1') {
      handlePromptSelect('franchise-contract-review');
    }
    if (e.ctrlKey && e.key === 'o') {
      document.getElementById('file-input').click();
    }
    // ... other shortcuts
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## Flow 9: Accessibility (A11y) Requirements

**Goal:** Ensure application is usable by all users

### Screen Reader Support

**Key Elements:**
- Drop zone: `role="button"` + `aria-label="Drop zone for document upload"`
- Prompt buttons: `aria-label="Select contract review prompt"`
- Status messages: `role="status"` + `aria-live="polite"`
- Error messages: `role="alert"` + `aria-live="assertive"`
- Progress bars: `role="progressbar"` + `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

### Focus Management
- Modal opens → Focus moves to first input
- Modal closes → Focus returns to trigger button
- Error appears → Focus moves to error message
- Analysis completes → Focus moves to first output button

### Color Contrast
- All text meets WCAG AA standard (4.5:1 ratio)
- Error text (#dc2626) on white background: 6.2:1 ✓
- Dark text (#0d1321) on white: 16.7:1 ✓
- White text on dark (#fff on #0d1321): 16.7:1 ✓

### Keyboard-Only Navigation
- All interactive elements accessible via Tab
- No mouse-only interactions
- Visible focus indicators (2px outline)

---

## Flow 10: Error Recovery Matrix

### Common Errors and Recovery Paths

| Error Code | User-Facing Message | Recovery Actions | Auto-Retry? |
|------------|---------------------|------------------|-------------|
| `CLI_NOT_FOUND` | "CLI ikke fundet" | 1. Install CLI<br/>2. Restart app<br/>3. Select different CLI | No |
| `AUTH_REQUIRED` | "CLI kræver autentificering" | 1. Run `claude auth`<br/>2. Click "Prøv igen" | Yes (after auth) |
| `FILE_NOT_FOUND` | "Filen blev ikke fundet" | 1. Upload file again<br/>2. Check file still exists | No |
| `INVALID_FILE_TYPE` | "Ugyldigt filformat" | 1. Convert to .txt/.pdf/.docx<br/>2. Upload correct file | No |
| `FILE_TOO_LARGE` | "Filen er for stor (max 10MB)" | 1. Compress document<br/>2. Split into smaller files | No |
| `TIMEOUT` | "Analysen tog for lang tid" | 1. Click "Prøv igen"<br/>2. Use shorter document<br/>3. Switch CLI | Yes (manual) |
| `PARSE_ERROR` | "Kunne ikke læse svar" | 1. Click "Prøv igen"<br/>2. Contact support | Yes (manual) |
| `EXECUTION_FAILED` | "Analysen fejlede" | 1. Check CLI logs<br/>2. Click "Prøv igen"<br/>3. Contact support | Yes (manual) |

### Retry Strategy
- **Automatic retry:** Never (to avoid infinite loops and cost)
- **Manual retry:** Always via "Prøv igen" button
- **Retry behavior:** Returns to `prompt-selected` state (keeps file and prompt)

---

## Performance Expectations

### Response Times

| Action | Expected Response | Maximum Acceptable |
|--------|-------------------|-------------------|
| Prompt selection | Instant | 100ms |
| File validation | Instant | 200ms |
| Start analysis | Immediate spinner | 500ms |
| Progress update | Every 5-10% | 5 seconds |
| Report generation | 2-5 seconds | 10 seconds |
| Open report | Instant | 1 second |
| Settings save | Background | N/A |

### Loading States

All async operations must show loading indicators:
- **Analysis running:** Spinner + progress bars + status text
- **Settings saving:** Spinner in "Gem" button (future)
- **Report opening:** Brief spinner (< 500ms)

---

## User Feedback Mechanisms

### Visual Feedback

**Hover States:**
- All buttons: Border thickens (1px → 2px)
- Drop zone: Border thickens + color darkens

**Active States:**
- Prompt button selected: Dark background, white text
- Drop zone with file: Thicker border (3px)

**Success Feedback:**
- Checkmark animation (bouncy, satisfying)
- Green color (#10b981)
- Execution time display

**Error Feedback:**
- Red border (3px, solid)
- Red triangle icon
- Red error text (bold)
- Gray suggestions text

### Audio Feedback (Future)
- Success sound on completion
- Error sound on failure
- Optional (user can disable in settings)

---

## Testing User Flows

### Manual Testing Checklist

**Flow 2: Basic Analysis**
- [ ] Select prompt → button highlights
- [ ] Upload file → filename appears
- [ ] Analysis starts → spinner appears
- [ ] Progress updates → bars fill sequentially
- [ ] Completion → checkmark animates
- [ ] Export PDF → PDF opens in viewer
- [ ] Export Word → DOCX opens in editor
- [ ] Export Markdown → folder opens

**Flow 3: CLI Not Authenticated**
- [ ] Trigger auth error → red border, error message
- [ ] "Prøv igen" button appears
- [ ] Authenticate in terminal
- [ ] Click "Prøv igen" → analysis restarts
- [ ] Success → checkmark appears

**Flow 4: Invalid File**
- [ ] Drop .xlsx file → error appears immediately
- [ ] Error message accurate
- [ ] "Prøv igen" clears error
- [ ] Drop .pdf file → analysis starts

### Automated E2E Tests

```javascript
// tests/e2e/basic-analysis-flow.test.js
describe('Basic Analysis Flow', () => {
  it('completes full workflow', async () => {
    // 1. Select prompt
    await page.click('[data-testid="prompt-btn-contract"]');
    expect(page.locator('.prompt-btn.selected')).toBeVisible();

    // 2. Upload file
    await page.setInputFiles('[type="file"]', 'test-document.pdf');
    expect(page.locator('.drop-filename')).toContainText('test-document.pdf');

    // 3. Wait for analysis (mock IPC)
    await page.waitForSelector('.success-icon');

    // 4. Verify completion
    expect(page.locator('.status-time')).toContainText('sekunder');
    expect(page.locator('.output-btn')).toHaveCount(3);

    // 5. Export PDF
    await page.click('[data-testid="export-pdf"]');
    // Verify PDF opened (check IPC call)
  });
});
```

---

## Edge Cases

### Rapid User Actions
- **Scenario:** User clicks multiple prompts rapidly
- **Expected:** Only last click is registered
- **Implementation:** Debounce or disable buttons during transition

### Large Files
- **Scenario:** User uploads 9.9MB file (just under limit)
- **Expected:** Analysis completes but takes longer
- **Implementation:** Show realistic time estimate ("Ca. 2-3 minutter")

### Network Issues (Future - if web-based CLI)
- **Scenario:** Network disconnects during analysis
- **Expected:** Timeout error after 5 minutes
- **Recovery:** "Prøv igen" when network restored

### Concurrent Sessions (Future - multiple windows)
- **Scenario:** User opens two app windows
- **Expected:** Each window independent, separate state
- **Implementation:** Each window has own Context provider

---

## User Journey Map

### New User (First Time)
1. **Discovers app** → Installs
2. **Launches** → Sees simple, clean interface
3. **Confused about CLI** → Error message guides to installation
4. **Installs Claude CLI** → Restarts app
5. **Uploads document** → Immediate feedback (spinner)
6. **Waits 60 seconds** → Progress updates reassure
7. **Analysis completes** → Delightful checkmark animation
8. **Opens PDF** → Professional report, ready to send to client
9. **Satisfied** → Bookmarks app for future use

### Power User (Returning)
1. **Launches app** → Settings auto-loaded (last prompt, client name)
2. **Drags file** → Analysis auto-starts (remembers preferences)
3. **Uses keyboard** → Ctrl+1 to switch prompt, Ctrl+O to upload
4. **Batch processes** → 5 contracts in 10 minutes
5. **Customizes branding** → Reports have company logo and colors
6. **Efficient workflow** → 5x faster than manual review

---

## Localization (Future)

### Supported Languages
- **Danish (da-DK):** Primary language (all UI text)
- **English (en-US):** Future enhancement for international users

### Translatable Strings
All UI text should use translation keys:

```javascript
// src/i18n/da.json
{
  "dropZone.idle": "Træk dokument hertil",
  "dropZone.ready": "Klar til at modtage",
  "dropZone.drop": "Slip for at uploade",
  "prompts.contract": "Kontrakt",
  "prompts.manual": "Manual",
  "prompts.compliance": "Compliance",
  "status.analyzing": "Analyserer indhold",
  "status.generating": "Genererer rapport",
  "error.cliNotFound": "CLI ikke fundet",
  // ... etc
}
```

### Implementation (Future)
Use `react-i18next` or similar library for string management.

---

## Analytics & Telemetry (Optional)

### Privacy-First Approach
- **No tracking by default**
- **Opt-in only** (user consent in settings)
- **Local analytics** (no external services)

### Useful Metrics (if enabled)
- Analysis completion rate
- Average analysis time
- Most used prompts
- Error frequency by type
- File format distribution

### Privacy Considerations
- Never send document content
- Never send client names
- Only aggregate statistics
- Clear opt-out in settings

---

## Summary: Critical User Flows

**Priority 1 (MVP):**
1. ✅ First-time setup
2. ✅ Basic analysis (happy path)
3. ✅ Error handling (CLI auth, invalid file)

**Priority 2 (Post-MVP):**
4. Settings configuration
5. Keyboard shortcuts
6. Switching prompts mid-session

**Priority 3 (Future):**
7. Batch processing
8. Localization
9. Analytics (opt-in)

---

## Design Validation Questions

Before implementation, validate these UX decisions:

1. **Auto-start analysis** when file + prompt selected?
   - **Decision:** Yes (streamlined UX, one less click)
   - **Alternative:** Require explicit "Run" button

2. **Show prompt buttons during analysis?**
   - **Decision:** No (hide to reduce clutter)
   - **Alternative:** Keep visible but disabled

3. **Success message text?**
   - **Decision:** No text, just checkmark animation + time
   - **Alternative:** Show "Færdig" text

4. **Retry button always visible on error?**
   - **Decision:** Yes (clear recovery path)
   - **Alternative:** Require reset to start over

5. **Auto-open reports after generation?**
   - **Decision:** No by default (user controls via settings)
   - **Alternative:** Always auto-open (could be annoying)

All design decisions align with **minimalist, intentional** design philosophy from mockup v4.
