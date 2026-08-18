export type OrderMediaTransferStatus = "pending" | "complete" | "failed";

export function canTransitionOrderMediaTransfer(
  from: OrderMediaTransferStatus,
  to: OrderMediaTransferStatus,
) {
  if (from === "pending") return to === "complete" || to === "failed";
  if (from === "failed") return to === "pending" || to === "complete";
  return false;
}

export function protectsShopperDraftSource(status: OrderMediaTransferStatus) {
  return status === "pending" || status === "failed";
}

export function shopperDraftExpiry(createdAt: Date) {
  return new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
}
