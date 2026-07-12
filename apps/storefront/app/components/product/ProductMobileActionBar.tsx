import { Link } from "react-router";

export function ProductMobileActionBar({
  price,
  label,
  disabled,
  onClick,
  contactHref,
}: {
  price: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  contactHref?: string;
}) {
  return (
    <div className="fixed bottom-0 left-0 z-50 flex w-full items-center gap-4 border-t border-border-subtle bg-white/96 p-4 shadow-[0_-18px_48px_rgba(24,22,26,0.08)] backdrop-blur-md lg:hidden">
      <div className="flex-shrink-0">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-muted">Total</p>
        <p className="font-heading text-[24px] uppercase leading-none tracking-[0.02em] text-action-positive">{price}</p>
      </div>
      {contactHref ? (
        <Link
          to={contactHref}
          className="flex-1 rounded-[14px] bg-brand-hero py-3 text-center font-label-md uppercase text-white"
        >
          Contact
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex-1 rounded-[14px] bg-action-commerce py-3 font-label-md uppercase text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {label}
        </button>
      )}
    </div>
  );
}
