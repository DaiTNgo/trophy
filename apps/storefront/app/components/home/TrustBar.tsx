import { Palette, PenSquare, Truck, ShieldCheck } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

const CLAIMS = [
  { icon: "Palette", label: "Miễn phí tư vấn thiết kế" },
  { icon: "PenSquare", label: "Khắc tên theo yêu cầu" },
  { icon: "Truck", label: "Giao hàng toàn quốc" },
  { icon: "ShieldCheck", label: "Cam kết hài lòng" },
];

export function TrustBar() {
  return (
    <div className="bg-brand-support text-white">
      {/* Desktop: four evenly-spaced claims */}
      <div className="hidden lg:flex items-center justify-center divide-x divide-white/10 max-w-container-max mx-auto">
        {CLAIMS.map(({ icon, label }) => (
          <div
            key={icon}
            className="flex items-center gap-2.5 px-8 py-2 flex-1 justify-center"
          >
            {icon === "Palette" && <Palette size={14} />}
            {icon === "PenSquare" && <PenSquare size={14} />}
            {icon === "Truck" && <Truck size={14} />}
            {icon === "ShieldCheck" && <ShieldCheck size={14} />}
            <span className="text-[11px] font-semibold tracking-wide uppercase text-white/90">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Tablet + Mobile: carousel */}
      <div className="lg:hidden relative">
        <Carousel
          opts={{ loop: true, align: "center" }}
          orientation="horizontal"

          className="w-full"
        >
          <CarouselContent className="ml-0">
            {CLAIMS.map(({ icon, label }) => (
              <CarouselItem
                key={icon}
              // className="basis-full pl-0 border-r border-white/10 last:border-r-0"
              >
                <div className="flex items-center justify-center gap-2 px-5 py-2.5">
                  {icon === "Palette" && <Palette size={13} />}
                  {icon === "PenSquare" && <PenSquare size={13} />}
                  {icon === "Truck" && <Truck size={13} />}
                  {icon === "ShieldCheck" && <ShieldCheck size={13} />}
                  <span className="text-[10px] font-semibold tracking-wide uppercase whitespace-nowrap">
                    {label}
                  </span>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious variant={"ghost"} size='icon' className="z-10 -left-0.5 top-1/2 -translate-y-1/2" />
          <CarouselNext variant={"ghost"} size='icon' className="z-10 -right-0.5 top-1/2 -translate-y-1/2" />
        </Carousel>
      </div>
    </div>
  );
}
