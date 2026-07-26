import { useTranslation } from "react-i18next";
import { Wrench, Eye, Gem, Truck } from "lucide-react";

const BLUE = { bg: "#e0f2fe", color: "#288ab6" };

const ICON_STYLES = [BLUE, BLUE, BLUE, BLUE];

const ICONS = [Wrench, Eye, Gem, Truck];

function Dot({ icon: Icon, style }: { icon: React.ElementType; style: { bg: string; color: string } }) {
  return (
    <div
      className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white"
      style={{ backgroundColor: style.bg }}
    >
      <Icon className="text-[20px]" style={{ color: style.color }} />
    </div>
  );
}

function Content({ stat, label, body }: { stat: string; label: string; body: string }) {
  return (
    <div className="pt-1.5">
      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
        <span className="text-[36px] font-bold leading-none tracking-tight text-brand-support">
          {stat}
        </span>
        <span className="text-[15px] font-semibold uppercase tracking-wide text-on-surface">
          {label}
        </span>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
        {body}
      </p>
    </div>
  );
}

export function ProofRow() {
  const { t } = useTranslation("home");
  const items = t("proof_items", { returnObjects: true }) as {
    stat: string; label: string; body: string;
  }[];

  return (
    <section className="bg-surface px-4 py-20 md:px-margin-desktop">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col">
          {items.flatMap((step, i) => {
            const Icon = ICONS[i];
            const style = ICON_STYLES[i];
            const isLeft = i % 2 === 0;
            const { stat, label, body } = step;

            const item = (
              <div key={`item-${i}`} className="mb-10 lg:mb-0">
                <div className="flex items-start gap-6 lg:hidden">
                  <Dot icon={Icon} style={style} />
                  <Content stat={stat} label={label} body={body} />
                </div>

                <div className="hidden lg:flex items-start relative">
                  <div
                    className="absolute left-1/2 w-px bg-border-subtle -translate-x-1/2 z-0"
                    style={
                      i === 0
                        ? { top: "24px", bottom: "0" }
                        : i === items.length - 1
                          ? { top: "0", height: "24px" }
                          : { top: "0", bottom: "0" }
                    }
                  />
                  {isLeft ? (
                    <>
                      <div className="w-[calc(50%-24px)] text-right pr-4">
                        <Content stat={stat} label={label} body={body} />
                      </div>
                      <div className="w-12 shrink-0 flex justify-center">
                        <Dot icon={Icon} style={style} />
                      </div>
                      <div className="w-[calc(50%-24px)]" />
                    </>
                  ) : (
                    <>
                      <div className="w-[calc(50%-24px)]" />
                      <div className="w-12 shrink-0 flex justify-center">
                        <Dot icon={Icon} style={style} />
                      </div>
                      <div className="w-[calc(50%-24px)] text-left pl-4">
                        <Content stat={stat} label={label} body={body} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );

            const connector = i < items.length - 1 && (
              <div key={`conn-${i}`} className="hidden lg:flex justify-center h-16">
                <div className="w-px bg-border-subtle h-full" />
              </div>
            );

            return connector ? [item, connector] : [item];
          })}
        </div>
      </div>
    </section>
  );
}
