import { ShieldCheck, Eye, Clock } from "lucide-react";

// No real reviews exist yet. Per spec, fake testimonials are not allowed.
// These are production guarantees presented in the same card format.
// Swap GUARANTEES for real reviews when review data becomes available.
const GUARANTEES = [
  {
    icon: "ShieldCheck",
    quote:
      "Mỗi đơn hàng đều được kiểm tra chất lượng trước khi xuất xưởng. Nếu sản phẩm không đúng với bản thiết kế đã duyệt, chúng tôi sẽ làm lại miễn phí.",
    author: "Phùng Thị",
    role: "Cam kết chất lượng",
  },
  {
    icon: "Eye",
    quote:
      "Bạn nhận được file thiết kế để duyệt trước khi sản xuất. Không có bất ngờ — những gì bạn duyệt là những gì bạn nhận được.",
    author: "Phùng Thị",
    role: "Quy trình duyệt thiết kế",
  },
  {
    icon: "Clock",
    quote:
      "Chúng tôi tư vấn thời gian sản xuất thực tế từ đầu. Với đơn hàng số lượng lớn, chúng tôi cam kết tiến độ và thông báo sớm nếu có thay đổi.",
    author: "Phùng Thị",
    role: "Cam kết tiến độ",
  },
];

export function ReviewsSection() {
  return (
    <section className="py-24 px-4 md:px-margin-desktop bg-surface-container-low">
      <div className="max-w-container-max mx-auto">
        {/* Heading */}
        <div className="text-center mb-14 reveal active">
          <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
            Cam kết của chúng tôi
          </p>
          <h2 className="font-heading text-[36px] md:text-[44px] uppercase leading-none text-on-surface">
            Khách hàng chọn Trophy cho những cột mốc quan trọng
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {GUARANTEES.map(({ icon, quote, author, role }, i) => (
            <div
              key={role}
              className="bg-white rounded-xl p-8 border border-outline-variant luxury-shadow reveal active flex flex-col justify-between"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-strong/10">
                {icon === "ShieldCheck" && <ShieldCheck className="text-[22px] text-brand-accent" />}
                {icon === "Eye" && <Eye className="text-[22px] text-brand-strong" />}
                {icon === "Clock" && <Clock className="text-[22px] text-brand-support" />}
              </div>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed italic">
                "{quote}"
              </p>
              <div className="border-t border-outline-variant pt-4">
                <p className="font-label-md text-label-md uppercase tracking-wide text-on-surface">
                  {author}
                </p>
                <p className="font-body-md text-body-md text-brand-accent text-[13px]">
                  {role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
