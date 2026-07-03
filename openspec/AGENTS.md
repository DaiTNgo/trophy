# OpenSpec changes

Each folder under `openspec/changes/<change>/` is its own unit of work.

## Working rules

- Read the change's `proposal.md`, `design.md`, `specs/`, and `tasks.md` before editing anything in that folder.
- If `progress.md` or `session-handoff.md` do not exist in the change folder, create them there and keep them local to that change.
- Update task checkboxes in the change's `tasks.md` as work completes.
- Keep progress, evidence, blockers, and resume notes inside the change folder so parallel changes do not serialize each other.
- Treat the root `feature_list.json`, `progress.md`, and `session-handoff.md` as repo-level fallback files only, not the source of truth for OpenSpec work.
- Parallel OpenSpec changes may proceed independently when they do not share files or ownership boundaries.