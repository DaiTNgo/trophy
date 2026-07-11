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
    <section className="py-16 px-4 md:px-margin-desktop bg-surface-container-low border-b border-outline-variant">
      <div className="max-w-container-max mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CLAIMS.map(({ icon, title, body }) => (
            <div
              key={icon}
              className="flex gap-4 items-start reveal active"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                {icon === "Wrench" && <Wrench className="text-[20px] text-primary" />}
                {icon === "Eye" && <Eye className="text-[20px] text-primary" />}
                {icon === "Gem" && <Gem className="text-[20px] text-primary" />}
                {icon === "Truck" && <Truck className="text-[20px] text-primary" />}
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
