import { Wrench, Eye, Gem, Truck } from "lucide-react";

const BLUE = { bg: "#e0f2fe", color: "#288ab6" };

const ICON_STYLES = [BLUE, BLUE, BLUE, BLUE];

const STEPS = [
  {
    icon: Wrench,
    stat: "5000+",
    label: "Đơn hàng",
    body: "Mỗi đơn hàng được làm riêng — từ cúp pha lê, kỷ niệm chương đến bảng vinh danh, không dùng hàng sẵn kho.",
  },
  {
    icon: Eye,
    stat: "100%",
    label: "Có bản duyệt",
    body: "Bạn xem và duyệt file thiết kế trước khi chúng tôi sản xuất. Chỉ khi bạn OK, đơn hàng mới lên máy.",
  },
  {
    icon: Gem,
    stat: "20+",
    label: "Chất liệu",
    body: "Pha lê K9, kim loại mạ vàng, gỗ óc chó, hợp kim cao cấp — đa dạng chất liệu phù hợp mọi ngân sách.",
  },
  {
    icon: Truck,
    stat: "63",
    label: "Tỉnh thành",
    body: "Đóng gói kỹ lưỡng, giao hàng đúng hẹn đến mọi tỉnh thành trên toàn quốc.",
  },
];

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
  return (
    <section className="bg-surface px-4 py-20 md:px-margin-desktop">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col">
          {STEPS.flatMap((step, i) => {
            const Icon = step.icon;
            const style = ICON_STYLES[i];
            const isLeft = i % 2 === 0;
            const { stat, label, body } = step;

            const item = (
              <div key={`item-${i}`} className="mb-10 lg:mb-0">
                {/* Mobile */}
                <div className="flex items-start gap-6 lg:hidden">
                  <Dot icon={Icon} style={style} />
                  <Content stat={stat} label={label} body={body} />
                </div>

                {/* Desktop staggered */}
                <div className="hidden lg:flex items-start relative">
                  {/* Line segment through center column */}
                  <div
                    className="absolute left-1/2 w-px bg-border-subtle -translate-x-1/2 z-0"
                    style={
                      i === 0
                        ? { top: "24px", bottom: "0" }
                        : i === STEPS.length - 1
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

            const connector = i < STEPS.length - 1 && (
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
