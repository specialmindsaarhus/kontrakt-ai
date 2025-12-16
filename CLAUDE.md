# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Status

**Last Updated:** 2025-12-16
**GitHub Repository:** https://github.com/specialmindsaarhus/kontrakt-ai.git

**Completed Phases:**
- ✅ **Phase 0:** Git & GitHub setup (Initial commit pushed)
- ✅ **Phase 1:** Basic Electron + React + Tailwind setup (All core files created and pushed)

**Current Phase:** Phase 2 - Claude CLI Integration (pending)

**Next Immediate Steps:**
1. Run `npm install` to install all dependencies
2. Test Phase 1 setup with `npm run dev` (optional but recommended)
3. Implement Phase 2: Claude CLI adapter and integration

### Key Files Created

**Configuration Files:**
- `package.json` - Project dependencies and scripts
- `vite.config.js` - Vite bundler configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS for Tailwind processing
- `.gitignore` - Git ignore rules

**Application Files:**
- `electron/main.js` - Electron main process (creates app window)
- `index.html` - HTML entry point
- `src/main.jsx` - React application entry point
- `src/App.jsx` - Main React component with basic UI
- `src/index.css` - Tailwind CSS directives

**Documentation:**
- `CLAUDE.md` - This file (project documentation)
- Implementation plan: `~/.claude/plans/shimmying-doodling-thacker.md`

## Resuming Development

If you're resuming work on this project after a break, follow these steps:

### 1. Install Dependencies (First Time Only)
```bash
npm install
```
This installs all packages defined in `package.json`.

### 2. Test Current Setup
```bash
npm run dev
```
This should launch the Electron app with a basic welcome screen. If successful, you'll see:
- Electron window opens
- "Contract Reviewer" header
- Welcome message with status indicator

### 3. Review Implementation Plan
The detailed implementation plan is located at:
```
~/.claude/plans/shimmying-doodling-thacker.md
```
This file contains the complete phase-by-phase implementation strategy.

### 4. Check Current Branch and Commits
```bash
git status           # Check current state
git log --oneline    # View commit history
git pull origin main # Get latest changes
```

### 5. Continue with Next Phase
Refer to the "Next Steps" section below for the current phase implementation details.

## Project Overview

Contract Review GUI is an Electron-based desktop application for Windows and macOS that provides a user-friendly interface for reviewing franchise-related documents using multiple LLM CLI solutions (Gemini CLI, Claude CLI, OpenAI CLI). The application allows users to drag-and-drop documents and reference materials, then receives structured feedback from the LLM without exposing CLI complexity.

**End User Profile:**
The primary user is a franchise concept consultant who creates and reviews contracts and franchise manuals for clients. This tool enables them to:
- Quickly review franchise agreements for legal risks and clarity issues
- Analyze franchise operations manuals for completeness and consistency
- Generate professional, client-facing reports from LLM analysis
- Leverage their existing CLI subscriptions without needing API integrations
- Use customized system prompts tailored to different document types

**Key Design Principles:**
- CLI-based: Built on top of CLI solutions (no API connections), user leverages their existing subscriptions
- Local-first: No cloud uploads, all processing happens locally for security/privacy and client confidentiality
- Multi-LLM support: Users choose between Gemini CLI, Claude CLI, or OpenAI CLI based on preference/subscription
- Simple UX: Hides CLI subcommands and complexity behind drag-and-drop interface
- Flexible prompts: Multiple preset system prompts for different review types (contracts, manuals, compliance)
- Professional output: Generate polished, client-ready reports (PDF/Word) from review results

## Architecture

### Application Structure

```
contract-reviewer/
├─ electron-app/          # Electron frontend
│   ├─ main.js            # Electron main process
│   ├─ renderer.js        # UI logic (drag-drop, subprocess calls)
│   └─ index.html         # Application layout
├─ documents/             # User-dropped documents (temp storage)
├─ reference-docs/        # User-dropped reference materials
├─ output/                # Generated client reports (PDF/Word)
├─ scripts/
│   ├─ cli-runner.js      # Universal CLI wrapper (supports multiple LLMs)
│   ├─ gemini-adapter.js  # Gemini CLI subcommands adapter
│   ├─ claude-adapter.js  # Claude CLI subcommands adapter
│   ├─ openai-adapter.js  # OpenAI CLI subcommands adapter
│   └─ report-generator.js # PDF/Word report generation
├─ prompts/               # System prompts library
│   ├─ franchise-contract-review.md
│   ├─ franchise-manual-review.md
│   └─ compliance-check.md
└─ package.json
```

### Data Flow

1. User selects CLI provider (Gemini/Claude/OpenAI) from dropdown
2. User selects review type from dropdown → loads corresponding system prompt from `./prompts/`
3. User drags document (contract/manual, Word/PDF/text) → saved to `./documents/`
4. User drags reference materials → saved to `./reference-docs/`
5. User clicks "Run" → GUI calls `scripts/cli-runner.js` with selected CLI and prompt
6. Script converts files (PDF/Word → text) if needed
7. Appropriate CLI adapter (`gemini-adapter.js`, `claude-adapter.js`, or `openai-adapter.js`) constructs CLI command with subcommands
8. Script executes CLI command with system prompt and context documents
9. CLI outputs to stdout → Node.js reads and parses
10. GUI displays structured output in preview
11. User clicks "Export Report" → `report-generator.js` creates professional PDF/Word document in `./output/`

### File Conversion Pipeline

Before passing files to any CLI, the app must convert:
- PDF → text (use `pdf-parse` npm package)
- Word (.docx) → text (use `docx` or `mammoth` npm package)
- Plain text → pass through as-is

## System Prompts Library

The `./prompts/` folder contains multiple preset system prompts for different review types. Each prompt must produce structured output.

### Franchise Contract Review (`franchise-contract-review.md`)
Focus: Legal risks, unclear clauses, missing protections, territorial rights, fees, termination clauses
Output format:
```markdown
## Kort vurdering
[Brief assessment of contract strength]

## Juridiske risici
[Legal risks for franchisee/franchisor]

## Uklare eller svage formuleringer
[Unclear or weak language that could cause disputes]

## Forslag til forbedringer
[Specific alternative clauses and improvements]

## Manglende klausuler
[Missing standard franchise clauses]

## Anbefalinger til klient
[Next steps and recommendations for client]
```

### Franchise Manual Review (`franchise-manual-review.md`)
Focus: Completeness, operational clarity, consistency with contract, brand standards, training adequacy
Output format:
```markdown
## Overordnet vurdering
[Assessment of manual completeness and quality]

## Manglende sektioner
[Missing operational sections]

## Uklare eller modstridende instruktioner
[Unclear or contradictory instructions]

## Forslag til forbedringer
[Improvements for clarity and completeness]

## Konsistens med franchisekontrakt
[Alignment issues between manual and contract]

## Anbefalinger
[Recommendations for manual enhancement]
```

All prompts instruct the LLM to use both the primary document and reference materials as context.

## CLI Integration Architecture

### Universal CLI Runner (`scripts/cli-runner.js`)
The main entry point that orchestrates CLI execution:
- Accepts: `cliProvider` (gemini/claude/openai), `documentPath`, `referencePath`, `systemPromptPath`
- Routes to appropriate adapter based on `cliProvider`
- Captures stdout/stderr from CLI subprocess
- Returns structured JSON: `{success: boolean, output: string, error?: string, provider: string}`
- Handles CLI errors gracefully (CLI not installed, invalid files, timeout, etc.)

Example invocation from renderer.js:
```javascript
const result = await runCLI({
  provider: 'claude',  // or 'gemini' or 'openai'
  document: './documents/franchise-agreement.pdf',
  references: './reference-docs/',
  systemPrompt: './prompts/franchise-contract-review.md'
});
```

### CLI Adapters
Each adapter (`gemini-adapter.js`, `claude-adapter.js`, `openai-adapter.js`) must:
- Construct CLI-specific subcommands and arguments
- Handle provider-specific file input methods
- Map system prompts to provider-specific parameters
- Normalize output format to common structure

**Gemini CLI Example:**
```bash
gemini chat --file ./documents/contract.txt --context ./reference-docs/ --system-prompt ./prompts/franchise-contract-review.md
```

**Claude CLI Example:**
```bash
claude --files ./documents/contract.txt --mcp-context ./reference-docs/ --system ./prompts/franchise-contract-review.md
```

**OpenAI CLI Example:**
```bash
openai api chat.completions.create --file ./documents/contract.txt --additional-context ./reference-docs/ --system-message ./prompts/franchise-contract-review.md
```

Note: Exact CLI subcommands and flags may vary. Adapters must accommodate each provider's specific command structure.

## UI/UX Layout

**Top toolbar:**
- **CLI Provider dropdown:** Select between Gemini CLI, Claude CLI, or OpenAI CLI
- **Review Type dropdown:** Select prompt (Franchise Contract Review, Franchise Manual Review, Compliance Check)

**Main area:**
- **Left panel:** Document drag-and-drop zone (contracts, manuals)
- **Right panel:** Reference materials drag-and-drop zone (templates, policies, past contracts)

**Control area:**
- **Center:** Large "Run Review" button with status indicator ("Analyzing...", "Complete")

**Results area:**
- **Preview panel:** Scrollable output area with markdown rendering and section navigation
- **Export toolbar:**
  - "Export as PDF" button → generates professional client report
  - "Export as Word" button → generates editable client report
  - "Save as Markdown" button → saves raw markdown for archiving

**Status bar:**
- Shows selected CLI, active prompt, file counts, processing time

## Development Commands

### Setup (First Time)
```bash
npm install
```

### Run Development Mode
```bash
npm run dev              # Start Vite dev server only
npm run electron:dev     # Start Electron app with hot reload (recommended)
```

### Run Tests
```bash
npm test                 # Run Vitest unit tests
```

### Build for Production
```bash
npm run build           # Build for production
npm run build:win       # Build Windows .exe installer
npm run build:mac       # Build macOS .dmg installer
```

### Other Commands
```bash
npm run preview         # Preview production build
```

## MVP Checklist (Development Priority)

**Phase 1 - Single CLI Core (Choose Gemini or Claude to start):**
1. Basic Electron app structure (main.js, renderer.js, index.html)
2. Drag-and-drop document upload (single document)
3. Single system prompt (franchise contract review)
4. Subprocess call to one CLI (Gemini CLI or Claude CLI)
5. Display raw markdown output in GUI preview

**Phase 2 - Multi-CLI Support:**
6. CLI provider dropdown (Gemini, Claude, OpenAI)
7. CLI adapter architecture (`cli-runner.js` + individual adapters)
8. CLI availability detection and installation guidance
9. Drag-and-drop reference materials
10. PDF/Word → text conversion pipeline

**Phase 3 - Multiple Prompts:**
11. Review type dropdown in UI
12. Create `./prompts/` folder with preset prompts:
    - `franchise-contract-review.md`
    - `franchise-manual-review.md`
    - `compliance-check.md`
13. Dynamic prompt loading based on selection

**Phase 4 - Professional Report Generation:**
14. Parse and format structured output with section navigation
15. Report generator (`report-generator.js`)
16. Export as PDF with professional formatting (use `pdfkit` or `puppeteer`)
17. Export as Word/DOCX (use `officegen` or `docx` npm package)
18. Include branding, date, document metadata in reports

**Phase 5 - Polish & Production:**
19. Batch processing (queue multiple documents)
20. Persistent settings (remember last CLI, last prompt selection)
21. Output folder management (organize by client/date)
22. Error handling and user-friendly error messages
23. Build and package for Windows (.exe) and macOS (.dmg)

## Important Implementation Notes

### Multi-CLI Integration Strategy
- The app supports multiple CLI providers, user must have at least one installed
- On first run, detect available CLIs:
  - `which gemini` / `where gemini` (Gemini CLI)
  - `which claude` / `where claude` (Claude CLI)
  - `which openai` / `where openai` (OpenAI CLI)
- Show only available CLIs in dropdown (disable unavailable ones with install link)
- If no CLIs detected, show installation guide for all three options

### CLI Subscription Model
- No API keys needed - user leverages existing CLI subscriptions
- Each CLI authenticates independently (user logs in via CLI before first use)
- App simply executes CLI commands as subprocess - user's subscription handles billing
- Important: App should never prompt for API keys or credentials

### Report Generation for Clients
- Reports must look professional and client-ready (not raw output)
- Include:
  - Cover page with client name, document name, review date
  - Table of contents with section links
  - Formatted sections with headers and styling
  - Footer with "Generated by [Consultant Name] using Contract Review Tool"
- PDF generation: Use `puppeteer` (HTML → PDF) for best formatting control
- Word generation: Use `docx` npm package for .docx creation
- Allow user to customize branding (logo, consultant name, company name) in settings

### Security Considerations for Franchise Consultants
- All file processing happens locally (critical for client confidentiality)
- No external API calls - only local CLI subprocess execution
- Temporary files in `./documents/` and `./reference-docs/` must be cleaned up after processing
- Consider adding "Clear All Documents" button for privacy between clients
- Generated reports in `./output/` should be clearly organized by client/date

### Error Handling
- CLI not installed → show setup guide with links to CLI installation pages
- CLI authentication error → guide user to run CLI login command in terminal
- Invalid file format → display conversion error with supported formats list
- CLI execution timeout (> 5 minutes) → warn user and offer to cancel
- Empty document/references → validate before running and show helpful message
- Parse error in output → display raw output as fallback

### File Paths and Cross-Platform Compatibility
- All file paths must use Node.js `path` module for Windows/macOS compatibility
- Use `path.join()` to construct paths instead of string concatenation
- Handle special characters and spaces in file names (wrap in quotes for CLI commands)
- Be careful with path separators: Windows uses `\`, macOS/Linux use `/`

### CLI Command Construction
- Each CLI has different subcommand syntax - adapters must handle this
- Always wrap file paths in quotes to handle spaces: `--file "path/to/my document.pdf"`
- Test adapters with actual CLI documentation (syntax may change with CLI updates)
- Consider adding CLI version check to warn about incompatible versions

## Next Steps: Phase 2 - Claude CLI Integration

**Goal:** Implement working CLI execution with Claude CLI

**Files to Create:**

1. **`specs/cli-adapter.spec.md`** - Interface definition
   - Define `CLIAdapter` interface that all adapters must implement
   - Methods: `isAvailable()`, `getVersion()`, `buildCommand()`, `execute()`, `normalizeOutput()`

2. **`specs/data-models.spec.md`** - Data structures
   - Define `CLIRequest`, `CLIResult`, `DocumentMetadata`, `ReportConfig` interfaces

3. **`specs/api-contracts.spec.md`** - Function signatures
   - Document key functions: `convertToText()`, `runCLI()`, `generatePDF()`, etc.

4. **`src/adapters/claude-adapter.js`** - Claude CLI adapter implementation
   - Check if Claude CLI is available using `where claude` (Windows) or `which claude` (macOS)
   - Construct command: `claude --files "{filePath}" --system "{promptPath}"`
   - Execute via `child_process.spawn()` and capture stdout/stderr
   - Return `CLIResult` object

5. **`src/services/cli-runner.js`** - Universal CLI runner
   - Accept `CLIRequest` object
   - Route to appropriate adapter based on provider
   - Handle errors gracefully

6. **`src/utils/cli-detector.js`** - CLI detection utility
   - Detect which CLIs are installed on the system
   - Return array of available CLI providers

7. **`tests/adapters/claude-adapter.test.js`** - Unit tests
   - Mock `child_process` for testing
   - Test command construction
   - Test error handling

**Success Criteria:**
- Can execute Claude CLI from Node.js
- Captures stdout output
- Returns structured `CLIResult` object
- Handles errors (CLI not found, execution failure)

**Git Commit:**
```bash
git add .
git commit -m "Phase 2 complete: Claude CLI integration working"
git push origin main
```

## Franchise Consultant Workflow

Understanding the end user's workflow helps guide implementation priorities:

1. **Client Onboarding:** Consultant receives franchise contract or manual from client
2. **Document Preparation:** Consultant may have reference materials (templates, best practices, past successful contracts)
3. **Review Execution:**
   - Drag document into app
   - Add reference materials
   - Select appropriate review type (contract vs manual)
   - Choose preferred CLI based on which subscription has available credits
   - Run review
4. **Analysis:** Review LLM output for key issues and improvement suggestions
5. **Client Deliverable:** Export professional report and send to client with recommendations
6. **Iteration:** Client may revise contract based on feedback, consultant reviews again

**Key Pain Points This Tool Solves:**
- Eliminates need to manually copy-paste into web interfaces
- No API key management - just uses CLI subscriptions
- Produces professional reports ready to send to clients
- Maintains client confidentiality (local processing only)
- Allows quick switching between different review types and LLM providers
