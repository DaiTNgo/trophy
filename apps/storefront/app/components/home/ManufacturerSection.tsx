import { Link } from "react-router";
import { Building2, User, PenSquare, Eye, ArrowRight } from "lucide-react";

const BULLETS = [
  { icon: "Building2", text: "Logo doanh nghiệp hoặc đội nhóm" },
  { icon: "User", text: "Tên người nhận và chức danh" },
  { icon: "PenSquare", text: "Nội dung khắc theo sự kiện" },
  { icon: "Eye", text: "Tư vấn bố cục trước khi sản xuất" },
];

// Reusing the craftsman engraving image — closest available to a customization visual
const FEATURE_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCOPnmbn8rJ57g44TBeZ8QErz9gGRkf1aw9MwTgrEJLz5TIXqh2vYu3Mb0qqiBRz6wXfrrXKNz6HcuhdYzl-vKasRjFsEp6uPXTboH6ivPhVLSfv7y-OVjh1XEIwXEW1JRuIGJBHU78_B6tKJNvrZbhTlLLPs49ov-dDnZxmXX0WlqGdf9yY2Md9ALjUCGsq5yZxau4vCg0DK9CK1EYG-AS-wT1ooaEXbzkqZdBqJ8ynUzO0bydJ4c8bdccmrB_80JMJ4iv3iea_FI";

export function CustomizationFeatureSection() {
  return (
    <section className="py-24 px-4 md:px-margin-desktop bg-surface-container-low">
      <div className="max-w-container-max mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 2xl:gap-8 items-center">
          {/* Image — left on desktop, first on mobile */}
          <div className="reveal active">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <img
                className="w-full h-full object-cover"
                src={FEATURE_IMAGE}
                alt="Thợ khắc đang khắc chữ lên kỷ niệm chương"
                loading="lazy"
              />
              {/* Subtle overlay badge */}
              <div className="absolute bottom-6 left-6 rounded-lg bg-brand-hero px-5 py-3 text-white">
                <span className="block font-heading text-[28px] uppercase leading-none">25+</span>
                <span className="block font-label-md text-label-md uppercase tracking-wider text-white/90 mt-1">
                  Năm kinh nghiệm
                </span>
              </div>
            </div>
          </div>

          {/* Copy — right on desktop */}
          <div className="reveal active">
            <p className="mb-4 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              Tùy chỉnh
            </p>
            <h2 className="font-heading text-[32px] md:text-[40px] uppercase leading-10 text-on-surface mb-4">
              Thiết kế riêng cho từng khoảnh khắc
            </h2>
            <div className="mb-6 h-[3px] w-16 bg-brand-support" />
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 leading-relaxed">
              Thêm logo, tên người nhận, hạng mục giải thưởng và thông điệp
              riêng. Mỗi sản phẩm có thể được duyệt thiết kế trước khi sản
              xuất.
            </p>

            <ul className="space-y-4 mb-10">
              {BULLETS.map(({ icon, text }) => (
                <li key={icon} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-strong/10">
                    {icon === "Building2" && <Building2 className="text-[18px] text-brand-strong" />}
                    {icon === "User" && <User className="text-[18px] text-brand-strong" />}
                    {icon === "PenSquare" && <PenSquare className="text-[18px] text-brand-strong" />}
                    {icon === "Eye" && <Eye className="text-[18px] text-brand-strong" />}
                  </div>
                  <span className="font-body-md text-body-md text-on-surface">
                    {text}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-action-support px-8 py-4 font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:bg-action-support-hover"
            >
              Bắt đầu tùy chỉnh
              <ArrowRight className="text-[18px]" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
