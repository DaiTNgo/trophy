# Customization Activation Is Atomic

## Context

An existing published product can become customizable only when every current
variant has a same-sized Customization Background and the customization template
is valid. Treating an operator's initial Enable action as active customization
caused publish-readiness validation to reject the action before there was a
usable setup path.

## Decision

Enabling customization for a product without saved customization opens an
unsaved FocusModal Setup Session. It stages the template and all required
background files locally. Activate submits one multipart command; the backend
validates every staged input before it writes the customization record or any
new background asset. Closing or failing the session persists nothing.

An active customization can be deactivated without deleting its saved template
or backgrounds. While deactivated, Variant Media Management hides and does not
edit Customization Backgrounds. Reactivation activates immediately when every
variant remains valid; otherwise it opens a repair FocusModal that stages only
the missing backgrounds and activates atomically.

Creating a variant while customization is active uses Atomic Variant Creation:
Information and Media tabs submit one multipart command, and a valid
same-sized Customization Background is required. The active shopper flow is
therefore never temporarily invalid. When customization is deactivated, a new
variant may omit a background; later reactivation repairs it.

Permanent Customization Deletion is available only after deactivation and
requires confirmation. It removes the customization record, template data and
translations, all variant Customization Background associations and assets,
Product Media references to those assets, and a matching Product Thumbnail.

## Consequences

- Published products remain purchasable as ordinary products while initial
  customization setup is incomplete.
- There is no persisted incomplete initial customization state.
- Background asset lifecycle differs by operation: deactivation retains assets;
  permanent deletion removes them.
- Admin routes need dedicated multipart commands for initial activation and
  reactivation repair, rather than reusing the immediate persisted-variant
  media commands.
