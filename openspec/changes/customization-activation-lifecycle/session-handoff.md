# Session Handoff

## Change

`customization-activation-lifecycle`

## Status

Planning is complete; implementation has not started.

## Decisions To Preserve

- First-time activation is an unsaved FocusModal Setup Session and commits one
  atomic multipart command only after a valid template and backgrounds for all
  current variants are staged.
- Deactivation retains configuration and background assets; Manage Media hides
  Customization Backgrounds while deactivated.
- Reactivation is direct when already valid, otherwise an atomic repair modal
  supplies only missing backgrounds.
- New variants require an atomic Information + Media submission with a valid
  background only while customization is active.
- Permanent deletion requires deactivation and cleans up customization data,
  background assets, media references, and a matching thumbnail.

See `design.md`, `specs/customization-activation-lifecycle/spec.md`, and
`docs/adr/0013-customization-activation-is-atomic.md` for the full contract.
