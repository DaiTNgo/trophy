import { useCallback, useEffect, useRef, useState } from "react";
import { fetchStorefrontPaymentStatus, type StorefrontPaymentStatusResponse } from "../lib/api";

const POLL_INTERVAL_MS = 5_000;
const POLL_WINDOW_MS = 15 * 60 * 1000;

/**
 * Polls the shopper payment status while the tab is visible, until the order is paid
 * or the 15-minute window elapses. `checkNow` restarts the window.
 */
export function usePaymentStatus({
  orderNumber,
  accessToken,
  initialStatus,
  enabled,
}: {
  orderNumber: string;
  accessToken: string;
  initialStatus: StorefrontPaymentStatusResponse;
  enabled: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [expired, setExpired] = useState(false);
  const [checking, setChecking] = useState(false);
  const startedAtRef = useRef(Date.now());
  const isPaid = status.paymentStatus === "paid";

  const poll = useCallback(async () => {
    setChecking(true);
    try {
      setStatus(await fetchStorefrontPaymentStatus({ orderNumber, accessToken }));
    } catch {
      // Transient errors are retried on the next tick.
    } finally {
      setChecking(false);
    }
  }, [accessToken, orderNumber]);

  useEffect(() => {
    if (!enabled || isPaid || expired) return;
    const timer = window.setInterval(() => {
      if (Date.now() - startedAtRef.current > POLL_WINDOW_MS) {
        setExpired(true);
        return;
      }
      if (document.visibilityState === "visible") void poll();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, expired, isPaid, poll]);

  const checkNow = useCallback(async () => {
    startedAtRef.current = Date.now();
    setExpired(false);
    await poll();
  }, [poll]);

  return { status, isPaid, expired, checking, checkNow };
}
