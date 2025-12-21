# Architecture Decision Records (ADRs)

This directory contains **Architecture Decision Records** (ADRs) for the Contract Reviewer project.

## What is an ADR?

An Architecture Decision Record (ADR) documents an important architectural decision made during the project, including:
- **Context:** What situation led to this decision?
- **Decision:** What did we decide to do?
- **Rationale:** Why did we make this choice?
- **Consequences:** What are the trade-offs and outcomes?
- **Future Review:** When should we revisit this decision?

ADRs help:
- 📚 Preserve institutional knowledge
- 🧭 Guide future contributors
- 🔍 Make implicit decisions explicit
- ⚖️ Document trade-offs and alternatives considered
- 🔄 Enable informed decision reversal when conditions change

## ADR Format

Each ADR follows this structure:

```markdown
# ADR-XXX: Title

**Status:** Accepted | Deprecated | Superseded
**Date:** YYYY-MM-DD
**Context:** Brief project state when decision was made

## Decision
What we decided to do

## Context
Full background and situation

## Rationale
Why we made this choice

## Consequences
Trade-offs, benefits, and drawbacks

## Future Review Triggers
When to revisit this decision
```

## Index of ADRs

### Active Decisions

| ADR | Title | Status | Date | Summary |
|-----|-------|--------|------|---------|
| [001](./ADR-001-cli-vs-http-sessions.md) | CLI-Based LLM Access vs HTTP Session Automation | ✅ Accepted | 2025-12-20 | Continue with CLI-based approach; HTTP sessions are future option when specific pivot signals appear |

### Deprecated Decisions

_None yet_

## Contributing

When making a new architectural decision:

1. **Create a new ADR file:**
   - Name: `ADR-XXX-short-title.md` (increment number)
   - Follow the standard format above

2. **Update this README:**
   - Add entry to the index table
   - Link to the new ADR file

3. **Reference in code:**
   - Link to relevant ADR in code comments when implementing the decision
   - Update related specs to reference the ADR

4. **Keep it current:**
   - Mark ADRs as "Deprecated" when superseded
   - Create new ADR to supersede old one (don't delete)
   - Update "Future Review" sections when triggers occur

## Key Principles

- **Document decisions, not requirements:** ADRs explain WHY, not just WHAT
- **Immutable history:** Don't edit old ADRs; supersede them with new ones
- **Decision-focused:** One decision per ADR (avoid scope creep)
- **Evidence-based:** Base decisions on data and observations, not speculation
- **Reversible:** Every decision should have clear criteria for when to reconsider

## Related Documentation

- **CLAUDE.md:** Project overview and implementation status
- **specs/*.spec.md:** Technical specifications and implementation details
- **HISTORY.md:** Phase-by-phase development history
- **DEV-WORKFLOW.md:** Development best practices

## Further Reading

- [Architecture Decision Records (ADR) by Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization](https://adr.github.io/)
