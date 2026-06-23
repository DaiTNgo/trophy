---
name: api-boundary-research
description: Investigates large API boundaries, explains why an API is broad, and recommends whether to keep it, split it, or divide client-side ownership by section. Use when a large API response drives multiple sections, when state ownership is unclear, when you need to justify API shape, or when refactoring component data flow.
---

# API Boundary Research

Use this skill when an API seems too large for the UI that consumes it, or when API shape is being treated as if it automatically determines component state ownership.

## Core Principle

API shape does not blindly dictate component ownership.

State ownership should still follow UI ownership, behavior ownership, and rendering dependency.

## Design Targets

- Clear ownership boundaries
- Minimal coupling between unrelated sections
- Justified API shape
- Predictable loading, error, refresh, and cache lifecycles
- SOLID-aligned boundaries without ceremony

## Research Workflow

Use this flow before changing ownership or splitting APIs:
1. Identify the API boundary: what data is grouped together and which sections consume it?
2. Identify the real reason the API is large: consistency, transactionality, batching, permission, latency, cache sharing, or convenience.
3. Check section independence: can sections load, fail, refresh, or evolve independently?
4. Check render coupling: would one section re-render unrelated sections?
5. Check lifecycle coupling: do sections need different loading, error, empty, or cache lifecycles?
6. Decide whether the API boundary is justified or accidental.
7. If unclear, propose options before refactoring.

See [REFERENCE.md](REFERENCE.md) for the investigation template and decision matrix.

## Decision Rule

Do not lift state only because data comes from one API.

Lift state only when the parent coordinates shared rendering or shared behavior.

If the parent only fetches data for convenience, consider section-level ownership or a smaller API.

## Output Shape

When using this skill, return:
1. Current problem.
2. Affected sections.
3. Current API shape.
4. Why the API is large, or why that reason is missing.
5. Proposed API options.
6. Pros and cons.
7. Migration cost.
8. Recommended direction.

## Validation Checklist

- [ ] The API boundary has a clear reason to be large, or the lack of reason is explicit.
- [ ] Section independence has been checked.
- [ ] Rendering and lifecycle coupling have been checked.
- [ ] Ownership is not inferred from API shape alone.
- [ ] A proposal is produced when the answer is unclear.
