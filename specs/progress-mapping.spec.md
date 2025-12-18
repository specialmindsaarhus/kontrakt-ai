# Progress Animation Mapping

**Last Updated:** 2025-12-18
**Status:** ✅ Implemented and Tested

## Overview

The progress animation consists of 3 visual bars that represent the analysis workflow. These bars are **not** divided equally, but mapped to the actual timing of each workflow phase.

## Visual Progress Bars

### Bar 1: Validation & Preparation (Fast)
- **Range:** 0-20%
- **Duration:** ~5 seconds
- **Activities:**
  - Starting analysis (0%)
  - Validating inputs (5%)
  - Preparing CLI (15%)
  - Ready to analyze (20%)

### Bar 2: Analysis & Reports (Long - Most Time Here)
- **Range:** 20-80%
- **Duration:** ~60-90 seconds (Gemini), ~30-60 seconds (Claude)
- **Activities:**
  - CLI execution start (20%)
  - Simulated progress during analysis (20-70%, +2% every 3s)
  - Analysis complete (75%)
  - Generating reports (80%)
- **Note:** This bar receives the most updates to prevent "stuck" appearance

### Bar 3: Finalization (Fast)
- **Range:** 80-100%
- **Duration:** ~5-10 seconds
- **Activities:**
  - Report generation (80%)
  - Finalizing (95%)
  - Complete (100%)

## Backend Progress Updates

### analysis-runner.js Progress Checkpoints

```javascript
sendProgress(0, 0, 'Starting analysis');       // Bar 1: 0%
sendProgress(5, 0, 'Validating inputs');       // Bar 1: 25%
sendProgress(15, 0, 'Preparing CLI');          // Bar 1: 75%
sendProgress(20, 1, 'Analyzing content');      // Bar 2: 0%

// Simulated progress during long CLI execution
// Interval: Every 3 seconds, +2% from 20% → 70%
// This keeps Bar 2 moving smoothly

sendProgress(75, 1, 'Analysis complete');      // Bar 2: 91%
sendProgress(80, 2, 'Generating reports');     // Bar 3: 0%
sendProgress(95, 2, 'Finalizing');             // Bar 3: 75%
sendProgress(100, 2, 'Complete');              // Bar 3: 100%
```

## Frontend Implementation

### ProgressIndicator.jsx

```javascript
const stageRanges = [
  { start: 0, end: 20 },    // Bar 1: Validation (20% of total)
  { start: 20, end: 80 },   // Bar 2: Analysis (60% of total)
  { start: 80, end: 100 }   // Bar 3: Finalization (20% of total)
];
```

### ProgressStage.jsx

Each stage renders a progress fill based on percentage within its range:

```jsx
<div className="progress-fill" style={{ width: `${progress}%` }} />
```

## CSS Animation

- **Transition:** `width 0.5s ease-out`
- **Update Frequency:** Every 3 seconds during analysis
- **Smooth Animation:** No jumps, continuous flow

## User Experience Goals

✅ **No "Stuck" Appearance** - Bar 2 continuously moves during long analysis
✅ **Accurate Timing** - Bars fill proportionally to actual process time
✅ **Visual Feedback** - User always sees progress, never a frozen UI
✅ **Predictable Duration** - Bar sizes hint at relative phase duration

## Testing Notes

- Tested with Gemini CLI (~72 seconds total)
- Bar 1 fills in ~5 seconds ✓
- Bar 2 fills gradually over ~60 seconds ✓
- Bar 3 fills in ~7 seconds ✓
- No janky animations or layout shifts ✓

## Future Improvements

- [ ] Add time remaining estimate based on provider and file size
- [ ] Learn from past analyses to improve time predictions
- [ ] Add pause/cancel functionality
