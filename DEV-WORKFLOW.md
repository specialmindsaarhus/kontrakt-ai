# Development Workflow

**Purpose:** Prevent scoping errors, undefined variables, and refactoring bugs

## ⚡ Quick Validation After Code Changes

### 1. Smoke Test (30 seconds)
Run this immediately after making changes to backend code:

```bash
npm run test:smoke
```

**What it does:**
- Tests core analysis workflow
- Catches undefined variables, scoping issues
- Validates basic functionality

**When to run:**
- After editing `src/services/*.js`
- After editing `src/utils/*.js`
- After editing `src/adapters/*.js`
- Before committing code

### 2. Integration Test (1-2 minutes)
Full end-to-end test with all features:

```bash
npm run test:integration
```

**When to run:**
- Before pushing to repository
- After major refactoring
- Before creating releases

### 3. Frontend Dev Mode
Test UI changes in real-time:

```bash
npm run electron:dev
```

**When to run:**
- After editing components (`src/components/*.jsx`)
- After editing styles (`src/index.css`)
- After editing state management (`src/context/*.jsx`)

## 🔒 Pre-Commit Checklist

Before committing any code changes, verify:

- [ ] Code runs without errors (`npm run test:smoke`)
- [ ] No ESLint warnings (if configured)
- [ ] No console errors in browser/Electron
- [ ] All modified features tested manually
- [ ] Git commit message is descriptive

## 🚨 Common Errors to Watch For

### 1. **Scoping Issues** (Like the cliResult bug)
```javascript
// ❌ BAD - variable scoped inside try block
try {
  const result = await something();
} catch (err) {
  throw err;
}
console.log(result); // ERROR: result is not defined

// ✅ GOOD - declare outside try block
let result;
try {
  result = await something();
} catch (err) {
  throw err;
}
console.log(result); // Works!
```

### 2. **Undefined Variables**
```javascript
// ❌ BAD - typo in variable name
const analysisResult = await runAnalysis();
console.log(analyysisResult); // Typo!

// ✅ GOOD - use ESLint or TypeScript to catch these
```

### 3. **Missing Return Values**
```javascript
// ❌ BAD - function returns undefined
function doSomething() {
  const result = process();
  // Missing return!
}

// ✅ GOOD - always return
function doSomething() {
  const result = process();
  return result;
}
```

## 🎯 Best Practices

### 1. **Make Small, Incremental Changes**
- Change one function at a time
- Test after each change
- Commit working code frequently

### 2. **Test Immediately**
Don't wait until you've changed 10 files to test. Test after each logical change.

### 3. **Read Error Messages Carefully**
Error messages tell you exactly what's wrong:
```
Error: cliResult is not defined
    at file:///path/to/file.js:175:23
```
- **What:** `cliResult is not defined`
- **Where:** Line 175 in file.js

### 4. **Use Console Logging During Development**
```javascript
console.log('[DEBUG] About to execute CLI');
const result = await adapter.execute();
console.log('[DEBUG] CLI result:', result);
```

Remove debug logs before committing or use a logging utility.

## 🔄 Refactoring Safety

When refactoring code (like we did with progress updates):

1. **Read the entire function first** - Understand data flow
2. **Identify all variables** - Note where they're declared and used
3. **Make one change at a time** - Don't refactor multiple things simultaneously
4. **Test after each change** - Run `npm run test:smoke`
5. **Keep a backup** - Git commit before starting refactor

### Safe Refactoring Example:

```javascript
// BEFORE REFACTORING - commit this first
git add .
git commit -m "Before refactoring progress updates"

// AFTER REFACTORING - test before committing
npm run test:smoke
# If test passes:
git add .
git commit -m "Refactor: improved progress animation timing"
# If test fails:
git diff  # See what changed
# Fix the issue, then test again
```

## 📚 Future Improvements

### Short-term (Next Sprint)
- [ ] Add ESLint configuration
- [ ] Create pre-commit hook
- [ ] Add more unit tests

### Medium-term (Next Month)
- [ ] Set up GitHub Actions CI/CD
- [ ] Add code coverage reporting
- [ ] Create integration test suite

### Long-term (Future)
- [ ] Migrate to TypeScript (catches all these errors at compile time)
- [ ] Add automated UI testing
- [ ] Set up error monitoring (Sentry)

## 🆘 When Things Break

1. **Check the error message** - Read it carefully
2. **Run smoke test** - `npm run test:smoke`
3. **Check recent changes** - `git diff`
4. **Revert if needed** - `git checkout -- <file>`
5. **Test in isolation** - Comment out recent changes one by one

## 📞 Getting Help

If you're stuck:
1. Read error messages completely
2. Check this workflow document
3. Review recent commits (`git log`)
4. Run tests to isolate the issue
5. Ask Claude Code for help with specific error messages

---

**Remember:** Testing takes 30 seconds. Debugging production issues takes hours. Always test before committing! 🚀
