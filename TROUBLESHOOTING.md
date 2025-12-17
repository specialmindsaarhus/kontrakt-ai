# Troubleshooting Guide

**Last Updated:** 2025-12-17

This document contains solutions to common issues encountered during development and testing.

---

## Table of Contents

1. [IPC & Communication Errors](#ipc--communication-errors)
2. [CLI Integration Issues](#cli-integration-issues)
3. [Timeout Problems](#timeout-problems)
4. [Module & Import Errors](#module--import-errors)
5. [Context Bleed Issues](#context-bleed-issues)
6. [Debugging Tips](#debugging-tips)

---

## IPC & Communication Errors

### Error: "Error invoking remote method: [object Object]"

**Cause:** Throwing a plain JavaScript object through Electron IPC. IPC can only serialize Error objects properly.

**Solution:**
```javascript
// ❌ Wrong - throws plain object
throw {
  code: 'ERROR',
  message: 'Failed'
};

// ✅ Correct - throw Error object
const error = new Error('Failed');
error.code = 'ERROR';
error.suggestions = 'Try again';
throw error;
```

**Files:** `electron/main.js` (IPC handlers)

---

### Error: "Cannot read properties of undefined (reading 'provider')"

**Cause:** IPC handler trying to access `result.metadata.provider` when `result.metadata` is undefined (happens when analysis fails).

**Solution:**
1. Check `result.success` before accessing success-only properties
2. Use optional chaining: `result.metadata?.provider`
3. Provide fallback values from request params

```javascript
// ✅ Check success first
if (!result.success) {
  const error = new Error(result.userMessage || result.error);
  throw error;
}

// ✅ Use optional chaining
const provider = result.metadata?.provider || params.provider;
```

**Files:** `electron/main.js:159-165`

---

## CLI Integration Issues

### Gemini CLI Returns "Okay, I'm ready. Please provide your first command"

**Cause:** Using positional arguments or `--output-format text` flag triggers interactive mode instead of one-shot mode.

**Solution:** Use **stdin** for prompt input, no flags needed:

```javascript
// ❌ Wrong - triggers interactive mode
const child = spawn('gemini', ['--output-format', 'text', prompt]);

// ✅ Correct - use stdin
const child = spawn('gemini', []);
child.stdin.write(prompt);
child.stdin.end();
```

**Files:** `src/adapters/gemini-adapter.js:188-196`

---

### Claude Code CLI Includes Project Context (CLAUDE.md)

**Cause:** The installed CLI is `@anthropic-ai/claude-code` (coding CLI) which automatically includes project context, NOT a general chat CLI.

**Symptoms:**
- Analysis mentions "project documentation"
- References files from the codebase
- Takes very long (analyzing entire project)

**Solutions:**
1. **Short-term:** Use Gemini CLI instead (already configured)
2. **Long-term:**
   - Find a way to disable context in Claude Code CLI (flag or config)
   - Or run it in a different directory without CLAUDE.md
   - Add OpenAI CLI as alternative

**Future Feature:** Leverage this for personalized client context files (see TODO)

**Files:** CLI detection in `src/utils/cli-detector.js`

---

## Timeout Problems

### Error: "Analysen tog for lang tid og blev afbrudt" (Analysis timed out)

**Cause:** Different CLIs have different response times. Timeout was too short for actual API calls.

**Symptoms:**
- Works in CLI tests (short prompts)
- Times out in GUI (full analysis with system prompt + document)

**Benchmarks:**
- Simple test: ~10-30 seconds
- Full analysis with Gemini: ~160-180 seconds (~3 minutes)
- Full analysis with Claude Code: Variable (context-dependent)

**Solution:** Adjust timeout based on CLI:
```javascript
timeout = 300000  // 5 minutes for production use
```

**Note:** The `spawn()` timeout option AND manual setTimeout were both being used. Remove spawn timeout, only use manual setTimeout.

**Files:** `src/services/analysis-runner.js:55`, `src/adapters/*/js:_executeCommand()`

---

### Process Exits with Code: null

**Cause:** Process was killed by timeout (SIGTERM/SIGKILL), not a clean exit.

**How to identify:**
- Exit code is `null` (not 0 or error code)
- `timedOut` flag is `true` in debug logs
- Partial output exists

**Solution:** Increase timeout or optimize prompt size.

---

## Module & Import Errors

### Error: "require is not defined"

**Cause:** Using CommonJS `require()` in an ES module file (files using `import`/`export`).

**Solution:** Use ES module imports at the top:

```javascript
// ❌ Wrong - require in ES module
const documentName = require('path').basename(documentPath);

// ✅ Correct - import at top
import path from 'path';
// ... later in code:
const documentName = path.basename(documentPath);
```

**Files to check:** Any file using `import`/`export` statements

---

### Error: "const variable cannot be reassigned"

**Cause:** Trying to modify a `const` variable with `+=` or reassignment.

**Solution:** Use `let` for variables that need to be modified:

```javascript
// ❌ Wrong
const prompt = 'initial';
prompt += '\nmore text';  // Error!

// ✅ Correct
let prompt = 'initial';
prompt += '\nmore text';  // Works
```

**Files:** `src/adapters/gemini-adapter.js:83`

---

## Context Bleed Issues

### Analysis References Wrong Context

**Symptoms:**
- Claude mentions "project documentation" when analyzing a contract
- References CLAUDE.md or other project files
- Provides meta-commentary about the application

**Root Cause:** Claude Code CLI automatically includes project context (working directory files).

**Workarounds:**
1. Use different CLI (Gemini, OpenAI)
2. Run analysis in isolated directory
3. Use `--no-context` flag if available (check CLI help)

**Future Enhancement:** Intentionally use context files for personalized client analysis.

---

## Debugging Tips

### Finding Where Code Fails

1. **Check both consoles:**
   - **Browser DevTools** (`Ctrl+Shift+I`): Frontend/renderer logs
   - **Terminal**: Backend/main process logs

2. **Add debug logging:**
   ```javascript
   console.log('[DEBUG] Step description:', variable);
   ```

3. **Trace the flow:**
   - Frontend: `[FRONTEND]` prefix
   - Backend: `[DEBUG]` prefix
   - Look for where logs stop

### No Debug Logs Appearing

**If logs missing in browser console:** Check terminal (backend code runs in main process)

**If logs missing in terminal:** Add more logging earlier in the flow

### Testing CLI Integration

Test CLIs directly before integrating:

```bash
# Test if CLI works
gemini "Respond with 'working'"

# Test with full prompt
node -e "
const { spawn } = require('child_process');
const child = spawn('gemini', []);
child.stdin.write('Your prompt here');
child.stdin.end();
child.stdout.on('data', d => console.log(d.toString()));
"
```

### Common Debug Flow

1. Add frontend logging to confirm IPC call
2. Add backend logging in IPC handler
3. Add logging in service layer (analysis-runner)
4. Add logging in adapter layer (CLI execution)
5. Check exit codes and output

---

## Error Code Reference

| Code | Meaning | Common Cause | Solution |
|------|---------|--------------|----------|
| `TIMEOUT` | CLI execution exceeded timeout | CLI took too long, slow API | Increase timeout |
| `CLI_NOT_FOUND` | CLI executable not found | CLI not installed or not in PATH | Install CLI, check PATH |
| `AUTH_REQUIRED` | Authentication needed | Not logged in to CLI | Run `claude login` or `gemini login` |
| `ANALYSIS_FAILED` | Generic analysis failure | Various (check error message) | Check logs for specific error |
| `INVALID_REQUEST` | Bad request parameters | Missing required fields | Validate inputs before calling |
| `EXECUTION_ERROR` | Failed to spawn process | Permissions, bad command | Check spawn options |
| `COMMAND_FAILED` | CLI returned non-zero exit | CLI error (check stderr) | Check CLI output |

---

## Prevention Checklist

Before committing code changes:

- [ ] Test with actual file upload (not just unit tests)
- [ ] Check both browser console AND terminal for errors
- [ ] Verify timeout is appropriate for the operation
- [ ] Use proper Error objects for IPC communication
- [ ] Use ES module imports (not require) in .js files
- [ ] Add debug logging for new code paths
- [ ] Test error cases (timeout, auth, missing file)
- [ ] Update this guide if you find new issues!

---

## Quick Reference

**Check Settings:**
```bash
cat ~/.contract-reviewer/settings.json
```

**Check Logs:**
```bash
tail -f ~/.contract-reviewer/logs/app.log
```

**Test CLI:**
```bash
claude --version
gemini --version
openai --version
```

**Clear Settings (Reset):**
```bash
rm -rf ~/.contract-reviewer/
```

---

## Need More Help?

1. Check the debug logs in terminal
2. Search this file for error message
3. Add more logging and retry
4. Check GitHub issues: https://github.com/specialmindsaarhus/kontrakt-ai/issues
5. Review recent commits in HISTORY.md
