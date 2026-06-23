# API Boundary Research Reference

Use this file after following the quick workflow in `SKILL.md`.

## SOLID Review Lens

Use SOLID as a design check, not as ceremony.

- Single responsibility: one API boundary should have one clear reason to exist.
- Open/closed: extend through smaller boundaries and composition instead of one ever-growing response.
- Liskov substitution: section-level consumers should honor the same contract if they are meant to be swappable.
- Interface segregation: keep section data and selectors small, focused, and task-specific.
- Dependency inversion: UI should depend on small abstractions, not a giant response shape by default.

## Why Large APIs Exist

Large responses can be valid when they are justified by one or more real constraints:

- A single transaction must stay consistent.
- Several sections must refresh together.
- Permission or policy checks are shared.
- Latency is lower when data is fetched once.
- Cache reuse is materially better.
- Server-side batching avoids duplicate work.

If none of these are true, the large API may just be convenience coupling.

## Investigation Questions

- What problem did the large API solve originally?
- Which sections truly depend on each other?
- Which sections only happen to share a parent?
- Which parts of the response are independently useful?
- Which parts change at different rates?
- Which parts have different error or loading behavior?
- Which parts have different cache lifecycles?
- Which parts are expensive to compute or fetch?

## Proposal Template

When the answer is unclear, propose options before refactoring:

1. Keep one large API.
2. Split into smaller APIs.
3. Keep one API but split client-side ownership by section hooks or selectors.

Recommended output:

- Current problem
- Affected sections
- Current API shape
- Why the API is large
- Proposed API options
- Pros and cons
- Migration cost
- Recommended direction

## Decision Matrix

- Keep one large API when the coupling is real and shared lifecycle behavior matters.
- Split into smaller APIs when sections are independent and the large response is accidental coupling.
- Keep one API but split client-side ownership when the backend boundary is justified but the UI still needs section-level ownership.

## Refactor Signals

- A parent owns data only because it fetched it first.
- Unrelated sections re-render together.
- Loading or error states are forced to match.
- Cache invalidation is broader than the UI needs.
- A response is hard to explain without listing many unrelated consumers.

## Anti-Patterns

- Treating API shape as the source of truth for component ownership.
- Keeping a large response without being able to explain why it is large.
- Hiding coupling by passing the same blob to many children.
- Refactoring state ownership before understanding the API boundary.

## Example Review Output

Use this structure when presenting a conclusion:

```md
Current problem:
Affected sections:
Current API shape:
Why the API is large:
Proposed API options:
Pros and cons:
Migration cost:
Recommended direction:
```
