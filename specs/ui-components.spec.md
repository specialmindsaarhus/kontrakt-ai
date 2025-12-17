# UI Components Specification

## Overview

This document defines the React component interfaces for the Contract Reviewer application. All components follow the approved visual design in `mockups/main-screen-v4.html`.

**Design System Reference:**
- **Colors:** `#0d1321` (dark), `#2563eb` (accent), `#10b981` (success), `#dc2626` (error), `#FAFAFA` (background)
- **Typography:** Inter font family, weights 400/500/600
- **Spacing:** Expressive spacing (48px, 64px, 72px for rhythm)
- **Transitions:** 400ms consistent timing

---

## Component Architecture

```
App (root)
├── AppHeader
│   ├── Logo
│   └── HamburgerMenu
├── DropZone
├── PromptSelector
├── OutputButtons
└── StatusArea
    ├── StatusMessage
    └── ProgressIndicator
```

---

## 1. App Component

**File:** `src/App.jsx`

Root application component that manages global state and coordinates child components.

### Props
None (root component)

### State
```javascript
{
  // Current UI state: 'idle' | 'prompt-selected' | 'file-hover' | 'analysis-running' | 'completed' | 'error'
  uiState: string,

  // Selected prompt type: 'franchise-contract-review' | 'franchise-manual-review' | 'compliance-check' | null
  selectedPrompt: string | null,

  // Uploaded document file
  documentFile: File | null,

  // Analysis result from backend
  analysisResult: {
    output: string,
    executionTime: number,
    reportPaths: {
      pdf: string,
      docx: string,
      md: string
    }
  } | null,

  // Error information
  error: {
    message: string,
    suggestions: string,
    errorCode: string
  } | null,

  // Client name for report generation
  clientName: string,

  // Available CLI providers from backend
  availableProviders: Array<{
    name: string,
    displayName: string,
    available: boolean,
    version: string
  }>,

  // Selected CLI provider
  selectedProvider: string
}
```

### Methods
```javascript
// Handle prompt selection
handlePromptSelect(promptName: string): void

// Handle file drop/upload
handleFileUpload(file: File): void

// Start analysis workflow
startAnalysis(): Promise<void>

// Export report in specific format
exportReport(format: 'pdf' | 'docx' | 'md'): void

// Reset to idle state
resetState(): void

// Handle errors
handleError(error: Error): void
```

### Lifecycle
- **Mount:** Load user settings via IPC, detect available CLI providers
- **Unmount:** Save current state to settings

### Layout
```jsx
<div className="app-container">
  <AppHeader onMenuClick={handleMenuClick} />
  <DropZone
    state={uiState}
    onFileUpload={handleFileUpload}
    filename={documentFile?.name}
  />
  <PromptSelector
    selected={selectedPrompt}
    onSelect={handlePromptSelect}
    visible={uiState === 'idle' || uiState === 'prompt-selected'}
  />
  <OutputButtons
    visible={uiState === 'completed'}
    onExport={exportReport}
  />
  <StatusArea
    state={uiState}
    error={error}
    executionTime={analysisResult?.executionTime}
    onRetry={resetState}
  />
</div>
```

---

## 2. AppHeader Component

**File:** `src/components/AppHeader.jsx`

Top header with logo and hamburger menu.

### Props
```javascript
{
  onMenuClick: () => void  // Callback when hamburger menu is clicked
}
```

### State
None (stateless component)

### Structure
```jsx
<div className="app-header">
  <Logo />
  <HamburgerMenu onClick={props.onMenuClick} />
</div>
```

### Styling
- `display: flex`, `justify-content: space-between`
- `margin-bottom: 48px` (expressive spacing)

---

## 3. Logo Component

**File:** `src/components/Logo.jsx`

Circular logo with "K" letter.

### Props
None

### State
None (stateless component)

### Structure
```jsx
<div className="app-logo">K</div>
```

### Styling
```css
.app-logo {
  width: 48px;
  height: 48px;
  background: #0d1321;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
```

---

## 4. HamburgerMenu Component

**File:** `src/components/HamburgerMenu.jsx`

Hamburger menu button (opens settings/options).

### Props
```javascript
{
  onClick: () => void  // Callback when clicked
}
```

### State
```javascript
{
  isHovered: boolean  // Hover state for opacity transition
}
```

### Structure
```jsx
<button
  className="hamburger-menu"
  onClick={props.onClick}
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  <MenuIcon size={20} />
</button>
```

### Styling
```css
.hamburger-menu {
  background: transparent;
  color: #0d1321;
  opacity: 0.6;
  transition: 400ms;
}

.hamburger-menu:hover {
  opacity: 1;
}
```

### Icons
Uses **Lucide React** `Menu` icon

---

## 5. DropZone Component

**File:** `src/components/DropZone.jsx`

Main drag-and-drop area for document upload. This is the hero element.

### Props
```javascript
{
  // Current UI state for visual feedback
  state: 'idle' | 'prompt-selected' | 'file-hover' | 'analysis-running' | 'completed' | 'error',

  // File upload callback
  onFileUpload: (file: File) => void,

  // Current filename (if file uploaded)
  filename: string | null
}
```

### State
```javascript
{
  isDragOver: boolean  // True when user is dragging file over zone
}
```

### Event Handlers
```javascript
handleDragEnter(e: DragEvent): void {
  e.preventDefault();
  setIsDragOver(true);
}

handleDragLeave(e: DragEvent): void {
  e.preventDefault();
  setIsDragOver(false);
}

handleDragOver(e: DragEvent): void {
  e.preventDefault();
}

handleDrop(e: DragEvent): void {
  e.preventDefault();
  setIsDragOver(false);

  const file = e.dataTransfer.files[0];
  if (file) {
    props.onFileUpload(file);
  }
}

handleClick(): void {
  // Open file picker
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.pdf,.docx';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) props.onFileUpload(file);
  };
  input.click();
}
```

### Dynamic Icon
Icon changes based on `state` prop:
- **idle/prompt-selected:** `UploadCloud` (size 56)
- **file-hover:** `ArrowDownCircle` (size 56)
- **analysis-running:** `Loader` (size 48, spinning)
- **completed:** `CheckCircle` (size 56, animated pop-in)
- **error:** `AlertTriangle` (size 56, red)

### Dynamic Text
Text changes based on `state` prop:
- **idle:** "Træk dokument hertil"
- **prompt-selected:** "Klar til at modtage"
- **file-hover:** "Slip for at uploade"
- **analysis-running:** Show `filename` prop
- **completed:** Show `filename` prop
- **error:** Hidden

### Styling States
```css
/* Default */
.drop-zone {
  border: 1px solid rgba(13, 19, 33, 0.1);
  background: white;
}

/* Hover */
.drop-zone:hover {
  border-color: #0d1321;
  border-width: 2px;
  background: #fafafa;
}

/* isDragOver (file hovering) */
.drop-zone.hovering {
  border-color: #0d1321;
  border-width: 3px;
  background: #f5f5f5;
}

/* analysis-running */
.drop-zone.processing {
  border-color: #0d1321;
  border-width: 2px;
  cursor: not-allowed;
}

/* completed */
.drop-zone.completed {
  border-color: #0d1321;
  border-width: 3px;
  background: white;
}

/* error */
.drop-zone.error {
  border-color: #dc2626;
  border-width: 3px;
  background: rgba(220, 38, 38, 0.02);
}
```

### Animations
**Success checkmark animation:**
```css
@keyframes checkmarkPop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
```
Apply to `CheckCircle` icon with `cubic-bezier(0.68, -0.55, 0.265, 1.55)` easing.

**Spinner animation:**
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```
Apply to `Loader` icon with `linear` easing, `infinite` loop, 2s duration.

### File Validation
Before calling `onFileUpload`, validate:
- File extension: `.txt`, `.pdf`, `.docx` only
- File size: Maximum 10MB
- If invalid, show error state with appropriate message

---

## 6. PromptSelector Component

**File:** `src/components/PromptSelector.jsx`

Three-button selector for prompt type (Kontrakt, Manual, Compliance).

### Props
```javascript
{
  // Currently selected prompt
  selected: 'franchise-contract-review' | 'franchise-manual-review' | 'compliance-check' | null,

  // Selection callback
  onSelect: (promptName: string) => void,

  // Visibility toggle
  visible: boolean
}
```

### State
None (controlled component)

### Structure
```jsx
<div className={`prompt-buttons ${!props.visible && 'hidden'}`}>
  <PromptButton
    label="Kontrakt"
    promptName="franchise-contract-review"
    selected={props.selected === 'franchise-contract-review'}
    onClick={() => props.onSelect('franchise-contract-review')}
  />
  <PromptButton
    label="Manual"
    promptName="franchise-manual-review"
    selected={props.selected === 'franchise-manual-review'}
    onClick={() => props.onSelect('franchise-manual-review')}
  />
  <PromptButton
    label="Compliance"
    promptName="compliance-check"
    selected={props.selected === 'compliance-check'}
    onClick={() => props.onSelect('compliance-check')}
  />
</div>
```

### Styling
```css
.prompt-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 32px;
}
```

---

## 7. PromptButton Component

**File:** `src/components/PromptButton.jsx`

Individual button for prompt selection.

### Props
```javascript
{
  label: string,           // Display text (e.g., "Kontrakt")
  promptName: string,      // Internal prompt identifier
  selected: boolean,       // Whether this button is selected
  onClick: () => void      // Click callback
}
```

### State
```javascript
{
  isHovered: boolean  // Hover state for border thickness
}
```

### Styling States
```css
/* Default (unselected) */
.prompt-btn {
  background-color: white;
  border: 1px solid rgba(13, 19, 33, 0.15);
  color: #0d1321;
  font-weight: 500;
  transition: 400ms;
}

/* Hover (unselected) */
.prompt-btn:hover {
  border-color: #0d1321;
  border-width: 2px;
  font-weight: 600;
}

/* Selected */
.prompt-btn.selected {
  background-color: #0d1321;
  border-color: #0d1321;
  color: white;
  font-weight: 600;
}
```

### Behavior
- Click triggers `onClick` callback
- Hover increases border thickness from 1px → 2px
- Selected state has dark background, white text

---

## 8. OutputButtons Component

**File:** `src/components/OutputButtons.jsx`

Three export buttons (Word, PDF, Markdown) shown after analysis completes.

### Props
```javascript
{
  visible: boolean,                      // Show/hide buttons
  onExport: (format: string) => void     // Export callback
}
```

### State
None (stateless component)

### Structure
```jsx
<div className={`output-buttons ${!props.visible && 'hidden'}`}>
  <OutputButton label="Word" format="docx" onClick={() => props.onExport('docx')} />
  <OutputButton label="PDF" format="pdf" onClick={() => props.onExport('pdf')} />
  <OutputButton label="Markdown" format="md" onClick={() => props.onExport('md')} />
</div>
```

### Styling
Same as `prompt-buttons` layout (flex, gap, centered)

---

## 9. OutputButton Component

**File:** `src/components/OutputButton.jsx`

Individual export button.

### Props
```javascript
{
  label: string,       // Display text (e.g., "Word")
  format: string,      // Export format identifier
  onClick: () => void  // Click callback
}
```

### State
```javascript
{
  isHovered: boolean
}
```

### Styling
```css
.output-btn {
  background-color: white;
  border: 1px solid rgba(13, 19, 33, 0.15);
  color: #0d1321;
  font-weight: 500;
  transition: 400ms;
}

.output-btn:hover {
  background-color: #0d1321;
  border-color: #0d1321;
  color: white;
  font-weight: 600;
}
```

### Behavior
- Hover reverses colors (dark background, white text)
- Click triggers `onClick` callback
- On successful export, could show brief success toast (future enhancement)

---

## 10. StatusArea Component

**File:** `src/components/StatusArea.jsx`

Status messages and feedback below main interaction area.

### Props
```javascript
{
  // Current UI state
  state: 'idle' | 'prompt-selected' | 'file-hover' | 'analysis-running' | 'completed' | 'error',

  // Error information (when state === 'error')
  error: {
    message: string,
    suggestions: string,
    errorCode: string
  } | null,

  // Execution time in milliseconds (when state === 'completed')
  executionTime: number | null,

  // Retry callback (shown in error state)
  onRetry: () => void
}
```

### State
```javascript
{
  currentStage: number  // Current progress stage (0-2) during analysis
}
```

### Dynamic Content Based on State

**idle / prompt-selected / file-hover:**
- Show nothing (empty area)

**analysis-running:**
```jsx
<StatusMessage text="Analyserer indhold" />
<StatusTime text="Ca. 60 sekunder" />
<ProgressIndicator currentStage={currentStage} totalStages={3} />
```
Stages:
1. "Analyserer indhold"
2. "Genererer rapport"
3. Complete

**completed:**
```jsx
<StatusTime text={`${Math.round(executionTime / 1000)} sekunder`} />
```
Note: NO "Færdig" text - animation is the feedback

**error:**
```jsx
<ErrorMessage
  message={error.message}
  suggestions={error.suggestions}
  onRetry={onRetry}
/>
```

### Styling
```css
.status-area {
  min-height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
```

---

## 11. StatusMessage Component

**File:** `src/components/StatusMessage.jsx`

Status text during analysis.

### Props
```javascript
{
  text: string  // Status message to display
}
```

### State
None (stateless component)

### Structure
```jsx
<div className="status-message">{props.text}</div>
```

### Styling
```css
.status-message {
  font-size: 16px;
  color: #0d1321;
  margin-bottom: 8px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-align: center;
}
```

---

## 12. StatusTime Component

**File:** `src/components/StatusTime.jsx`

Time estimate or elapsed time display.

### Props
```javascript
{
  text: string  // Time text (e.g., "Ca. 60 sekunder" or "58 sekunder")
}
```

### State
None (stateless component)

### Structure
```jsx
<div className="status-time">{props.text}</div>
```

### Styling
```css
.status-time {
  font-size: 13px;
  color: rgba(13, 19, 33, 0.5);
  margin-bottom: 16px;
}
```

---

## 13. ProgressIndicator Component

**File:** `src/components/ProgressIndicator.jsx`

Three-stage progress bar during analysis.

### Props
```javascript
{
  currentStage: number,  // Current active stage (0-2)
  totalStages: number    // Total number of stages (always 3)
}
```

### State
None (controlled component)

### Structure
```jsx
<div className="status-progress">
  <ProgressStage active={currentStage >= 0} />
  <ProgressStage active={currentStage >= 1} />
  <ProgressStage active={currentStage >= 2} />
</div>
```

### Animation
Each stage animates in with `progressFill` animation:
```css
@keyframes progressFill {
  from { width: 0%; }
  to { width: 100%; }
}

.progress-stage.active::after {
  animation: progressFill 0.4s ease-out forwards;
}
```

### Styling
```css
.status-progress {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.progress-stage {
  width: 60px;
  height: 3px;
  background: rgba(13, 19, 33, 0.1);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.progress-stage.active::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: #0d1321;
}
```

---

## 14. ProgressStage Component

**File:** `src/components/ProgressStage.jsx`

Individual progress stage bar.

### Props
```javascript
{
  active: boolean  // Whether this stage is active/completed
}
```

### State
None (stateless component)

### Structure
```jsx
<div className={`progress-stage ${props.active && 'active'}`}></div>
```

---

## 15. ErrorMessage Component

**File:** `src/components/ErrorMessage.jsx`

Error display with suggestions and retry button.

### Props
```javascript
{
  message: string,      // Main error message
  suggestions: string,  // Recovery suggestions
  onRetry: () => void   // Retry callback
}
```

### State
None (stateless component)

### Structure
```jsx
<>
  <div className="error-message">{props.message}</div>
  <div className="error-suggestions">{props.suggestions}</div>
  <button className="retry-btn" onClick={props.onRetry}>
    Prøv igen
  </button>
</>
```

### Styling
```css
.error-message {
  color: #dc2626;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  letter-spacing: -0.01em;
  text-align: center;
}

.error-suggestions {
  font-size: 14px;
  color: rgba(13, 19, 33, 0.6);
  line-height: 1.6;
  margin-bottom: 16px;
  text-align: center;
}

.retry-btn {
  padding: 10px 24px;
  background-color: white;
  border: 1px solid rgba(13, 19, 33, 0.15);
  border-radius: 5px;
  cursor: pointer;
  transition: 400ms;
  color: #0d1321;
  font-weight: 500;
  font-size: 15px;
}

.retry-btn:hover {
  background-color: #0d1321;
  border-color: #0d1321;
  color: white;
  font-weight: 600;
}
```

---

## Component Dependencies

### Required NPM Packages
```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "lucide-react": "^0.263.x"
}
```

### Icon Usage (Lucide React)
```javascript
import {
  UploadCloud,
  ArrowDownCircle,
  Loader,
  CheckCircle,
  AlertTriangle,
  Menu
} from 'lucide-react';
```

---

## Styling Architecture

### CSS Organization
All component styles should be in `src/index.css` (single stylesheet approach):
- Global styles and resets
- Layout utilities
- Component-specific classes
- Animation keyframes

### CSS Custom Properties
Define color palette as CSS variables:
```css
:root {
  --color-dark: #0d1321;
  --color-accent: #2563eb;
  --color-success: #10b981;
  --color-error: #dc2626;
  --color-background: #FAFAFA;

  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  --transition-standard: 400ms;
}
```

### No CSS Modules
Use plain CSS classes (no CSS modules, no styled-components) to match mockup simplicity.

---

## Accessibility Requirements

### Keyboard Navigation
- All buttons must be keyboard accessible (native `<button>` elements)
- DropZone must support Enter/Space to open file picker
- Tab order: Logo → Menu → DropZone → Prompt buttons → Output buttons

### ARIA Labels
```jsx
<button aria-label="Open menu">...</button>
<button aria-label="Select contract review prompt">Kontrakt</button>
<div role="button" aria-label="Drop zone for document upload">...</div>
```

### Focus States
All interactive elements must have visible focus states:
```css
button:focus-visible {
  outline: 2px solid #0d1321;
  outline-offset: 2px;
}
```

---

## Testing Requirements

Each component must have unit tests covering:
- Rendering with different props
- State transitions
- Event handling
- Accessibility (ARIA labels, keyboard navigation)
- Edge cases (missing props, null values)

**Test Framework:** Vitest + React Testing Library

**Example:**
```javascript
// tests/components/PromptSelector.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PromptSelector from '../src/components/PromptSelector';

describe('PromptSelector', () => {
  it('renders three prompt buttons', () => {
    render(<PromptSelector selected={null} onSelect={vi.fn()} visible={true} />);
    expect(screen.getByText('Kontrakt')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
  });

  it('calls onSelect when button clicked', () => {
    const handleSelect = vi.fn();
    render(<PromptSelector selected={null} onSelect={handleSelect} visible={true} />);

    fireEvent.click(screen.getByText('Kontrakt'));
    expect(handleSelect).toHaveBeenCalledWith('franchise-contract-review');
  });

  it('hides when visible is false', () => {
    const { container } = render(
      <PromptSelector selected={null} onSelect={vi.fn()} visible={false} />
    );
    expect(container.firstChild).toHaveClass('hidden');
  });
});
```

---

## Implementation Notes

### Component File Organization
```
src/
├── App.jsx                           # Root component
├── components/
│   ├── AppHeader.jsx
│   ├── Logo.jsx
│   ├── HamburgerMenu.jsx
│   ├── DropZone.jsx
│   ├── PromptSelector.jsx
│   ├── PromptButton.jsx
│   ├── OutputButtons.jsx
│   ├── OutputButton.jsx
│   ├── StatusArea.jsx
│   ├── StatusMessage.jsx
│   ├── StatusTime.jsx
│   ├── ProgressIndicator.jsx
│   ├── ProgressStage.jsx
│   └── ErrorMessage.jsx
├── index.css                         # All styles
└── main.jsx                          # React entry point
```

### Performance Considerations
- Use React.memo for stateless components (Logo, StatusMessage, etc.)
- Debounce file upload validation
- Lazy load icon library if bundle size becomes an issue

### Future Enhancements (Not MVP)
- Settings modal (opened by HamburgerMenu)
- Toast notifications for export success
- Markdown preview panel for analysis output
- Batch processing UI (multiple documents)
- Drag-to-reorder for batch queue
