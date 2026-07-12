import { Wrench, Eye, Gem, Truck } from "lucide-react";

const CLAIMS = [
  {
    icon: "Wrench",
    title: "Sản xuất theo yêu cầu",
    body: "Mỗi đơn hàng được làm riêng — không dùng hàng sẵn kho.",
  },
  {
    icon: "Eye",
    title: "Duyệt thiết kế trước khi làm",
    body: "Bạn xem và duyệt file thiết kế trước khi chúng tôi sản xuất.",
  },
  {
    icon: "Gem",
    title: "Chất liệu pha lê, kim loại, gỗ",
    body: "Nguồn nguyên liệu chất lượng cao, lựa chọn theo ngân sách.",
  },
  {
    icon: "Truck",
    title: "Giao hàng toàn quốc",
    body: "Đóng gói kỹ lưỡng, giao hàng đúng hẹn đến mọi tỉnh thành.",
  },
];

export function ProofRow() {
  return (
    <section className="border-b border-outline-variant bg-surface-container-low px-4 py-16 md:px-margin-desktop">
      <div className="max-w-container-max mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CLAIMS.map(({ icon, title, body }) => (
            <div
              key={icon}
              className="flex gap-4 items-start reveal active"
            >
              <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-strong/10">
                {icon === "Wrench" && <Wrench className="text-[20px] text-brand-strong" />}
                {icon === "Eye" && <Eye className="text-[20px] text-brand-strong" />}
                {icon === "Gem" && <Gem className="text-[20px] text-brand-accent" />}
                {icon === "Truck" && <Truck className="text-[20px] text-brand-support" />}
              </div>
              <div>
                <p className="font-label-md text-label-md uppercase tracking-wide text-on-surface mb-1">
                  {title}
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant leading-snug">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
