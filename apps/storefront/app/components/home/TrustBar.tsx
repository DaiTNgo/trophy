import { useTranslation } from "react-i18next";
import { Palette, PenSquare, Truck, ShieldCheck } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

const TRUST_ICONS = [Palette, PenSquare, Truck, ShieldCheck];

export function TrustBar() {
  const { t } = useTranslation("home");
  const claims = t("trust_claims", { returnObjects: true }) as string[];

  return (
    <div className="bg-brand-support text-white">
      <div className="hidden lg:flex items-center justify-center divide-x divide-white/10 max-w-container-max mx-auto">
        {claims.map((label, i) => {
          const Icon = TRUST_ICONS[i];
          return (
            <div
              key={label}
              className="flex items-center gap-2.5 px-8 py-2 flex-1 justify-center"
            >
              <Icon size={14} />
              <span className="text-[11px] font-semibold tracking-wide uppercase text-white/90">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="lg:hidden relative">
        <Carousel
          opts={{ loop: true, align: "center" }}
          orientation="horizontal"
          className="w-full"
        >
          <CarouselContent className="ml-0">
            {claims.map((label, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <CarouselItem key={label}>
                  <div className="flex items-center justify-center gap-2 px-5 py-2.5">
                    <Icon size={13} />
                    <span className="text-[10px] font-semibold tracking-wide uppercase whitespace-nowrap">
                      {label}
                    </span>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious variant={"ghost"} size='icon' className="z-10 left-0.5 top-1/2 -translate-y-1/2" />
          <CarouselNext variant={"ghost"} size='icon' className="z-10 right-0.5 top-1/2 -translate-y-1/2" />
        </Carousel>
      </div>
    </div>
  );
}
