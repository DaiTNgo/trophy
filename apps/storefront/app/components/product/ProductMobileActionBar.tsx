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
    <div className="fixed bottom-0 left-0 z-50 flex w-full items-center gap-4 border-t border-[#d8c1ad] bg-white/95 p-4 backdrop-blur-md lg:hidden">
      <div className="flex-shrink-0">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#7b6b5f]">Total</p>
        <p className="font-bold text-[#110023]">{price}</p>
      </div>
      {contactHref ? (
        <Link
          to={contactHref}
          className="flex-1 rounded-[14px] bg-[#110023] py-3 text-center font-label-md uppercase text-white"
        >
          Contact
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex-1 rounded-[14px] bg-[#110023] py-3 font-label-md uppercase text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {label}
        </button>
      )}
    </div>
  );
}
