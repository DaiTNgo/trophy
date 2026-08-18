# R2 Cleanup Uses a D1 Outbox

Catalog lifecycle commands commit their D1 state and a request-owned R2 cleanup job in the same D1 batch. A scheduled backend Worker leases queued R2 object keys before deleting them, then records completion or a capped exponential-backoff retry. Lease expiry makes interrupted processing recoverable and prevents overlapping cron invocations from racing the same job. Failed jobs remain durable and observable rather than being discarded. This deliberately favors a correct catalog outcome over synchronous blob cleanup, because D1 and R2 cannot participate in one transaction and these admin-only deletions do not require near-real-time object removal.

Permanent Product Deletion snapshots every Product-owned, Variant Gallery, and
Customization Background asset before removing their associations. Its D1
batch deletes the asset rows and enqueues their object keys; no product-owned
R2 object is intentionally retained after permanent deletion.

**Considered Options**

- Cloudflare Queue plus an outbox: rejected for now because the administrative deletion volume and latency requirements do not justify an additional binding and consumer. A durable D1 outbox remains necessary even with a queue to reconcile enqueue failures.
- Return an error and compensate D1 when R2 deletion fails: rejected because an API failure after the catalog data is deleted misrepresents the completed business action and can restore inconsistent references.
