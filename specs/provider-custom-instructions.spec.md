# Provider Custom Instructions Specification

## Problem Statement

The current `CLAUDE.md` file at the project root is intended for development guidance (instructions for Claude Code CLI during app development). However, when the Contract Reviewer app uses the Claude CLI for document analysis, Claude may read `CLAUDE.md` and get confused by development instructions, resulting in errors or incorrect analysis output.

**Key Issue:** Development instructions should NOT be read by the LLM during document analysis.

## Solution

Separate **provider-specific custom instructions** for document analysis from development guidance:

1. **Development CLAUDE.md** - Stays at project root, used only during development
2. **Provider Custom Instructions** - New files for runtime analysis customization

---

## Architecture

### File Structure

```
provider-configs/
├── claude-instructions.md      # Custom instructions for Claude CLI during analysis
├── gemini-instructions.md      # Custom instructions for Gemini CLI during analysis
├── openai-instructions.md      # Custom instructions for OpenAI CLI during analysis
└── README.md                   # Documentation for end-users
```

**Location:** `provider-configs/` directory at project root

**Purpose:** These files provide custom instructions to the LLM CLI when performing document analysis, NOT during app development.

---

## File Format

Each provider instruction file follows this structure:

```markdown
# Custom Instructions for [Provider Name]

## Tone & Style
- Professional and formal Danish business language
- Direct and concise
- Avoid unnecessary jargon

## Analysis Focus
- Prioritize legal compliance and risk assessment
- Highlight missing clauses or ambiguous terms
- Provide actionable recommendations

## Output Format
- Use clear headings and bullet points
- Include severity ratings (High/Medium/Low)
- Always include executive summary at top

## Domain Knowledge
- Franchise law in Denmark
- Danish Consumer Protection Act
- EU franchise regulations

## Custom Rules
[Add your own custom rules here]
```

---

## Implementation

### 1. Loading Custom Instructions

**File:** `src/utils/provider-config-loader.js`

```javascript
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROVIDER_CONFIGS_DIR = join(__dirname, '../../provider-configs');

/**
 * Load custom instructions for a provider
 * @param {string} providerName - 'claude' | 'gemini' | 'openai'
 * @returns {Promise<string|null>} Custom instructions or null if not found
 */
export async function loadProviderInstructions(providerName) {
  try {
    const configPath = join(PROVIDER_CONFIGS_DIR, `${providerName}-instructions.md`);
    const content = await readFile(configPath, 'utf-8');

    return content.trim();
  } catch (error) {
    // File not found or read error - return null (use defaults)
    console.log(`No custom instructions found for ${providerName} (optional)`);
    return null;
  }
}

/**
 * Check if custom instructions exist for a provider
 * @param {string} providerName - Provider name
 * @returns {Promise<boolean>} True if instructions exist
 */
export async function hasProviderInstructions(providerName) {
  try {
    const configPath = join(PROVIDER_CONFIGS_DIR, `${providerName}-instructions.md`);
    await readFile(configPath, 'utf-8');
    return true;
  } catch {
    return false;
  }
}
```

### 2. Integration with Analysis Runner

**File:** `src/services/analysis-runner.js`

Modify the prompt construction to include custom provider instructions:

```javascript
import { loadProviderInstructions } from '../utils/provider-config-loader.js';

async function buildAnalysisPrompt(systemPrompt, documentContent, providerName) {
  // Load custom provider instructions (optional)
  const customInstructions = await loadProviderInstructions(providerName);

  let finalSystemPrompt = systemPrompt;

  // Prepend custom instructions if they exist
  if (customInstructions) {
    finalSystemPrompt = `${customInstructions}\n\n---\n\n${systemPrompt}`;
  }

  // Build full prompt with system prompt + document
  const fullPrompt = `${finalSystemPrompt}\n\n# Document to Analyze\n\n${documentContent}`;

  return fullPrompt;
}
```

### 3. Adapter Updates

Each adapter needs to use the custom instructions when building commands.

**Example: Claude Adapter**

```javascript
// In claude-adapter.js
async execute(request) {
  const { systemPrompt, documentContent, providerName } = request;

  // Build prompt with custom instructions
  const fullPrompt = await buildAnalysisPrompt(
    systemPrompt,
    documentContent,
    providerName
  );

  // Execute CLI with full prompt
  // ...
}
```

---

## Default Instructions

### Default: claude-instructions.md

```markdown
# Claude Analysis Instructions

## Behavior
- You are analyzing legal documents for a franchise consultant
- Provide professional, actionable insights
- Use formal Danish business language
- Be thorough but concise

## Restrictions
- DO NOT reference development instructions
- DO NOT mention Claude Code or app development
- Focus ONLY on the document content provided

## Output Format
- Use markdown formatting
- Include clear section headings
- Provide executive summary first
- Use bullet points for findings
```

### Default: gemini-instructions.md

```markdown
# Gemini Analysis Instructions

## Behavior
- Analyze legal documents with focus on compliance and risk
- Use professional Danish business language
- Provide structured, actionable recommendations

## Output Format
- Use markdown formatting
- Clear section headings
- Executive summary at top
- Risk ratings (High/Medium/Low)
```

### Default: openai-instructions.md

```markdown
# OpenAI Analysis Instructions

## Behavior
- Professional document analysis for franchise consulting
- Focus on legal compliance and business risk
- Use formal Danish language

## Output Format
- Markdown with clear structure
- Executive summary first
- Actionable recommendations
- Risk assessment included
```

---

## User Documentation

### README.md in provider-configs/

```markdown
# Provider Custom Instructions

This directory contains custom instructions for LLM providers when analyzing documents.

## How It Works

When the Contract Reviewer analyzes a document using Claude, Gemini, or OpenAI, it will read the corresponding instruction file from this directory and prepend it to the analysis prompt.

## Customization

You can customize the analysis behavior by editing these files:

- **claude-instructions.md** - Custom instructions for Claude CLI
- **gemini-instructions.md** - Custom instructions for Gemini CLI
- **openai-instructions.md** - Custom instructions for OpenAI CLI

## What to Include

- **Tone & Style:** How the LLM should write (formal, concise, etc.)
- **Analysis Focus:** What to prioritize (compliance, risks, etc.)
- **Output Format:** How to structure the report
- **Domain Knowledge:** Specific laws, regulations, or industry knowledge
- **Custom Rules:** Any specific requirements for your use case

## Example

```markdown
# Custom Instructions for Claude

## Tone
- Use highly formal Danish legal language
- Include legal citations where applicable

## Focus Areas
1. Franchise agreement compliance with Danish law
2. Consumer protection clauses
3. Termination and renewal terms
4. Financial obligations and transparency
```

## Optional

These files are optional. If not present, the app will use default prompts without custom instructions.
```

---

## Settings Integration (Future)

### Settings Modal Option

Add a settings option to edit provider instructions from the GUI:

```javascript
// In Settings Modal
<Section title="Provider Customization">
  <ProviderInstructionsEditor
    provider={selectedProvider}
    onSave={handleSaveInstructions}
  />
</Section>
```

**Features:**
- Edit provider instructions in the GUI
- Preview markdown rendering
- Reset to defaults
- Validate before saving

---

## Priority & Rollout

### Phase 1: Core Implementation (Immediate)
1. ✅ Create `provider-configs/` directory
2. ✅ Create default instruction files for each provider
3. ✅ Implement `provider-config-loader.js`
4. ✅ Update `analysis-runner.js` to use custom instructions
5. ✅ Update all adapters to support custom instructions
6. ✅ Add user documentation (README.md)

### Phase 2: Settings UI (Future)
1. Add provider instructions editor to Settings modal
2. Markdown preview and validation
3. Reset to defaults button

---

## Benefits

1. **Separation of Concerns:** Development instructions stay separate from runtime instructions
2. **Customization:** Users can tailor LLM behavior to their specific needs
3. **Per-Provider Control:** Different instructions for Claude vs Gemini vs OpenAI
4. **No Code Changes:** Users can customize without modifying source code
5. **Optional:** Falls back to defaults if custom files not present
6. **Versionable:** Custom instructions can be version-controlled alongside app

---

## Testing

### Test Cases

1. **With custom instructions:**
   - Create `provider-configs/claude-instructions.md`
   - Run analysis with Claude
   - Verify custom instructions are prepended to prompt
   - Verify analysis respects custom instructions

2. **Without custom instructions:**
   - Delete custom instruction file
   - Run analysis
   - Verify app falls back to default behavior
   - No errors should occur

3. **Malformed instructions:**
   - Create file with invalid content
   - Run analysis
   - App should handle gracefully (skip or use default)

4. **Multiple providers:**
   - Create instructions for Claude, Gemini, OpenAI
   - Switch between providers
   - Verify correct instructions loaded for each

---

## Implementation Checklist

- [ ] Create `provider-configs/` directory
- [ ] Create default instruction files (3 files)
- [ ] Create README.md for users
- [ ] Implement `provider-config-loader.js`
- [ ] Update `analysis-runner.js` prompt building
- [ ] Update Claude adapter
- [ ] Update Gemini adapter
- [ ] Update OpenAI adapter (when implemented)
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Update main README.md to mention customization
- [ ] Update CLAUDE.md to document this feature

---

## Notes

- Custom instructions are **prepended** to the system prompt, giving them priority
- Files are read at analysis time (no caching), so users can edit and test immediately
- Markdown format allows rich formatting and easy editing
- Each provider can have completely different instructions
- Development CLAUDE.md is NEVER read during document analysis
