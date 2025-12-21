# ADR-001: CLI-Based LLM Access vs HTTP Session Automation

**Status:** ✅ Accepted
**Date:** 2025-12-20
**Context:** MVP functionally complete, Windows fully working, macOS compatibility pending

---

## Decision

We will **continue with CLI-based LLM access** and **NOT pivot** to HTTP session-based automation (e.g., Auto-Claude style) at this time.

The decision is deliberate, evidence-based, and reversible when specific conditions are met.

---

## Context

### Current Situation

The application is a desktop Electron app, built with a **local-first philosophy**, where:

- LLMs are accessed via **CLI tools** (Claude CLI, Gemini CLI)
- User behavior and specialization are controlled via **local markdown files** (e.g., `prompts/*.md`, future `provider-configs/`)
- The **MVP is functionally complete** on Windows
- CLI integration:
  - Works reliably on Windows
  - Leverages existing user subscriptions
  - Enables transparent, inspectable, file-based context
  - Supports professional franchise consultant workflows

### Alternative Considered: HTTP Session-Based Access

An alternative architecture is HTTP session-based automation (similar to Auto-Claude), which:

- Automates browser sessions to interact with LLM web interfaces
- Reuses web subscriptions (no CLI installation required)
- Avoids CLI installation and PATH configuration issues
- Introduces a different class of technical risk

**Why We Considered It:**
- Potentially easier onboarding (no CLI setup)
- macOS users face CLI installation friction
- Could reduce support burden for non-technical users

---

## Core Question

**Should the project pivot now from CLI-based LLM access to HTTP session-based access?**

**Answer:** No.

---

## Rationale

### 1. The MVP Is Already Solving the Right Problem

The product's **core value** is not:
- which LLM is used
- how requests are transported

The **core value** is:
- **Persistent, user-controlled context**
- **Local ownership of AI behavior**
- **Predictability and transparency**
- **Professional document analysis workflow**

CLI access fully supports this value.

**Pivoting now would:**
- Add no new user-facing benefit
- Invalidate working code
- Introduce unstable dependencies

This is **negative ROI engineering** at this stage.

---

### 2. HTTP Session Access Solves a Future Problem

HTTP session automation primarily solves:
- macOS onboarding friction
- CLI installation complexity
- Adoption barriers for less technical users

**These problems are:**
- Not yet observed in real usage
- Not yet validated with actual users
- Not yet blocking adoption

**Principle:** Engineering solutions should respond to **measured pain**, not anticipated discomfort.

---

### 3. HTTP Sessions Introduce Structural Risk

Unlike APIs or CLIs, HTTP session automation:
- **Has no stable contract** (depends on web UI structure)
- **Depends on reverse-engineered endpoints** (can break silently)
- **Can break without notice** (provider UI changes are unannounced)
- **Operates in a ToS gray zone** (violates terms of service for some providers)

This is acceptable as:
- An **optional provider**
- An **experimental mode**

It is **not appropriate** as the foundation of an MVP.

---

### 4. CLI Access Aligns with Current Product Identity

The application's current design:
- Values **control and transparency**
- Uses **file-based configuration**
- Supports **inspectable, reproducible analysis**

Removing CLI now would:
- Reduce product differentiation
- Blur the product's identity
- Optimize for users we don't yet have

---

## When a Pivot Is Justified

A pivot to HTTP session-based access becomes justified **only when real signals appear**.

### 🎯 Valid Pivot Signals (Any One Is Sufficient)

#### 1. Repeated User Drop-Off Due to Setup
- macOS users consistently fail to install CLI tools
- PATH configuration issues cause user abandonment
- Support time for CLI setup exceeds development time
- Onboarding completion rate drops below acceptable threshold

#### 2. Target Audience Shifts to Non-Technical Users
- Non-technical users become primary user base
- Team or enterprise pilots emerge with different user profiles
- CLI becomes an explicit objection in sales/demos
- User research shows setup friction is primary barrier

#### 3. Distribution Friction Blocks Release
- Packaging the app becomes fragile due to CLI dependencies
- Installer complexity increases to unmanageable levels
- CLI dependency blocks code signing or notarization
- App store distribution becomes impossible with CLI requirement

#### 4. Business Model Evolution Requires Tighter Control
- Business model requires precise usage tracking
- Billing predictability depends on controlled execution
- Auditability or SLAs become customer requirements
- Compliance needs mandate controlled API endpoints

**Critical Rule:** Only **observed, repeated evidence** should trigger a pivot.

---

## Warning Signs That Indicate "Not Yet"

**Do NOT pivot if:**
- Users are not complaining about CLI setup
- The app is not yet in real user hands (alpha/beta)
- You are still learning how people use context files
- You cannot yet articulate your core user persona with data
- The pivot is motivated by anticipated problems, not measured ones

---

## What We're Doing Now to Make the Pivot Easy Later

This is the **most important** part of the decision.

### 1. Enforce a Hard LLM Provider Boundary

The application **treats the LLM as a pluggable service**.

- ✅ No UI code knows how messages are sent
- ✅ No business logic depends on CLI specifics
- ✅ Providers implement a shared specification (see `specs/provider-abstraction.spec.md`)

This makes a future pivot **additive, not destructive**.

### 2. Centralize Context Assembly

All logic for:
- Loading `.md` files (prompts, instructions)
- Ordering instructions
- Combining system/user messages

**must live outside the provider.**

Providers receive **pure text, never file paths**.

This allows CLI, API, and HTTP session providers to behave identically.

### 3. Normalize Errors Early

Do not leak:
- Raw `stderr` from CLI processes
- Stack traces to end users
- Provider-specific error formats

Every provider must emit:
- **Classified errors** (`ProviderErrorType`)
- **User-safe messages** (Danish, actionable)
- **Recoverability flags**

This prevents provider-specific UX divergence later.

### 4. Treat CLI as "One Provider Among Many"

In UX and internal naming:
- CLI is **one provider**, not "how the app works"
- Future providers (API, HTTP session) are peers, not replacements

This reframing:
- Avoids emotional attachment to implementation details
- Prevents user backlash when alternatives are added
- Prepares users for choice

### 5. Document the Decision

This ADR ensures:
- Future contributors understand **why** we chose CLI
- The rationale is explicit, not implicit
- The decision can be revisited with clear criteria

---

## What the Pivot Would Look Like (When It Happens)

When pivot signals are observed:

1. **Add a new provider:**
   - `ClaudeWebSessionProvider` (or similar)

2. **Mark it:**
   - "Experimental" or "Beta" in UI
   - Optional opt-in for users who need it

3. **Keep CLI:**
   - Available for users who prefer it
   - Marked as "Advanced" or "Stable"

4. **Measure:**
   - Adoption rate of HTTP session provider
   - Failure rate comparison (CLI vs HTTP session)
   - Support cost comparison

**No rewrite.**
**No regret.**
**No scramble.**

---

## Consequences

### Positive Consequences

✅ **Stable, working implementation**
- Windows fully functional
- Reliable analysis workflow
- Well-tested codebase

✅ **User-controlled, transparent context**
- Users own their instructions and prompts
- File-based configuration is inspectable
- Reproducible analysis results

✅ **No ToS risks**
- CLI tools are official, supported by providers
- No reverse engineering or automation of web UIs
- Compliant with provider terms of service

✅ **Aligns with product identity**
- Local-first philosophy preserved
- Professional, controlled workflow
- Differentiated from cloud-based alternatives

✅ **Foundation for extensibility**
- Provider abstraction enables easy addition of new providers
- HTTP session can be added later without refactoring core logic

### Negative Consequences

⚠️ **macOS setup friction remains**
- PATH configuration issues unresolved
- CLI installation required for macOS users
- Homebrew/npm installation complexity

⚠️ **CLI installation required**
- Onboarding barrier for some users
- Support burden for installation issues
- Dependency on external CLI tools

⚠️ **Less accessible to non-technical users**
- Terminal/command-line knowledge helpful
- File-based configuration may be unfamiliar
- Steeper learning curve than pure GUI apps

### Mitigation Strategies

For negative consequences:

1. **Comprehensive onboarding documentation**
   - Step-by-step CLI installation guides
   - Video tutorials for macOS/Windows
   - Common troubleshooting scenarios

2. **Auto-detection and helpful error messages**
   - Detect missing CLIs with clear Danish error messages
   - Provide direct links to installation instructions
   - Pre-flight checks before analysis

3. **Settings UI for advanced configuration**
   - GUI-based provider selection (already implemented)
   - Future: CLI path override in settings
   - Future: Test connection button

---

## Future Review Triggers

This decision should be **revisited** when:

1. ✅ Any of the 4 pivot signals appear (see above)
2. ✅ User research shows CLI is primary friction point
3. ✅ macOS support cost exceeds 40% of development time
4. ✅ Alternative provider implementations are requested by multiple users

**Next Review Date:** After first 50 alpha/beta users (or 6 months, whichever comes first)

---

## Implementation

### Immediate Actions
- ✅ Continue with CLI-based implementation
- ✅ Complete provider abstraction refactoring (`specs/provider-abstraction.spec.md`)
- ✅ Implement provider custom instructions (`specs/provider-custom-instructions.spec.md`)
- ✅ Complete macOS compatibility work (PATH loading, process termination)

### Future Work (When Pivot Signals Appear)
- 🔮 Implement HTTP session provider spec (`specs/http-session-provider.spec.md` - future)
- 🔮 Add experimental HTTP session provider to UI
- 🔮 Measure adoption and reliability metrics
- 🔮 User testing to validate or invalidate this decision

---

## References

- **CLAUDE.md:** Project overview, architecture, and implementation status
- **specs/provider-abstraction.spec.md:** Provider interface specification (makes pivot additive)
- **specs/provider-custom-instructions.spec.md:** Context loading and instruction management
- **specs/http-session-provider.spec.md:** Future specification for HTTP session-based access (to be created)

---

## Final Framing

**This is not a technical indecision.**
**It is a deliberate sequencing choice.**

Right now, we are:
- ✅ Validating product value
- ✅ Learning user workflows
- ✅ Building on stable foundations

**NOT** optimizing for:
- ❌ Distribution efficiency (premature)
- ❌ Non-technical users (not validated as target)
- ❌ Anticipated problems (not yet observed)

**The correct move is:**

1. **Ship** (get the app in users' hands)
2. **Observe** (measure real usage patterns)
3. **Listen** (gather user feedback)
4. **Then adapt** (respond to evidence, not speculation)

This is the **senior engineering approach** — not the loud, reactive, or speculative approach.

We are building for **measured needs**, not imagined futures.
