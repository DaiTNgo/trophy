# Admin Orders Refresh Design

## Context

The Admin Order List loads its data only when the route mounts. An operator who
returns to the browser tab can therefore see an outdated list.

## Decision

Reuse one order-loading operation for the initial route load, a manual Refresh
icon action, and browser `visibilitychange` events that make the document
visible. The operation keeps the current table, filters, sort order, and page
selection while a later refresh is in flight. Concurrent loads are ignored.

## Error Handling And Verification

The initial load continues to show its existing loading and error states. A
later failed refresh preserves the existing orders and displays the error state.
The refresh action is disabled while a request is in progress and exposes its
name through an accessible label and native browser tooltip. Verify with the
Admin production build and a diff check.
