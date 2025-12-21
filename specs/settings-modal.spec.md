# Settings Modal Component Specification

**File:** `src/components/SettingsModal.jsx`
**Status:** ⏳ Not Implemented
**Created:** 2025-12-20

## Overview

A full-height settings panel that slides out from the right side of the screen. Provides access to app styling, output preferences, session state, and recent document history. Auto-saves all changes with subtle feedback.

## User Requirements

**Goal:** Configure app appearance, output behavior, and access recent analyses.

**Access:** Click settings icon (gear/tandhjul) in header → Panel slides out from right

**Behavior:**
- Auto-save on every change (no Save button needed)
- Subtle toast notification confirms saves
- Close via X button, ESC key, or click outside
- Single scrolling page (all sections stacked vertically)

---

## Component Architecture

### Props

```javascript
{
  isOpen: boolean,           // Controls visibility
  onClose: () => void,       // Callback when modal closes
  settings: Object,          // Current settings from AppContext
  recentAnalyses: Array,     // Last 5 analyses from state
  onSettingChange: (key, value) => void  // Auto-save callback
}
```

### State

```javascript
{
  isClosing: boolean,        // Triggers slide-out animation
  uploadingLogo: boolean,    // Logo upload in progress
  showSaveToast: boolean     // "Gemt" notification visible
}
```

---

## Layout & Dimensions

### Panel Sizing
- **Width:** 480px (responsive, adjusts on smaller screens, max 90vw)
- **Height:** 100vh (full screen height)
- **Position:** Fixed to right edge of viewport

### Animation
- **Slide-in:** 400ms ease-out from right (transform: translateX(100%) → translateX(0))
- **Slide-out:** 400ms ease-in to right (transform: translateX(0) → translateX(100%))
- **Backdrop fade:** 400ms opacity transition (0 → 0.2 → 0)

### Backdrop Overlay
- **Color:** `rgba(0, 0, 0, 0.2)` (very subtle dim)
- **Click behavior:** Closes modal
- **Z-index:** 999 (backdrop), 1000 (panel)

---

## Structure & Sections

```
┌─────────────────────────────────────────────────┐
│  Indstillinger                          [X]      │ ← Header
├─────────────────────────────────────────────────┤
│                                                  │
│  ⚙ Udseende                                     │ ← Section 1: Style
│  ─────────────                                  │
│  Logo: [Vælg logo] logo-preview.png             │
│       (Upload via file picker)                  │
│                                                  │
│  🔧 Output Præferencer                          │ ← Section 2: Output
│  ─────────────────                              │
│  Standard formater:                             │
│    ☑ PDF    ☐ Word    ☐ Markdown               │
│                                                  │
│  ☐ Åbn rapporter automatisk efter generering    │
│                                                  │
│  📊 Seneste Provider                            │ ← Section 3: Session
│  ──────────────────                             │
│  Claude (senest brugt)                          │
│                                                  │
│  📂 Seneste Analyser                            │ ← Section 4: Recent
│  ─────────────────                              │
│  › Acme Corp • 18-12-2024 • Kontrakt           │
│  › Beta Ltd • 17-12-2024 • Manual              │
│  › Gamma AS • 15-12-2024 • Compliance          │
│  › Delta Corp • 14-12-2024 • Kontrakt          │
│  › Epsilon AB • 12-12-2024 • Manual            │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Section 1: Style Settings (Udseende)

### Current Features (Phase 1)

**Logo Upload:**
- **Label:** "Logo:"
- **Button:** "Vælg logo" (file picker)
- **Accepted formats:** PNG, JPG, SVG
- **Preview:** Shows current logo filename or thumbnail (64x64px)
- **Behavior:**
  - Click button → Opens file dialog
  - User selects image → Auto-saves to settings
  - Shows toast "Logo gemt"
  - Preview updates immediately

**Implementation:**
```jsx
<div className="settings-section">
  <h3>⚙ Udseende</h3>
  <div className="logo-upload">
    <label>Logo:</label>
    <button onClick={handleLogoUpload}>
      Vælg logo
    </button>
    {settings.logoPath && (
      <span className="logo-preview">
        {getFilename(settings.logoPath)}
      </span>
    )}
  </div>
</div>
```

### Future Features (Phase 2+)

**Company Name:**
```jsx
<div className="input-group">
  <label>Firmanavn:</label>
  <input
    type="text"
    value={settings.companyName}
    onChange={(e) => handleChange('companyName', e.target.value)}
    placeholder="Special Minds ApS"
  />
</div>
```

**Primary Color:**
```jsx
<div className="input-group">
  <label>Primær farve:</label>
  <input
    type="color"
    value={settings.primaryColor}
    onChange={(e) => handleChange('primaryColor', e.target.value)}
  />
  <span className="color-hex">{settings.primaryColor}</span>
</div>
```

---

## Section 2: Output Preferences (Output Præferencer)

### Default Formats

**Type:** Checkboxes (multi-select)
**Default:** Only PDF checked
**Behavior:** Auto-saves on toggle

```jsx
<div className="settings-section">
  <h3>🔧 Output Præferencer</h3>
  <div className="checkbox-group">
    <label>Standard formater:</label>
    <div className="checkbox-row">
      <label>
        <input
          type="checkbox"
          checked={settings.defaultFormats.includes('pdf')}
          onChange={() => toggleFormat('pdf')}
        />
        PDF
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.defaultFormats.includes('docx')}
          onChange={() => toggleFormat('docx')}
        />
        Word
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.defaultFormats.includes('md')}
          onChange={() => toggleFormat('md')}
        />
        Markdown
      </label>
    </div>
  </div>
</div>
```

### Auto-Open

**Type:** Checkbox (single toggle)
**Default:** Unchecked (false)
**Label:** "Åbn rapporter automatisk efter generering"

```jsx
<div className="checkbox-group">
  <label>
    <input
      type="checkbox"
      checked={settings.autoOpen}
      onChange={(e) => handleChange('autoOpen', e.target.checked)}
    />
    Åbn rapporter automatisk efter generering
  </label>
</div>
```

### Organization

**Status:** Fixed as `output/client/date/`
**No UI needed** - removed from settings (consistent behavior)

---

## Section 3: Session State (Seneste Provider)

**Purpose:** Display last used LLM provider (informational)

**Behavior:**
- Shows provider name (Claude, Gemini, OpenAI)
- Gray text: "(senest brugt)"
- Read-only display (not editable here - use ProviderSelector in main UI)

```jsx
<div className="settings-section">
  <h3>📊 Seneste Provider</h3>
  <p className="provider-display">
    {settings.lastProvider} <span className="muted">(senest brugt)</span>
  </p>
</div>
```

---

## Section 4: Recent Analyses (Seneste Analyser)

**Purpose:** Quick access to last 5 analyses

### Display Format

Each item shows:
- **Client name** (from metadata)
- **Date** (DD-MM-YYYY format)
- **Prompt type** (Kontrakt, Manual, Compliance)

**Visual style:**
- Clickable rows (hover effect)
- Bullet separator (•)
- Arrow icon (›) on left

**Click behavior:**
- Opens folder in Windows Explorer: `output/client-name/DD-MM-YYYY/`
- Uses IPC call to `shell.openPath()`

### Data Structure

```javascript
recentAnalyses: [
  {
    clientName: "Acme Corp",
    date: "2024-12-18",
    promptType: "franchise-contract-review",
    outputPath: "C:/path/to/output/acme-corp/18-12-2024"
  },
  // ... 4 more
]
```

### Implementation

```jsx
<div className="settings-section">
  <h3>📂 Seneste Analyser</h3>
  <div className="recent-list">
    {recentAnalyses.slice(0, 5).map((analysis, idx) => (
      <button
        key={idx}
        className="recent-item"
        onClick={() => openFolder(analysis.outputPath)}
      >
        <span className="arrow">›</span>
        <span className="client">{analysis.clientName}</span>
        <span className="separator">•</span>
        <span className="date">{formatDate(analysis.date)}</span>
        <span className="separator">•</span>
        <span className="prompt">{getPromptLabel(analysis.promptType)}</span>
      </button>
    ))}
  </div>
  {recentAnalyses.length === 0 && (
    <p className="empty-state">Ingen analyser endnu</p>
  )}
</div>
```

### Helper Functions

```javascript
function formatDate(isoDate) {
  // "2024-12-18" → "18-12-2024"
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}

function getPromptLabel(promptType) {
  const labels = {
    'franchise-contract-review': 'Kontrakt',
    'franchise-manual-review': 'Manual',
    'franchise-compliance-audit': 'Compliance'
  };
  return labels[promptType] || promptType;
}

async function openFolder(path) {
  await window.electronAPI.openPath(path);
}
```

---

## Close Behavior

### Three Ways to Close

1. **X Button** (top-right corner)
2. **ESC Key** (keyboard shortcut)
3. **Click Outside** (click backdrop overlay)

### Implementation

```jsx
function handleClose() {
  setIsClosing(true);  // Trigger slide-out animation
  setTimeout(() => {
    setIsClosing(false);
    props.onClose();   // Actually unmount after animation
  }, 400);
}

// ESC key listener
useEffect(() => {
  function handleEsc(e) {
    if (e.key === 'Escape' && props.isOpen) {
      handleClose();
    }
  }
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
}, [props.isOpen]);

// Click outside
<div className="modal-backdrop" onClick={handleClose}>
  <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
    {/* Panel content - stops click propagation */}
  </div>
</div>
```

---

## Auto-Save with Toast Feedback

### Auto-Save Behavior

**When:** Immediately on every change (input blur, checkbox toggle, file select)
**How:** Calls `props.onSettingChange(key, value)` → AppContext updates state → IPC saves to disk
**Debouncing:** 500ms debounce on text inputs (company name, colors in future)

### Toast Notification

**Trigger:** After successful save
**Message:** "Gemt" (simple, Danish for "Saved")
**Duration:** 2 seconds
**Position:** Bottom-right corner
**Style:** Small, unobtrusive, fades in/out

```jsx
function showSaveToast() {
  setShowSaveToast(true);
  setTimeout(() => setShowSaveToast(false), 2000);
}

async function handleChange(key, value) {
  try {
    await props.onSettingChange(key, value);
    showSaveToast();
  } catch (error) {
    console.error('Failed to save setting:', error);
    // Could show error toast here
  }
}
```

---

## Styling

### CSS Classes

```css
/* Modal container */
.settings-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.2);  /* Very subtle */
  z-index: 999;
  opacity: 0;
  transition: opacity 400ms ease-out;
}

.settings-modal-backdrop.open {
  opacity: 1;
}

/* Settings panel */
.settings-modal-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 480px;
  max-width: 90vw;  /* Responsive */
  height: 100vh;
  background: #FAFAFA;  /* Light gray background */
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 400ms ease-out;
  overflow-y: auto;
  padding: 0;
}

.settings-modal-panel.open {
  transform: translateX(0);
}

.settings-modal-panel.closing {
  transition: transform 400ms ease-in;
  transform: translateX(100%);
}

/* Header */
.settings-header {
  position: sticky;
  top: 0;
  background: #FAFAFA;
  padding: 24px;
  border-bottom: 1px solid #e5e5e5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
}

.settings-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #0d1321;
  margin: 0;
}

.close-button {
  background: transparent;
  border: none;
  color: #0d1321;
  opacity: 0.6;
  cursor: pointer;
  padding: 8px;
  transition: opacity 200ms;
}

.close-button:hover {
  opacity: 1;
}

/* Content area */
.settings-content {
  padding: 24px;
}

/* Section styling */
.settings-section {
  margin-bottom: 32px;
}

.settings-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #0d1321;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e5e5;
}

/* Input groups */
.input-group {
  margin-bottom: 16px;
}

.input-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #0d1321;
  margin-bottom: 8px;
}

.input-group input[type="text"],
.input-group input[type="email"] {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 200ms;
}

.input-group input:focus {
  outline: none;
  border-color: #2563eb;
}

/* Checkbox groups */
.checkbox-group {
  margin-bottom: 16px;
}

.checkbox-row {
  display: flex;
  gap: 24px;
  margin-top: 8px;
}

.checkbox-row label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #0d1321;
  cursor: pointer;
}

.checkbox-row input[type="checkbox"] {
  cursor: pointer;
}

/* Logo upload */
.logo-upload {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-upload label {
  font-size: 14px;
  font-weight: 500;
  color: #0d1321;
}

.logo-upload button {
  padding: 8px 16px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #0d1321;
  cursor: pointer;
  transition: all 200ms;
}

.logo-upload button:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.logo-preview {
  font-size: 13px;
  color: #6b7280;
}

/* Recent analyses list */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  font-size: 14px;
  color: #0d1321;
  cursor: pointer;
  text-align: left;
  transition: all 200ms;
  width: 100%;
}

.recent-item:hover {
  border-color: #2563eb;
  background: #f8fafc;
}

.recent-item .arrow {
  color: #9ca3af;
  font-weight: 600;
}

.recent-item .separator {
  color: #d1d5db;
}

.recent-item .client {
  font-weight: 500;
}

.recent-item .date,
.recent-item .prompt {
  color: #6b7280;
}

.empty-state {
  font-size: 14px;
  color: #9ca3af;
  font-style: italic;
  text-align: center;
  padding: 24px;
}

/* Provider display */
.provider-display {
  font-size: 14px;
  color: #0d1321;
}

.provider-display .muted {
  color: #9ca3af;
  font-size: 13px;
}

/* Save toast */
.save-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #10b981;  /* Success green */
  color: white;
  padding: 12px 20px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  opacity: 0;
  transform: translateY(10px);
  transition: all 300ms ease-out;
}

.save-toast.show {
  opacity: 1;
  transform: translateY(0);
}
```

---

## Integration with AppContext

### State Updates

Settings are stored in AppContext state:

```javascript
// In AppContext state
{
  settings: {
    // Style
    logoPath: null,              // Phase 1
    companyName: "",             // Phase 2
    primaryColor: "#0d1321",     // Phase 2

    // Output
    defaultFormats: ["pdf"],     // Only PDF by default
    autoOpen: false,

    // Session
    lastProvider: "claude",      // Auto-saved from ProviderSelector
    lastPrompt: null,

    // Recent (derived from analysis history)
    recentAnalyses: []           // Populated from completed analyses
  }
}
```

### IPC Integration

**Needed IPC Methods:**
1. `window.electronAPI.selectFile(filters)` - Open file picker for logo
2. `window.electronAPI.openPath(path)` - Open folder in Explorer

**Existing IPC Methods:**
- `window.electronAPI.saveSettings(settings)` - Auto-save (already implemented)
- `window.electronAPI.loadSettings()` - Load on mount (already implemented)

### Adding to IPC (if not exists)

```javascript
// electron/preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods

  selectFile: (filters) => ipcRenderer.invoke('dialog:selectFile', filters),
  openPath: (path) => ipcRenderer.invoke('shell:openPath', path)
});
```

```javascript
// electron/main.js
const { dialog, shell } = require('electron');

ipcMain.handle('dialog:selectFile', async (event, filters) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: filters || [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }
    ]
  });

  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('shell:openPath', async (event, path) => {
  await shell.openPath(path);
});
```

---

## Usage Example

```jsx
import SettingsModal from './components/SettingsModal';

function App() {
  const { state, dispatch } = useAppContext();
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function handleSettingChange(key, value) {
    // Update context
    dispatch({ type: 'UPDATE_SETTING', payload: { key, value } });

    // Auto-save to disk
    const updatedSettings = { ...state.settings, [key]: value };
    await window.electronAPI.saveSettings(updatedSettings);
  }

  return (
    <>
      <Header onSettingsClick={() => setSettingsOpen(true)} />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={state.settings}
        recentAnalyses={state.recentAnalyses}
        onSettingChange={handleSettingChange}
      />
    </>
  );
}
```

---

## Testing Checklist

### Visual Testing
- [ ] Panel slides in from right at correct speed (400ms)
- [ ] Backdrop dims background subtly (rgba(0,0,0,0.2))
- [ ] Panel width is responsive (480px on desktop, 90vw on mobile)
- [ ] All sections visible without horizontal scrolling
- [ ] Smooth scrolling for long content

### Interaction Testing
- [ ] X button closes modal
- [ ] ESC key closes modal
- [ ] Click outside closes modal
- [ ] Click inside panel does NOT close modal
- [ ] Logo picker opens file dialog
- [ ] Logo preview updates after upload
- [ ] Checkboxes toggle correctly
- [ ] Auto-open checkbox saves state

### Auto-Save Testing
- [ ] Logo upload saves immediately
- [ ] Checkbox changes save immediately
- [ ] Toast appears after save
- [ ] Toast disappears after 2 seconds
- [ ] Settings persist across app restarts

### Recent Analyses Testing
- [ ] Shows last 5 analyses
- [ ] Displays correct format (client • date • prompt)
- [ ] Click opens correct folder in Explorer
- [ ] Empty state shows when no analyses exist
- [ ] List updates after completing new analysis

### Accessibility Testing
- [ ] Focus trap (Tab cycles within modal when open)
- [ ] Focus returns to trigger button on close
- [ ] Keyboard navigation works for all controls
- [ ] Screen reader announces modal opening
- [ ] Labels properly associated with inputs

---

## Future Enhancements (Phase 2+)

### Style Section Additions
1. **Company Name** input field
2. **Primary Color** picker with hex preview
3. **Contact Email** input
4. **Contact Phone** input
5. **Logo Preview** - actual thumbnail instead of filename

### Advanced Features
1. **Reset to Defaults** button
2. **Import/Export Settings** (JSON file)
3. **Keyboard shortcuts** configuration
4. **Theme toggle** (light/dark mode)
5. **Language selection** (Danish/English)

### Analytics & Insights
1. **Usage statistics** (total analyses run, most used prompt)
2. **Recent analyses** - expand to show more details on hover
3. **Quick actions** - "Run same analysis" button for recent items

---

## Dependencies

**React Hooks:**
- `useState` - Local state (closing animation, toast visibility)
- `useEffect` - ESC key listener, mount/unmount cleanup
- `useRef` - Focus management

**External Libraries:**
- `lucide-react` - Icons (Settings gear, X close)
- None others needed for Phase 1

**Electron APIs:**
- `ipcRenderer` - Settings save/load, file picker, open folder
- Exposed via `window.electronAPI` in preload.js

---

## Implementation Priority

### Phase 1 (MVP) - Immediate Implementation
✅ Basic modal structure and animation
✅ Logo upload (file picker)
✅ Default formats checkboxes (PDF default)
✅ Auto-open checkbox
✅ Recent analyses list (read-only)
✅ Auto-save with toast feedback
✅ Close behavior (X, ESC, click outside)

### Phase 2 - Near Future
⏳ Company name input
⏳ Primary color picker
⏳ Contact info fields
⏳ Logo thumbnail preview

### Phase 3 - Advanced
⏳ Reset to defaults
⏳ Import/export settings
⏳ Usage statistics
⏳ Theme toggle

---

## Notes

- **Organization setting removed** - folder structure fixed as `output/client/date/` (user preference)
- **Provider selection** remains in main UI (ProviderSelector component) - settings only shows last used
- **Recent analyses** stored in AppContext state, populated from completed analysis metadata
- **Auto-save debouncing** prevents excessive disk writes during typing (500ms delay)
- **Accessibility critical** - modal must be keyboard-navigable and screen-reader friendly
- **Animation performance** - use CSS transforms (not position) for smooth 60fps animation

---

**End of Specification**
