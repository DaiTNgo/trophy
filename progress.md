# Repo Progress

## Current State
- Root harness is now a fallback index for non-OpenSpec work only.
- OpenSpec changes should keep their own `tasks.md`, `progress.md`, and `session-handoff.md` inside `openspec/changes/<change>/`.
- `./init.sh` remains the baseline verification entrypoint.

## Notes
- Do not use this file as the source of truth for parallel OpenSpec changes.
- If a change folder is missing local state files, create them alongside that change before starting work.
