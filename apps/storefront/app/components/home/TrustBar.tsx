import { Palette, PenSquare, Truck, ShieldCheck } from "lucide-react";

const CLAIMS = [
  { icon: "Palette", label: "Miễn phí tư vấn thiết kế" },
  { icon: "PenSquare", label: "Khắc tên theo yêu cầu" },
  { icon: "Truck", label: "Giao hàng toàn quốc" },
  { icon: "ShieldCheck", label: "Cam kết hài lòng" },
];

export function TrustBar() {
  return (
    <div className="bg-[#171740] text-white">
      {/* Desktop: four evenly-spaced claims */}
      <div className="hidden md:flex items-center justify-center divide-x divide-white/10 max-w-container-max mx-auto">
        {CLAIMS.map(({ icon, label }) => (
          <div
            key={icon}
            className="flex items-center gap-2.5 px-8 py-3 flex-1 justify-center"
          >
            {icon === "Palette" && <Palette className="text-[18px] text-accent" />}
            {icon === "PenSquare" && <PenSquare className="text-[18px] text-accent" />}
            {icon === "Truck" && <Truck className="text-[18px] text-accent" />}
            {icon === "ShieldCheck" && <ShieldCheck className="text-[18px] text-accent" />}
            <span className="text-[13px] font-semibold tracking-wide uppercase text-white/90">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Mobile: scrollable compact row */}
      <div className="md:hidden flex items-center overflow-x-auto gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {CLAIMS.map(({ icon, label }) => (
          <div
            key={icon}
            className="flex items-center gap-2 px-5 py-2.5 flex-shrink-0 border-r border-white/10 last:border-r-0"
          >
            {icon === "Palette" && <Palette className="text-[16px] text-accent" />}
            {icon === "PenSquare" && <PenSquare className="text-[16px] text-accent" />}
            {icon === "Truck" && <Truck className="text-[16px] text-accent" />}
            {icon === "ShieldCheck" && <ShieldCheck className="text-[16px] text-accent" />}
            <span className="text-[12px] font-semibold tracking-wide uppercase text-white/90 whitespace-nowrap">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
