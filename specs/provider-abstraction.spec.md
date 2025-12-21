# LLM Provider Abstraction Specification v1

## 1. Purpose

The provider abstraction defines a stable contract between the application and any Large Language Model access method.

The application must not know or care whether the provider is:

- a CLI
- an HTTP API
- a web session
- a local model
- a future hybrid

The provider is responsible for:

- message execution
- context injection
- response normalization
- error classification

---

## 2. Core Concepts

### 2.1 Provider

A provider is a **stateless execution adapter**.

State (memory, context, instructions) is supplied explicitly by the app.

### 2.2 Context

Context is external, user-owned data, typically loaded from files.

**Examples:**
- `Gemini.md`
- `Claude.md`
- Project-specific instructions
- Tooling notes

The provider receives context as **plain text**, not file paths.

### 2.3 Messages

Messages represent the conversational exchange.

```typescript
type Role = "system" | "user" | "assistant"

interface Message {
  role: Role
  content: string
}
```

---

## 3. Provider Interface (v1)

```typescript
interface LLMProvider {
  readonly id: string
  readonly displayName: string
  readonly capabilities: ProviderCapabilities

  send(request: LLMRequest): Promise<LLMResponse>
}
```

---

## 4. Request Object

```typescript
interface LLMRequest {
  messages: Message[]
  context: ProviderContext
  options?: ProviderOptions
}
```

### 4.1 ProviderContext

```typescript
interface ProviderContext {
  /**
   * Combined instruction text
   * (e.g. content of Gemini.md, role files, project notes)
   */
  instructions: string

  /**
   * Optional metadata for UI/logging
   */
  metadata?: Record<string, string>
}
```

**🔎 Important:**
- The provider does **not** read files.
- The app controls file IO and ordering.

### 4.2 ProviderOptions

These are **hints**, not guarantees.

```typescript
interface ProviderOptions {
  temperature?: number
  maxTokens?: number
  stream?: boolean
}
```

Providers may ignore unsupported options.

---

## 5. Response Object

```typescript
interface LLMResponse {
  message: Message
  usage?: UsageInfo
  providerMeta?: ProviderMeta
}
```

### 5.1 UsageInfo

Optional, provider-dependent.

```typescript
interface UsageInfo {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}
```

### 5.2 ProviderMeta

```typescript
interface ProviderMeta {
  providerId: string
  model?: string
  latencyMs?: number
  raw?: unknown
}
```

**Note:** `raw` is for debugging only and must never be required by the app.

---

## 6. Error Model (Critical)

All providers must normalize errors into this shape.

```typescript
type ProviderErrorType =
  | "CONFIG"
  | "AUTH"
  | "NOT_INSTALLED"
  | "RATE_LIMIT"
  | "NETWORK"
  | "TIMEOUT"
  | "PROVIDER"
  | "UNKNOWN"

class ProviderError extends Error {
  readonly type: ProviderErrorType
  readonly providerId: string
  readonly isRecoverable: boolean
  readonly userMessage?: string
}
```

**Error rules:**
- `userMessage` must be safe to display
- Stack traces stay internal
- CLI stderr is **never** shown raw to users

---

## 7. Capability Declaration

Providers declare what they support.

```typescript
interface ProviderCapabilities {
  streaming: boolean
  temperature: boolean
  maxTokens: boolean
  systemMessages: boolean
}
```

**This allows:**
- UI adaptation
- Graceful degradation

---

## 8. Context Injection Rules (Important UX)

Providers must follow the same logical ordering, even if the transport differs:

1. System instructions (from context)
2. System messages (if supported)
3. Conversation history
4. User message

This guarantees **predictable behavior** across providers.

---

## 9. Streaming (Optional, v1.1)

If supported:

```typescript
interface StreamingProvider extends LLMProvider {
  stream(request: LLMRequest): AsyncIterable<LLMChunk>
}

interface LLMChunk {
  contentDelta: string
  done?: boolean
}
```

---

## 10. Non-Goals (Explicit)

This abstraction does **not**:

- manage prompt templates
- manage memory
- store history
- perform file IO
- decide which provider to use

Those are **application concerns**.

---

## 11. Example Implementation

### Gemini CLI Provider (Sketch)

```javascript
class GeminiCLIProvider {
  id = "gemini-cli"
  displayName = "Gemini (Local CLI)"

  capabilities = {
    streaming: false,
    temperature: true,
    maxTokens: false,
    systemMessages: true
  }

  async send(req) {
    const prompt = [
      req.context.instructions,
      ...req.messages.map(m => `${m.role}: ${m.content}`)
    ].join("\n\n")

    // execute CLI, capture stdout/stderr
    // normalize output

    return {
      message: {
        role: "assistant",
        content: parsedOutput
      },
      providerMeta: {
        providerId: this.id,
        model: "gemini-pro"
      }
    }
  }
}
```

---

## 12. Migration Path for Current Codebase

### Current State

The current adapters (`claude-adapter.js`, `gemini-adapter.js`) are tightly coupled to:
- File paths for system prompts
- Specific CLI syntax
- Direct file IO operations
- Non-standard error handling

### Refactoring Steps

#### Phase 1: Interface Alignment
1. Create base `LLMProvider` interface
2. Implement `ProviderError` class
3. Add capability declarations to existing adapters

#### Phase 2: Context Externalization
1. Move prompt loading from adapters to `analysis-runner.js`
2. Pass prompt content as strings, not file paths
3. Implement `ProviderContext` structure

#### Phase 3: Error Normalization
1. Map CLI errors to `ProviderErrorType`
2. Generate user-friendly Danish error messages
3. Standardize error handling across adapters

#### Phase 4: Response Standardization
1. Implement `LLMResponse` structure
2. Add usage tracking where available
3. Include provider metadata

### Updated File Structure

```
src/
├── providers/
│   ├── base/
│   │   ├── LLMProvider.js          # Base interface
│   │   ├── ProviderError.js        # Error class
│   │   └── ProviderTypes.js        # Type definitions
│   ├── cli/
│   │   ├── ClaudeCLIProvider.js    # Refactored adapter
│   │   ├── GeminiCLIProvider.js    # Refactored adapter
│   │   └── OpenAICLIProvider.js    # Future implementation
│   └── registry/
│       └── ProviderRegistry.js     # Provider discovery and selection
├── services/
│   └── analysis-runner.js          # Updated to use provider interface
└── utils/
    └── provider-config-loader.js   # Loads context from files
```

---

## 13. Benefits of This Abstraction

### For the Application
- **Provider independence:** Swap providers without changing core logic
- **Testability:** Mock providers easily for testing
- **Predictability:** Consistent behavior across all providers
- **Error handling:** Standardized error types and user messages

### For New Providers
- **Clear contract:** Know exactly what to implement
- **Flexibility:** Internal implementation can vary widely
- **Guidance:** Capability system prevents unsupported features

### For Users
- **Consistency:** Same UX regardless of provider
- **Reliability:** Errors are clear and actionable
- **Transparency:** Usage tracking when available

---

## 14. Implementation Checklist

### Core Abstraction
- [ ] Create `src/providers/base/LLMProvider.js` interface
- [ ] Create `src/providers/base/ProviderError.js` class
- [ ] Create `src/providers/base/ProviderTypes.js` type definitions
- [ ] Create `src/providers/registry/ProviderRegistry.js`

### Refactor Existing Adapters
- [ ] Refactor `claude-adapter.js` → `ClaudeCLIProvider.js`
- [ ] Refactor `gemini-adapter.js` → `GeminiCLIProvider.js`
- [ ] Implement capability declarations
- [ ] Normalize error handling
- [ ] Standardize response format

### Update Services
- [ ] Update `analysis-runner.js` to use provider interface
- [ ] Move prompt loading logic out of adapters
- [ ] Implement context building (instructions + messages)
- [ ] Update IPC handlers to work with new structure

### Testing
- [ ] Create provider interface tests
- [ ] Test error normalization
- [ ] Test context injection ordering
- [ ] Test capability-based feature detection
- [ ] Integration tests with all providers

### Documentation
- [ ] Update API documentation
- [ ] Add provider development guide
- [ ] Update error handling documentation
- [ ] Create migration guide for future providers

---

## 15. Future Extensions (v2+)

### Multi-turn Conversations
```typescript
interface ConversationProvider extends LLMProvider {
  sendWithHistory(request: LLMRequest, history: Message[]): Promise<LLMResponse>
}
```

### Tool Use / Function Calling
```typescript
interface ToolCapableProvider extends LLMProvider {
  sendWithTools(request: LLMRequest, tools: ToolDefinition[]): Promise<LLMResponse>
}
```

### Local Model Support
```typescript
class OllamaCLIProvider implements LLMProvider {
  // Same interface, different implementation
}
```

### Hybrid Providers
```typescript
class ClaudeHybridProvider implements LLMProvider {
  // Falls back from CLI → API → Web based on availability
}
```

### HTTP Session Providers (Future Consideration)

**Status:** Under consideration for future implementation (see ADR-001)

HTTP session-based providers automate browser interactions with LLM web interfaces:

```typescript
class ClaudeWebSessionProvider implements LLMProvider {
  id = "claude-web-session"
  displayName = "Claude (Web Session - Experimental)"

  capabilities = {
    streaming: true,
    temperature: false,
    maxTokens: false,
    systemMessages: true
  }

  async send(req: LLMRequest): Promise<LLMResponse> {
    // Automate browser session with Claude web interface
    // Parse response from web UI
    // Return normalized response
  }
}
```

**Benefits:**
- No CLI installation required
- Reuses web subscriptions
- Potentially easier onboarding for some users

**Risks:**
- No stable contract (depends on web UI structure)
- Can break without notice (provider UI changes)
- ToS gray zone for some providers
- Higher maintenance burden

**Decision:** Not implementing now. Will reconsider when specific pivot signals appear.

**See:** `docs/architecture/ADR-001-cli-vs-http-sessions.md` for full rationale and decision criteria.

---

## 16. Alignment with Existing Specs

### Integrates With
- **`provider-custom-instructions.spec.md`:** Instructions become part of `ProviderContext`
- **`api-contracts.spec.md`:** Defines data models for provider communication
- **`cli-adapter.spec.md`:** CLI adapters become `LLMProvider` implementations

### Supersedes
- Current adapter architecture (too tightly coupled)
- Direct file path passing to providers
- Provider-specific error handling

### Enables
- **Provider Custom Instructions:** Load from files, pass as context
- **Multi-provider Support:** OpenAI, local models, APIs, HTTP sessions
- **Better Testing:** Mock providers without filesystem dependencies
- **Future Features:** Streaming, conversation history, tool use
- **Strategic Flexibility:** Easy pivot to alternative provider types when justified (see ADR-001)

### Related Architectural Decisions
- **ADR-001:** CLI-Based LLM Access vs HTTP Session Automation
  - Rationale for current CLI-based approach
  - Pivot criteria for adding HTTP session providers
  - Provider abstraction makes pivot additive, not destructive

---

## Status

**Implementation Status:** ❌ **Not Implemented**

**Priority:** 🟡 **Medium** (foundational work for future extensibility)

**Estimated Effort:** 12-16 hours
- Base abstraction: 4 hours
- Refactor Claude adapter: 3 hours
- Refactor Gemini adapter: 3 hours
- Update analysis-runner: 2 hours
- Testing: 2-4 hours

**Dependencies:**
- Should be implemented **before** OpenAI adapter
- Should be implemented **before** provider custom instructions
- Can be done independently of frontend work

---

## Notes

- This abstraction prioritizes **flexibility** and **consistency** over feature completeness
- Providers declare capabilities to enable graceful degradation
- The app controls all IO and state - providers are pure execution adapters
- Error normalization is critical for good UX across providers
- Context (instructions) is always externally supplied, never read by the provider
