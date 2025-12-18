# MVP Testing Checklist

**Date:** 2025-12-17
**Status:** Ready for end-to-end testing
**Tester:** _______________

## Pre-Test Setup

- [ ✓] Run `npm install` to ensure all dependencies are installed
- [ ✓] Have a test document ready (franchise contract or manual)
- [ ✓] Ensure Claude CLI is authenticated (`claude --print "test"` should work)

## Test Execution

### 1. Start the Application

```bash
npm run electron:dev
```

**Expected:** Application window opens showing the main interface

**✓ PASS / ✗ FAIL** ___
**Notes:** _______________________________________________

---

### 2. Initial State

**Visual checks:**
- [ x] App header shows "Kontrakt Revisor" title: Contract Reviewer
- [ x] Hamburger menu icon visible (top left): visible top right, DO NOT work
- [✓ ] Drop zone shows "Træk dokument hertil" message
- [ ✓] 3 prompt buttons visible: "Kontrakt", "Manual", "Compliance"
- [ x] All prompt buttons are light/unselected: kontrakt is selected from load
- [ x] Status area shows: "Klar til at starte": it should not show this, so this is a good thing
- [ ✓] Export buttons (Word/PDF/Markdown) are disabled/hidden

**✓ PASS / ✗ FAIL** ___
**Notes:** _______________________________________________

---

### 3. File Upload via Drag-and-Drop

**Action:** Drag a document file onto the drop zone

**Expected:**
- [x ] Drop zone shows green checkmark icon: this does not happen before the analysis is done
- [✓ ] Document filename displays below checkmark
- [ ✓ ] Status message updates
- [ ✓] Document can be dropped successfully

**✓ PASS / ✗ FAIL** ___
**Notes:** _______________________________________________

---

### 4. File Upload via Click

**Action:** Click the drop zone and select a file

**Expected:**
- [✓ ] File picker dialog opens
- [ ✓] Selected file appears with checkmark
- [✓ ] Filename displays correctly

**✓ PASS / ✗ FAIL** ___
**Notes:** _______________________________________________

---

### 5. Prompt Selection

**Action:** Click one of the prompt buttons (e.g., "Kontrakt")

**Expected:**
- [ ✓] Selected button turns dark blue (`background: #2563eb`)
- [✓ ] Selected button border becomes thicker (3px): the animation over tothicker border is not good, jancky
- [✓ ] Other buttons remain light
- [x ] Status updates: where should this be? im not sure it should actually show any place

**✓ PASS / ✗ FAIL** ___
**Selected Prompt:** _______________
**Notes:** _______________________________________________

---

### 6. Analysis Auto-Start

**Expected (current behavior):**
- [✓ ] Analysis starts automatically when file + prompt selected
- [✓ ] Spinner appears in drop zone
- [x ] Progress bars appear showing 3 stages:
  - Stage 1: "Validerer dokument": didnt see this part
  - Stage 2: "Analyserer indhold": it got stuck on this one!
  - Stage 3: "Genererer rapporter"
  it does go through the 3 stages. the first part being filled very fast and then nothing happens in the second part while the analysis is running. this could be misunderstood as the analysis has stopped. the animation should bemore fuint, with litle movement to show development/ovement in the analysis
- [x ] Progress updates in real-time: it might be, but it sont show up like taht to the user
- [x ] Each stage shows percentage (0-100%): it shows a line were it fills up in procent. this is fine

**✓ PASS / ✗ FAIL** ___
**Time taken:** ________ minutes
**Notes:** _______________________________________________

---

### 7. Progress Updates

**During analysis, verify:**
- [✓  ] Progress bar animates smoothly
- [✓  ] Stage labels update correctly (3 stages)
- [x ] Percentage increases from 0% to 100%
- [ ✓ ] Status messages are in Danish
- [? ] UI remains responsive (no freezing)

**✓ PASS / ✗ FAIL** ___
**Notes:** _______________________________________________

---

### 8. Success State

**After analysis completes:**
- [ ✓ ] Green checkmark appears with bouncy animation (600ms elastic)
- [ ] Success message: "Analyse gennemført!"
- [✓ ] Export buttons (Word/PDF/Markdown) become enabled
- [✓  ] Export buttons are styled correctly (light with borders)
- [✓  ] Analysis result is visible/accessible

**✓ PASS / ✗ FAIL** ___
**Notes:** _______________________________________________

---

### 9. Export to Word

**Action:** Click "Exportér Word" button

**Expected:**
- [v ] Word file (`.docx`) is generated
- [✓  ] File is saved to `output/[client-name]/YYYY-MM-DD/`
- [✓  ] File opens in Word (if auto-open enabled)
- [ ✓ ] Document contains:
  - Cover page with branding
  - Client name
  - Analysis date
  - Document name
  - Full analysis content
  - Proper formatting (headings, paragraphs)

**✓ PASS / ✗ FAIL** ___
**File path:** _______________________________________________
**Notes:** _______________________________________________

---

### 10. Export to PDF

**Action:** Click "Exportér PDF" button

**Expected:**
- [ ✓ ] PDF file is generated
- [✓  ] File is saved to `output/[client-name]/YYYY-MM-DD/`
- [✓  ] File opens in PDF reader (if auto-open enabled)
- [✓  ] PDF contains:
  - Professional cover page
  - All content from analysis
  - Proper formatting
  - Readable fonts

**✓ PASS / ✗ FAIL** ___
**File path:** _______________________________________________
**Notes:** _______________________________________________

---

### 11. Export to Markdown

**Action:** Click "Exportér Markdown" button

**Expected:**
- [✓  ] Markdown file (`.md`) is generated
- [ ✓ ] File is saved to `output/[client-name]/YYYY-MM-DD/`
- [ ✓ ] File contains:
  - Metadata header (YAML front matter)
  - Full analysis in markdown format
  - Proper markdown syntax (headings, lists, etc.)

**✓ PASS / ✗ FAIL** ___
**File path:** _______________________________________________
**Notes:** _______________________________________________

---

### 12. File Organization

**Verify output structure:**

```
output/
└── [client-name]/
    └── YYYY-MM-DD/
        ├── report.pdf
        ├── report.docx
        └── report.md
```

- [✓  ] Client folder created correctly
- [ ✓ ] Date folder uses YYYY-MM-DD format: But it should do DD-MM-YYYY
- [ ✓ ] All 3 files are present
- [✓  ] Files are named consistently

**✓ PASS / ✗ FAIL** ___
**Actual path:** _______________________________________________
**Notes:** _______________________________________________

---

### 13. Settings Menu (Hamburger)

**Action:** Click hamburger menu icon

**Expected (current known issue):**
- [ ] Menu does nothing (not yet implemented)
- [ ] Console shows: "Menu clicked - settings modal not yet implemented"

**✓ PASS / ✗ FAIL** ___
**Notes:** _______________________________________________

---

### 14. Error Handling

**Test scenarios:**

#### 14a. No file selected
- [ ] Appropriate error message in Danish
- [ ] UI doesn't crash

#### 14b. No prompt selected
- [ ] Appropriate error message in Danish
- [ ] UI doesn't crash

#### 14c. Invalid file type
- [ ] Error message displayed
- [ ] Recovery suggestion provided

**✓ PASS / ✗ FAIL** ___
**Notes:** _______________________________________________

---

### 15. Retry After Error

**If an error occurs:**
- [ ] "Prøv igen" button appears
- [ ] Clicking retry re-runs the analysis
- [ ] State is properly reset before retry
- [ ] Retry works successfully

**✓ PASS / ✗ FAIL** ___
**Notes:** _______________________________________________

---

### 16. Multiple Documents

**Action:** Test with different document types

Test 1 - Contract:
- [ ] Upload works
- [ ] Analysis completes
- [ ] Reports generated

Test 2 - Manual:
- [ ] Upload works
- [ ] Analysis completes
- [ ] Reports generated

Test 3 - Large file (>1MB):
- [ ] Upload works
- [ ] Analysis completes (may take longer)
- [ ] Reports generated

**✓ PASS / ✗ FAIL** ___
**Notes:** _______________________________________________

---

### 17. Visual Design Verification

**Compare with:** `mockups/main-screen-v4.html`

- [ ] Colors match design (primary-dark: #0d1321, accent: #2563eb)
- [ ] Typography uses Inter font
- [ ] Button styles match mockup (light with borders)
- [ ] Spacing and layout match design
- [ ] Icons are Lucide icons
- [ ] Animations match (checkmark bounce: 600ms elastic)
- [ ] Overall visual polish matches mockup

**✓ PASS / ✗ FAIL** ___
**Notes:** _______________________________________________

---

### 18. Console Errors

**During all tests:**
- [ ] No JavaScript errors in console
- [ ] No React warnings
- [ ] No IPC errors
- [ ] Only expected log messages

**✓ PASS / ✗ FAIL** ___
**Notes:** _______________________________________________

---

## Overall Results

**Total Tests:** 18
**Passed:** ___
**Failed:** ___
**Blocked:** ___

### Critical Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Non-Critical Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### MVP Approval Decision

**☐ APPROVED** - MVP is ready for user testing
**☐ BLOCKED** - Critical issues must be fixed first

**Signature:** _______________
**Date:** _______________

---

## Known Issues (From CLAUDE.md)

These are already documented and will be addressed post-MVP:

- ⚠️ Hamburger menu does nothing (settings modal not implemented)
- ⚠️ Auto-start behavior (should add manual Start button)
- ⚠️ No ESC key to cancel analysis
- ⚠️ Claude CLI takes 1-5 minutes (need better time estimates)

---

## Next Steps After MVP Approval

1. **ESC Key to Cancel** - Add cancel functionality
2. **Manual Start Button** - Remove auto-start, add explicit Start button
3. **Settings Modal** - Implement hamburger menu functionality
4. **Time Estimates** - Show estimated/remaining time during analysis
5. **User Testing** - Test with real franchise consultants
6. **Polish** - Refine based on user feedback
