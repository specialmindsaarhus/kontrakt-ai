# Provider Error Mapping Specification

**Status:** 🟡 Draft
**Related:** `provider-abstraction.spec.md`, `provider-abstraction-cli-pattern.spec.md`
**Purpose:** Define how to classify raw CLI/API errors into standardized `ProviderError` types with user-friendly Danish messages.

---

## 1. The Error Classification Problem

### 1.1 Current State

Both `claude-adapter.js` and `gemini-adapter.js` have ad-hoc error handling:

```javascript
// Claude adapter (lines 311-328)
if (stderrLower.includes('auth') || stderrLower.includes('login')) {
  return { errorCode: 'AUTH_REQUIRED', error: 'Authentication required...' };
}

// Gemini adapter (lines 317-325)
if (stderrLower.includes('auth') || stderrLower.includes('login')) {
  return { errorCode: 'AUTH_REQUIRED', error: 'Authentication required...' };
}
```

**Problems:**
1. ❌ Duplicate logic across adapters
2. ❌ Inconsistent error messages (some English, some Danish)
3. ❌ No structured error objects
4. ❌ Limited error types (only AUTH, TIMEOUT, CANCELLED)
5. ❌ No recovery suggestions
6. ❌ Raw stderr exposed to users (not safe)

### 1.2 Goal

**Standardized error handling that:**
- ✅ Classifies all errors into `ProviderErrorType` enum
- ✅ Provides Danish user-friendly messages
- ✅ Includes actionable recovery suggestions
- ✅ Hides technical details (stderr, stack traces) from users
- ✅ Works consistently across CLI, API, and HTTP session providers
- ✅ Is easy to extend with new error patterns

---

## 2. ProviderError Class

### 2.1 Structure

```typescript
/**
 * Standardized error thrown by all LLM providers
 * Extends Error for stack traces and standard error handling
 */
class ProviderError extends Error {
  /**
   * Error classification (for programmatic handling)
   */
  readonly type: ProviderErrorType;

  /**
   * Provider that threw the error (e.g., 'claude-cli', 'gemini-api')
   */
  readonly providerId: string;

  /**
   * Can the user potentially fix this error?
   * true: auth errors, config issues, rate limits
   * false: provider outages, bugs, network failures
   */
  readonly isRecoverable: boolean;

  /**
   * User-friendly error message in Danish
   * Safe to display in UI (no technical jargon, no raw stderr)
   */
  readonly userMessage: string;

  /**
   * List of actionable recovery suggestions in Danish
   * Example: ['Kør "claude login" i terminal', 'Tjek din internetforbindelse']
   */
  readonly recoverySuggestions: string[];

  /**
   * Technical details (for logging, debugging)
   * Should NEVER be shown to end users
   */
  readonly technicalDetails?: {
    exitCode?: number;
    signal?: string;
    stdout?: string;
    stderr?: string;
    httpStatus?: number;
    httpBody?: string;
  };

  /**
   * Original error that caused this (if wrapped)
   */
  readonly cause?: Error;

  constructor(options: ProviderErrorOptions);
}

interface ProviderErrorOptions {
  type: ProviderErrorType;
  providerId: string;
  message: string; // Technical message for developers (English)
  isRecoverable: boolean;
  userMessage: string; // User-facing message (Danish)
  recoverySuggestions?: string[];
  technicalDetails?: Record<string, any>;
  cause?: Error;
}
```

### 2.2 Error Types

```typescript
/**
 * Standardized error classification
 * Covers CLI, API, HTTP session, and local model providers
 */
type ProviderErrorType =
  // Configuration Issues (Recoverable)
  | 'CONFIG'           // Invalid settings, missing config files
  | 'AUTH'             // Authentication required or failed
  | 'NOT_INSTALLED'    // CLI not found in PATH

  // Resource Limits (Recoverable)
  | 'RATE_LIMIT'       // API rate limit exceeded
  | 'QUOTA_EXCEEDED'   // Monthly quota exhausted
  | 'CONTEXT_LENGTH'   // Input too long for model

  // Network Issues (Sometimes Recoverable)
  | 'NETWORK'          // Connection failed, DNS errors
  | 'TIMEOUT'          // Request took longer than allowed

  // Provider Issues (Not Recoverable)
  | 'PROVIDER'         // Provider-specific error (CLI crash, API 500)
  | 'MODEL_OVERLOADED' // Model temporarily unavailable (API 529)

  // User Actions (Not Errors, Actually)
  | 'CANCELLED'        // User aborted the request

  // Catch-All (Not Recoverable)
  | 'UNKNOWN';         // Unexpected error
```

---

## 3. Error Pattern Matching

### 3.1 CLI Error Detection Patterns

**Pattern Matching Strategy:**
1. Check process exit conditions first (timeout, cancellation, signal)
2. Check exit code (0 = success, non-zero = error)
3. Parse stderr for known error patterns
4. Fall back to generic error

```typescript
/**
 * Maps CLI execution results to ProviderError
 * Used by BaseCLIProvider._executeProcess()
 */
class CLIErrorMapper {
  static map(
    providerId: string,
    result: ProcessResult
  ): ProviderError | null {
    // 1. Check if cancelled
    if (result.cancelled) {
      return new ProviderError({
        type: 'CANCELLED',
        providerId,
        message: 'Request was cancelled by user',
        isRecoverable: false,
        userMessage: 'Analysen blev afbrudt',
        recoverySuggestions: []
      });
    }

    // 2. Check if timed out
    if (result.timedOut) {
      return new ProviderError({
        type: 'TIMEOUT',
        providerId,
        message: `Request timed out after ${result.timeoutMs}ms`,
        isRecoverable: true,
        userMessage: 'Analysen tog for lang tid',
        recoverySuggestions: [
          'Prøv med et kortere dokument',
          'Øg timeout i indstillinger',
          'Tjek din internetforbindelse'
        ],
        technicalDetails: { timeoutMs: result.timeoutMs }
      });
    }

    // 3. Success - no error
    if (result.code === 0) {
      return null;
    }

    // 4. Parse stderr for known patterns
    return this._parseStderr(providerId, result);
  }

  /**
   * Pattern-based stderr classification
   */
  private static _parseStderr(
    providerId: string,
    result: ProcessResult
  ): ProviderError {
    const stderr = result.stderr.toLowerCase();
    const stdout = result.stdout.toLowerCase();

    // AUTH errors
    if (this._matchAny(stderr, AUTH_PATTERNS)) {
      return new ProviderError({
        type: 'AUTH',
        providerId,
        message: 'Authentication required',
        isRecoverable: true,
        userMessage: 'Du skal logge ind først',
        recoverySuggestions: this._getAuthSuggestions(providerId),
        technicalDetails: { exitCode: result.code, stderr: result.stderr }
      });
    }

    // NOT_INSTALLED errors
    if (this._matchAny(stderr, NOT_INSTALLED_PATTERNS) ||
        this._matchAny(stdout, NOT_INSTALLED_PATTERNS)) {
      return new ProviderError({
        type: 'NOT_INSTALLED',
        providerId,
        message: 'CLI not found in PATH',
        isRecoverable: true,
        userMessage: 'CLI værktøjet er ikke installeret',
        recoverySuggestions: this._getInstallSuggestions(providerId),
        technicalDetails: { exitCode: result.code }
      });
    }

    // RATE_LIMIT errors
    if (this._matchAny(stderr, RATE_LIMIT_PATTERNS)) {
      return new ProviderError({
        type: 'RATE_LIMIT',
        providerId,
        message: 'Rate limit exceeded',
        isRecoverable: true,
        userMessage: 'Du har sendt for mange anmodninger',
        recoverySuggestions: [
          'Vent et par minutter og prøv igen',
          'Opgrader din abonnement for højere grænser'
        ],
        technicalDetails: { exitCode: result.code, stderr: result.stderr }
      });
    }

    // CONTEXT_LENGTH errors
    if (this._matchAny(stderr, CONTEXT_LENGTH_PATTERNS)) {
      return new ProviderError({
        type: 'CONTEXT_LENGTH',
        providerId,
        message: 'Input exceeds context length',
        isRecoverable: true,
        userMessage: 'Dokumentet er for langt',
        recoverySuggestions: [
          'Prøv med et kortere dokument',
          'Del dokumentet op i mindre dele'
        ],
        technicalDetails: { exitCode: result.code, stderr: result.stderr }
      });
    }

    // NETWORK errors
    if (this._matchAny(stderr, NETWORK_PATTERNS)) {
      return new ProviderError({
        type: 'NETWORK',
        providerId,
        message: 'Network request failed',
        isRecoverable: true,
        userMessage: 'Kunne ikke oprette forbindelse',
        recoverySuggestions: [
          'Tjek din internetforbindelse',
          'Prøv igen om et øjeblik',
          'Kontroller firewall indstillinger'
        ],
        technicalDetails: { exitCode: result.code, stderr: result.stderr }
      });
    }

    // Generic PROVIDER error (fallback)
    return new ProviderError({
      type: 'PROVIDER',
      providerId,
      message: `CLI failed with exit code ${result.code}`,
      isRecoverable: false,
      userMessage: 'CLI værktøjet fejlede',
      recoverySuggestions: [
        'Prøv med en anden provider (Claude, Gemini)',
        'Tjek log filen for detaljer',
        'Kontakt support hvis problemet fortsætter'
      ],
      technicalDetails: {
        exitCode: result.code,
        signal: result.signal,
        stderr: result.stderr.slice(0, 500) // First 500 chars only
      }
    });
  }

  // Pattern matching helpers...
}
```

### 3.2 Error Pattern Definitions

```typescript
/**
 * AUTH error patterns
 * Match these in stderr/stdout to detect authentication issues
 */
const AUTH_PATTERNS = [
  // General auth patterns
  /\bauth/i,
  /\blogin\b/i,
  /\bunauthorized\b/i,
  /\bunauthenticated\b/i,
  /\binvalid\s+credentials\b/i,
  /\bapi\s+key\b/i,
  /\btoken\s+expired\b/i,

  // Provider-specific patterns
  /please\s+run\s+["']?\w+\s+login["']?/i, // "Please run 'claude login'"
  /not\s+logged\s+in/i,
  /authentication\s+required/i,
  /sign\s+in\s+required/i
];

/**
 * NOT_INSTALLED error patterns
 */
const NOT_INSTALLED_PATTERNS = [
  // Unix-style
  /command\s+not\s+found/i,
  /\bno\s+such\s+file\s+or\s+directory\b/i,

  // Windows-style
  /is\s+not\s+recognized\s+as\s+an\s+internal\s+or\s+external\s+command/i,
  /'\w+'\s+is\s+not\s+recognized/i,

  // General
  /\bnot\s+installed\b/i,
  /\bcannot\s+find\s+command\b/i
];

/**
 * RATE_LIMIT error patterns
 */
const RATE_LIMIT_PATTERNS = [
  /rate\s+limit/i,
  /too\s+many\s+requests/i,
  /\b429\b/, // HTTP 429
  /quota\s+exceeded/i,
  /request\s+limit/i,
  /throttle/i
];

/**
 * CONTEXT_LENGTH error patterns
 */
const CONTEXT_LENGTH_PATTERNS = [
  /context\s+length/i,
  /too\s+long/i,
  /exceeds\s+maximum/i,
  /input\s+too\s+large/i,
  /token\s+limit/i,
  /maximum\s+tokens/i
];

/**
 * NETWORK error patterns
 */
const NETWORK_PATTERNS = [
  /network\s+error/i,
  /connection\s+refused/i,
  /connection\s+timeout/i,
  /connection\s+failed/i,
  /could\s+not\s+connect/i,
  /dns\s+lookup\s+failed/i,
  /\bECONNREFUSED\b/i,
  /\bETIMEDOUT\b/i,
  /\bECONNRESET\b/i,
  /socket\s+hang\s+up/i
];
```

### 3.3 Provider-Specific Suggestions

```typescript
/**
 * Get authentication suggestions for specific provider
 */
function _getAuthSuggestions(providerId: string): string[] {
  switch (providerId) {
    case 'claude-cli':
      return [
        'Kør "claude login" i din terminal',
        'Tjek at du har en gyldig Claude abonnement'
      ];

    case 'gemini-cli':
      return [
        'Kør "gemini login" i din terminal',
        'Sørg for at du har adgang til Gemini'
      ];

    case 'openai-cli':
      return [
        'Kør "openai login" i din terminal',
        'Tjek at din OpenAI API nøgle er gyldig'
      ];

    case 'claude-api':
      return [
        'Sæt ANTHROPIC_API_KEY miljøvariabel',
        'Få en API nøgle fra https://console.anthropic.com'
      ];

    default:
      return ['Log ind med din provider'];
  }
}

/**
 * Get installation suggestions for specific provider
 */
function _getInstallSuggestions(providerId: string): string[] {
  switch (providerId) {
    case 'claude-cli':
      return [
        'Installer Claude CLI: npm install -g @anthropic-ai/claude-cli',
        'Se mere på: https://claude.ai/cli'
      ];

    case 'gemini-cli':
      return [
        'Installer Gemini CLI: npm install -g @google/generative-ai-cli',
        'Se mere på: https://gemini.google.com/cli'
      ];

    case 'openai-cli':
      return [
        'Installer OpenAI CLI: pip install openai',
        'Se mere på: https://platform.openai.com/docs/api-reference'
      ];

    default:
      return ['Installer CLI værktøjet for din provider'];
  }
}
```

---

## 4. HTTP API Error Mapping

### 4.1 HTTP Status Code Mapping

```typescript
/**
 * Maps HTTP response to ProviderError
 * Used by API-based providers (ClaudeAPIProvider, etc.)
 */
class HTTPErrorMapper {
  static async map(
    providerId: string,
    response: Response
  ): Promise<ProviderError> {
    const status = response.status;
    const body = await response.text();

    // Try to parse JSON error
    let errorData: any = null;
    try {
      errorData = JSON.parse(body);
    } catch {
      // Not JSON, use raw text
    }

    // Map status code to error type
    switch (status) {
      case 401:
      case 403:
        return new ProviderError({
          type: 'AUTH',
          providerId,
          message: `HTTP ${status}: ${errorData?.error?.message || 'Unauthorized'}`,
          isRecoverable: true,
          userMessage: 'Ugyldig API nøgle',
          recoverySuggestions: this._getAuthSuggestions(providerId),
          technicalDetails: { httpStatus: status, httpBody: body }
        });

      case 429:
        return new ProviderError({
          type: 'RATE_LIMIT',
          providerId,
          message: `HTTP 429: Rate limit exceeded`,
          isRecoverable: true,
          userMessage: 'For mange anmodninger',
          recoverySuggestions: [
            'Vent et par minutter og prøv igen',
            'Opgrader din API plan'
          ],
          technicalDetails: { httpStatus: status, httpBody: body }
        });

      case 413:
        return new ProviderError({
          type: 'CONTEXT_LENGTH',
          providerId,
          message: `HTTP 413: Payload too large`,
          isRecoverable: true,
          userMessage: 'Dokumentet er for langt',
          recoverySuggestions: [
            'Reducer dokumentstørrelsen',
            'Del dokumentet op i mindre dele'
          ],
          technicalDetails: { httpStatus: status, httpBody: body }
        });

      case 500:
      case 502:
      case 503:
      case 504:
        return new ProviderError({
          type: 'PROVIDER',
          providerId,
          message: `HTTP ${status}: Server error`,
          isRecoverable: true,
          userMessage: 'Serveren er midlertidigt utilgængelig',
          recoverySuggestions: [
            'Prøv igen om et øjeblik',
            'Tjek provider status side',
            'Skift til en anden provider'
          ],
          technicalDetails: { httpStatus: status, httpBody: body }
        });

      case 529: // Anthropic-specific: Model overloaded
        return new ProviderError({
          type: 'MODEL_OVERLOADED',
          providerId,
          message: `HTTP 529: Model overloaded`,
          isRecoverable: true,
          userMessage: 'Modellen er overbelastet',
          recoverySuggestions: [
            'Vent et øjeblik og prøv igen',
            'Prøv en anden model',
            'Prøv på et andet tidspunkt'
          ],
          technicalDetails: { httpStatus: status, httpBody: body }
        });

      default:
        return new ProviderError({
          type: 'UNKNOWN',
          providerId,
          message: `HTTP ${status}: ${errorData?.error?.message || 'Unknown error'}`,
          isRecoverable: false,
          userMessage: 'Uventet fejl',
          recoverySuggestions: [
            'Tjek log filen for detaljer',
            'Kontakt support'
          ],
          technicalDetails: { httpStatus: status, httpBody: body }
        });
    }
  }

  private static _getAuthSuggestions(providerId: string): string[] {
    // Reuse from CLI mapper
    return _getAuthSuggestions(providerId);
  }
}
```

---

## 5. Error Factory Pattern

### 5.1 Centralized Error Creation

```typescript
/**
 * Factory for creating common ProviderErrors
 * Ensures consistent error messages across the app
 */
class ProviderErrorFactory {
  static notInstalled(providerId: string): ProviderError {
    return new ProviderError({
      type: 'NOT_INSTALLED',
      providerId,
      message: `${providerId} CLI not found`,
      isRecoverable: true,
      userMessage: `${this._getProviderDisplayName(providerId)} er ikke installeret`,
      recoverySuggestions: _getInstallSuggestions(providerId)
    });
  }

  static authRequired(providerId: string): ProviderError {
    return new ProviderError({
      type: 'AUTH',
      providerId,
      message: 'Authentication required',
      isRecoverable: true,
      userMessage: 'Du skal logge ind først',
      recoverySuggestions: _getAuthSuggestions(providerId)
    });
  }

  static timeout(providerId: string, timeoutMs: number): ProviderError {
    return new ProviderError({
      type: 'TIMEOUT',
      providerId,
      message: `Request timed out after ${timeoutMs}ms`,
      isRecoverable: true,
      userMessage: 'Anmodningen tog for lang tid',
      recoverySuggestions: [
        'Prøv igen med et kortere dokument',
        'Øg timeout i indstillinger'
      ],
      technicalDetails: { timeoutMs }
    });
  }

  static cancelled(providerId: string): ProviderError {
    return new ProviderError({
      type: 'CANCELLED',
      providerId,
      message: 'Request was cancelled',
      isRecoverable: false,
      userMessage: 'Analysen blev afbrudt',
      recoverySuggestions: []
    });
  }

  static networkError(providerId: string, cause?: Error): ProviderError {
    return new ProviderError({
      type: 'NETWORK',
      providerId,
      message: 'Network request failed',
      isRecoverable: true,
      userMessage: 'Kunne ikke oprette forbindelse',
      recoverySuggestions: [
        'Tjek din internetforbindelse',
        'Prøv igen om et øjeblik'
      ],
      cause
    });
  }

  private static _getProviderDisplayName(providerId: string): string {
    const names: Record<string, string> = {
      'claude-cli': 'Claude CLI',
      'gemini-cli': 'Gemini CLI',
      'openai-cli': 'OpenAI CLI',
      'claude-api': 'Claude API',
      // ...
    };
    return names[providerId] || providerId;
  }
}
```

---

## 6. Integration with BaseCLIProvider

### 6.1 Usage in Base Class

```typescript
abstract class BaseCLIProvider implements LLMProvider {
  async send(request: LLMRequest, options: ExecutionOptions = {}): Promise<LLMResponse> {
    // ... execution logic ...

    const result = await this._executeProcess(command, options);

    // Map result to error using centralized mapper
    if (!result.success) {
      const error = CLIErrorMapper.map(this.id, result);
      throw error;
    }

    // ... success path ...
  }
}
```

### 6.2 Subclass Override (Optional)

```typescript
class ClaudeCLIProvider extends BaseCLIProvider {
  /**
   * OPTIONAL: Override error parsing for provider-specific patterns
   */
  protected parseError(
    code: number,
    stdout: string,
    stderr: string,
    signal: string | null
  ): ProviderError {
    // Check for Claude-specific error patterns first
    if (stderr.includes('context window exceeded')) {
      return new ProviderError({
        type: 'CONTEXT_LENGTH',
        providerId: this.id,
        message: 'Input exceeds Claude context window',
        isRecoverable: true,
        userMessage: 'Dokumentet er for langt til Claude',
        recoverySuggestions: [
          'Prøv med et kortere dokument',
          'Brug Gemini som har større context window'
        ],
        technicalDetails: { exitCode: code, stderr }
      });
    }

    // Fall back to default pattern matching
    return CLIErrorMapper.map(this.id, {
      success: false,
      code,
      stdout,
      stderr,
      signal,
      timedOut: false,
      cancelled: false
    });
  }
}
```

---

## 7. Error Display in UI

### 7.1 Error Component (React)

```jsx
/**
 * Display ProviderError in UI
 */
function ErrorMessage({ error }: { error: ProviderError }) {
  return (
    <div className="error-container">
      <div className="error-icon">⚠️</div>

      {/* User-friendly message */}
      <h3>{error.userMessage}</h3>

      {/* Recovery suggestions */}
      {error.recoverySuggestions.length > 0 && (
        <div className="recovery-suggestions">
          <p>Prøv følgende:</p>
          <ul>
            {error.recoverySuggestions.map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Error type badge (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="error-debug">
          <span className="error-type-badge">{error.type}</span>
          <span className="provider-badge">{error.providerId}</span>
        </div>
      )}
    </div>
  );
}
```

### 7.2 Error Logging

```typescript
/**
 * Log ProviderError with full details
 */
function logProviderError(error: ProviderError): void {
  logger.error('Provider request failed', {
    type: error.type,
    providerId: error.providerId,
    isRecoverable: error.isRecoverable,
    message: error.message,
    userMessage: error.userMessage,
    recoverySuggestions: error.recoverySuggestions,
    technicalDetails: error.technicalDetails,
    stack: error.stack
  });
}
```

---

## 8. Testing Strategy

### 8.1 Error Mapper Tests

```typescript
describe('CLIErrorMapper', () => {
  it('should detect AUTH errors from stderr patterns', () => {
    const result: ProcessResult = {
      success: false,
      code: 1,
      stdout: '',
      stderr: 'Error: Authentication required. Please run "claude login"',
      signal: null,
      timedOut: false,
      cancelled: false
    };

    const error = CLIErrorMapper.map('claude-cli', result);

    expect(error.type).toBe('AUTH');
    expect(error.isRecoverable).toBe(true);
    expect(error.userMessage).toContain('logge ind');
    expect(error.recoverySuggestions).toContain('Kør "claude login" i din terminal');
  });

  it('should detect TIMEOUT from process state', () => {
    const result: ProcessResult = {
      success: false,
      code: -1,
      stdout: '',
      stderr: '',
      signal: 'SIGTERM',
      timedOut: true,
      cancelled: false,
      timeoutMs: 60000
    };

    const error = CLIErrorMapper.map('gemini-cli', result);

    expect(error.type).toBe('TIMEOUT');
    expect(error.technicalDetails?.timeoutMs).toBe(60000);
  });

  it('should detect NOT_INSTALLED from "command not found"', () => {
    const result: ProcessResult = {
      success: false,
      code: 127,
      stdout: '',
      stderr: 'bash: claude: command not found',
      signal: null,
      timedOut: false,
      cancelled: false
    };

    const error = CLIErrorMapper.map('claude-cli', result);

    expect(error.type).toBe('NOT_INSTALLED');
    expect(error.recoverySuggestions.length).toBeGreaterThan(0);
  });

  // ... more tests for each error type ...
});
```

---

## 9. Migration Checklist

- [ ] Implement `ProviderError` class with TypeScript types
- [ ] Define error pattern constants (`AUTH_PATTERNS`, etc.)
- [ ] Implement `CLIErrorMapper.map()` with pattern matching
- [ ] Implement `HTTPErrorMapper.map()` for API providers
- [ ] Create `ProviderErrorFactory` with common error creators
- [ ] Update `BaseCLIProvider` to use `CLIErrorMapper`
- [ ] Update all existing adapters to throw `ProviderError`
- [ ] Update `analysis-runner.js` to handle `ProviderError`
- [ ] Create React component for displaying errors
- [ ] Update logger to format `ProviderError` properly
- [ ] Write unit tests for all error patterns
- [ ] Write integration tests with real CLI errors
- [ ] Document error types in user-facing docs

---

## 10. Success Criteria

✅ **All errors classified:** Every possible error maps to a `ProviderErrorType`
✅ **User-friendly messages:** All `userMessage` fields in Danish, no technical jargon
✅ **Actionable suggestions:** Every recoverable error has ≥1 recovery suggestion
✅ **Consistent across providers:** Same error type → same message structure
✅ **No raw stderr in UI:** Technical details hidden from end users
✅ **Test coverage ≥95%:** All error patterns tested
✅ **Easy to extend:** Adding new pattern = 2 lines of code

---

## 11. Open Questions

### Should we support error recovery callbacks?

```typescript
interface ExecutionOptions {
  // ...
  onError?: (error: ProviderError) => 'retry' | 'abort' | 'fallback';
}
```

**Pros:**
- Automatic retry for transient errors (rate limits, network)
- Fallback to alternative provider on failure

**Cons:**
- More complexity
- Retry logic better handled by caller (analysis-runner)

**Recommendation:** No. Keep providers simple. Let `analysis-runner` handle retry logic.

---

## Status

**Implementation Priority:** 🔴 **CRITICAL** (required for provider abstraction)

**Estimated Effort:** 8-10 hours
- ProviderError class: 2 hours
- Pattern definitions: 2 hours
- Mapper implementations: 3 hours
- Testing: 2-3 hours

**Dependencies:**
- None (can implement standalone)
- Will be used by `BaseCLIProvider` and all providers

---

## References

- Main spec: `provider-abstraction.spec.md`
- CLI pattern: `provider-abstraction-cli-pattern.spec.md`
- Testing guide: `provider-abstraction-testing.spec.md`
- Current adapters: `src/adapters/claude-adapter.js`, `src/adapters/gemini-adapter.js`
