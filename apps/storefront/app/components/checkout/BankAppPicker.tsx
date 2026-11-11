import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  createStorefrontPaymentDeeplink,
  fetchStorefrontBankApps,
  type StorefrontBankApp,
} from "../../lib/api";

/**
 * Mobile-only shortcut: opens the shopper's banking app prefilled with the transfer
 * through a JETPAY deeplink. Falls back to the QR when a bank has no real deeplink.
 */
export function BankAppPicker({
  orderNumber,
  accessToken,
}: {
  orderNumber: string;
  accessToken: string;
}) {
  const [apps, setApps] = useState<StorefrontBankApp[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchStorefrontBankApps()
      .then((items) => {
        if (!cancelled) setApps(items.filter((app) => app.isDeepLinkSupport));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function open(app: StorefrontBankApp) {
    setOpening(app.bankAppCode);
    setMessage("");
    try {
      const result = await createStorefrontPaymentDeeplink({
        orderNumber,
        accessToken,
        bankAppCode: app.bankAppCode,
        redirectUrl: window.location.href,
      });
      if (result.deepLinkUrl) {
        window.location.href = result.deepLinkUrl;
      } else {
        setMessage(`${app.appName} chưa hỗ trợ mở trực tiếp. Vui lòng quét mã QR hoặc chuyển khoản thủ công.`);
      }
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Không thể mở ứng dụng ngân hàng.");
    } finally {
      setOpening(null);
    }
  }

  if (apps.length === 0) return null;

  return (
    <div className="mt-6 sm:hidden">
      <p className="text-sm font-semibold text-on-surface">Mở ứng dụng ngân hàng để thanh toán</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {apps.map((app) => (
          <button
            key={app.bankAppCode}
            type="button"
            onClick={() => void open(app)}
            disabled={opening !== null}
            className="flex min-h-[72px] flex-col items-center justify-center gap-1 border border-[#DEDEDE] bg-white px-2 py-2 text-[12px] text-on-surface disabled:opacity-60"
          >
            {opening === app.bankAppCode ? (
              <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            ) : app.logoSmall ? (
              <img src={app.logoSmall} alt="" className="h-6 w-auto" aria-hidden="true" />
            ) : null}
            <span className="line-clamp-1">{app.appName || app.bankShortName}</span>
          </button>
        ))}
      </div>
      {message ? (
        <p className="mt-3 text-sm text-on-surface-variant" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
