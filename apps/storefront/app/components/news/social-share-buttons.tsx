import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link2, Check } from "lucide-react";

export function SocialShareButtons() {
  const { t } = useTranslation("news");
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const zaloHref = `https://zalo.me/share?url=${encodeURIComponent(currentUrl)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — fall back to no-op
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">{t("share_label")}</span>
      <a
        href={zaloHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Zalo"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-xs font-bold text-brand-support transition-colors hover:bg-brand-support hover:text-white"
      >
        Z
      </a>
      <a
        href={facebookHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-xs font-bold text-brand-support transition-colors hover:bg-brand-support hover:text-white"
      >
        f
      </a>
      <button
        onClick={handleCopy}
        aria-label={t("copy_link")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-brand-support transition-colors hover:bg-brand-support hover:text-white"
      >
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}