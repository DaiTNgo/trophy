# MISA Deletion Uses a D1 Outbox

Removing a Product Variant or permanently deleting a Product commits its local
catalog deletion and request-owned MISA deletion jobs in one D1 batch. A
scheduled Worker performs the remote MISA deletion afterward, with durable
retry state, expiring leases, and failure observability. Remote `404` is a
successful idempotent deletion; other errors retry with capped exponential
backoff. The API reports the local catalog action as successful once that batch
commits.

This avoids the irreversible remote deletion occurring before a later D1
failure, which otherwise leaves a local Variant marked as synchronized to a
MISA Product Record that no longer exists.

**Considered Options**

- Delete MISA synchronously before D1: rejected because a local batch failure
  makes the systems diverge and a retry is not reliably recoverable.
- Block catalog deletion until MISA is available: rejected because MISA
  availability must not prevent correct local catalog lifecycle outcomes.
- Cloudflare Queue: rejected for the same low-volume administrative-workflow
  reasons as the R2 cleanup outbox. D1 remains the durable source of truth.
