# Order history is independent of product lifecycle

Order Items are rendered solely from their immutable snapshots after checkout. Products may be soft-deleted into Product Trash, restored as drafts, or permanently deleted without being blocked by past Orders; the previous live customization-media fallback is removed because it violates the snapshot boundary.
