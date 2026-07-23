import { Link } from "react-router";
import { Type, ImageUp, Eye, Palette, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: Type,
    title: "Soạn văn bản",
    desc: "Nhập tên, chức danh, nội dung sự kiện — xem trước trực tiếp trên sản phẩm.",
  },
  {
    icon: ImageUp,
    title: "Tải lên logo",
    desc: "Đưa logo doanh nghiệp hoặc hình ảnh đội nhóm lên sản phẩm.",
  },
  {
    icon: Eye,
    title: "Xem trước thật",
    desc: "Sản phẩm cập nhật theo từng thay đổi — không cần tưởng tượng.",
  },
  {
    icon: Palette,
    title: "Chọn màu sắc",
    desc: "Tùy chỉnh màu ruy băng, đế và các chi tiết trang trí.",
  },
];

const PRODUCT_IMAGE = "/images/home/customization-workspace.jpg";

export function CustomizationFeatureSection() {
  return (
    <section className="py-24 px-4 md:px-margin-desktop bg-surface-container-low">
      <div className="max-w-container-max mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 xl:gap-16 items-center">
          {/* Image */}
          <div className="reveal active">
            <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl bg-surface-base">
              <img
                className="w-full h-full object-cover"
                src={PRODUCT_IMAGE}
                alt="Sản phẩm có thể tùy chỉnh trực tuyến"
                loading="lazy"
              />
              <div className="absolute inset-0 rounded-xl ring-1 ring-black/[0.06] pointer-events-none" />
            </div>
          </div>

          {/* Copy */}
          <div className="reveal active">
            <p className="mb-4 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              Tùy chỉnh trực tuyến
            </p>
            <h2 className="font-heading text-[32px] md:text-[40px] uppercase leading-10 text-on-surface mb-4">
              Thiết kế theo cách của bạn
            </h2>
            <div className="mb-6 h-[3px] w-16 bg-brand-support" />
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 leading-relaxed">
              Chọn sản phẩm, cá nhân hóa tên và logo, xem trước thiết kế trực
              tiếp — tất cả trong vài phút.
            </p>

            {/* Feature cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl border border-border-subtle bg-surface-base p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-action-support/10">
                      <Icon className="w-[18px] h-[18px] text-action-support" />
                    </div>
                    <span className="font-semibold text-[15px] text-brand-strong">
                      {title}
                    </span>
                  </div>
                  <p className="font-body-md text-[14px] text-text-muted leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>

            <Link
              to="/categories/san-pham-tuy-chinh"
              className="inline-flex items-center gap-2 rounded-lg bg-action-support px-8 py-4 font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:bg-action-support-hover"
            >
              Bắt đầu thiết kế
              <ArrowRight className="w-[18px] h-[18px]" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
