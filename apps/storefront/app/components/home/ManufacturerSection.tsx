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
          <div className="reveal active h-full">
            <div className="relative rounded-xl overflow-hidden aspect-[4/3] h-full">
              <img
                className="w-full h-full object-cover"
                src={FEATURE_IMAGE}
                alt="Thợ khắc đang khắc chữ lên kỷ niệm chương"
                loading="lazy"
              />
              {/* Subtle overlay badge */}
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 bg-primary text-primary-foreground px-4 py-2 sm:px-5 sm:py-3 rounded-lg">
                <span className="block font-heading text-[20px] sm:text-[28px] uppercase leading-none">25+</span>
                <span className="block font-label-md sm:text-label-md text-[12px] font-medium uppercase tracking-wider text-white/90 mt-1">
                  Năm kinh nghiệm
                </span>
              </div>
            </div>
          </div>

          {/* Copy — right on desktop */}
          <div className="reveal active">
            <p className="font-label-md text-label-md uppercase tracking-[0.35em] text-primary mb-4">
              Tùy chỉnh
            </p>
            <h2 className="font-heading text-[32px] md:text-[40px] uppercase leading-10 text-on-surface mb-4">
              Thiết kế riêng cho từng khoảnh khắc
            </h2>
            <div className="w-16 h-[3px] bg-accent mb-6" />
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 leading-relaxed">
              Thêm logo, tên người nhận, hạng mục giải thưởng và thông điệp
              riêng. Mỗi sản phẩm có thể được duyệt thiết kế trước khi sản
              xuất.
            </p>

            <ul className="space-y-4 mb-10">
              {BULLETS.map(({ icon, text }) => (
                <li key={icon} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    {icon === "Building2" && <Building2 className="text-[18px] text-primary" />}
                    {icon === "User" && <User className="text-[18px] text-primary" />}
                    {icon === "PenSquare" && <PenSquare className="text-[18px] text-primary" />}
                    {icon === "Eye" && <Eye className="text-[18px] text-primary" />}
                  </div>
                  <span className="font-body-md text-body-md text-on-surface">
                    {text}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-label-md text-label-md uppercase px-8 py-4 rounded-lg tracking-widest hover:bg-accent hover:text-accent-foreground transition-all duration-300"
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
