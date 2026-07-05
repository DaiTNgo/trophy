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
    <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md p-4 border-t border-outline-variant flex items-center gap-4 lg:hidden z-50">
      <div className="flex-shrink-0">
        <p className="text-[12px] text-on-surface-variant uppercase">Total</p>
        <p className="font-bold text-primary">{price}</p>
      </div>
      {contactHref ? (
        <Link
          to={contactHref}
          className="flex-1 rounded bg-surface-variant py-3 text-center font-label-md uppercase text-on-surface-variant"
        >
          Contact
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex-1 bg-primary text-white py-3 font-label-md uppercase rounded disabled:cursor-not-allowed disabled:opacity-60"
        >
          {label}
        </button>
      )}
    </div>
  );
}
