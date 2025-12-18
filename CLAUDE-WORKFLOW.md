# Claude Code Workflow - Code Quality Checklist

**For:** Claude (AI Assistant) working on this codebase
**Purpose:** Ensure all code changes are validated before completion

---

## ⚠️ MANDATORY: After Making Code Changes

### After ANY Code Edit:

**1. Complete the logical change set**
- Don't test after every tiny edit
- Wait until a feature/fix is complete

**2. Run ESLint**
```bash
npm run lint
```
- ✅ **If passes:** Continue
- ❌ **If fails:** Fix issues before proceeding

**3. For Backend Changes (`src/services/`, `src/utils/`, `src/adapters/`):**
```bash
npm run test:smoke
```
- ✅ **If passes:** Code is safe
- ❌ **If fails:** Debug and fix before saying "done"

**4. For Frontend Changes (`src/components/`, `src/context/`):**
- Recommend user run: `npm run electron:dev`
- Verify no console errors

---

## 🎯 When to Run What

| Change Type | Run ESLint | Run Smoke Test | Run Integration Test |
|-------------|-----------|----------------|---------------------|
| Small typo fix | ❌ Skip | ❌ Skip | ❌ Skip |
| Code refactoring | ✅ YES | ✅ YES | ⚠️ Before commit |
| New feature | ✅ YES | ✅ YES | ✅ YES |
| Bug fix | ✅ YES | ✅ YES | ⚠️ If major |
| UI component | ✅ YES | ❌ Skip | ❌ Skip |
| Config change | ✅ YES | ✅ YES | ❌ Skip |

---

## 🚫 NEVER Do This

❌ **Don't** say "done" without running lint
❌ **Don't** make backend changes without smoke test
❌ **Don't** assume code works without validation
❌ **Don't** skip tests because "it's a small change"
❌ **Don't** let the user commit broken code

---

## ✅ DO This

✅ **Run lint after every meaningful change**
✅ **Run smoke test after backend changes**
✅ **Fix issues immediately if tests fail**
✅ **Tell user to test manually for UI changes**
✅ **Verify pre-commit hooks are working**

---

## 📝 Example: Good Workflow

```
User: "Fix the progress bar timing"

Claude:
1. Makes code changes to ProgressIndicator.jsx
2. Runs: npm run lint ✓
3. Recommends: "Run `npm run electron:dev` to test the UI"
4. Says: "Changes complete and linted. Please test manually."

User: *tests and approves*
Claude: "Great! The pre-commit hook will validate on commit."
```

---

## 📝 Example: Backend Change Workflow

```
User: "Update the analysis-runner to fix scoping issue"

Claude:
1. Makes code changes to analysis-runner.js
2. Runs: npm run lint ✓
3. Runs: npm run test:smoke ✓
4. Says: "Changes complete, linted, and smoke tested successfully!"

[If smoke test failed]
Claude:
1. Sees error
2. Fixes the issue
3. Runs smoke test again
4. Only says "done" when it passes
```

---

## 🎓 Why This Matters

**The `cliResult` Bug Example:**
- I made changes to `analysis-runner.js`
- I created a scoping issue
- I said "done" without testing
- User discovered the error at runtime

**With This Workflow:**
- I make changes to `analysis-runner.js`
- I run `npm run lint` → Catches undefined variable
- I fix it immediately
- I run `npm run test:smoke` → Validates functionality
- I say "done" with confidence

---

## 📋 Pre-Response Checklist

Before telling user "Changes complete":

- [ ] Did I run ESLint?
- [ ] Did I fix any lint errors?
- [ ] If backend change: Did I run smoke test?
- [ ] If smoke test failed: Did I fix and re-test?
- [ ] Did I tell user how to test manually (if needed)?

---

## 🤖 Auto-Validation via Pre-commit Hook

Remember: Even if I forget, the pre-commit hook will catch issues when the user commits. But I should catch them BEFORE that to save time!

---

## 📞 Communicating Test Results

**Good:**
> "Changes complete! ✅ ESLint passed, ✅ Smoke test passed. Ready to commit."

**Better:**
> "I've updated analysis-runner.js with the fix. Let me validate:
>
> ```bash
> npm run lint      # ✅ Passed
> npm run test:smoke # ✅ Passed (30s)
> ```
>
> All checks passed! The code is safe to commit."

**Best:**
> "Fixed the scoping issue in analysis-runner.js:
> - Moved `cliResult` declaration outside try block
> - ✅ ESLint: No errors
> - ✅ Smoke test: Full workflow tested (30s)
> - ✅ Ready to commit
>
> The pre-commit hook will validate again when you commit."

---

## 🔄 Continuous Improvement

After each session, ask:
- Did I catch all issues before the user?
- Were my changes validated?
- Did I run appropriate tests?
- Could I have prevented any user-discovered bugs?

---

**Remember: 30 seconds of testing saves 30 minutes of debugging!** 🚀
