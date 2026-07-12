import { Link } from "react-router";
import { Building2, Trophy, GraduationCap, PartyPopper, Heart, UserCheck, ArrowRight } from "lucide-react";

const OCCASIONS = [
  {
    icon: "Building2",
    label: "Doanh nghiệp",
    desc: "Lễ kỷ niệm, gala nội bộ, khen thưởng nhân viên",
    href: "/products?category=cup-vinh-danh",
  },
  {
    icon: "Trophy",
    label: "Giải đấu thể thao",
    desc: "Cúp, huy chương và bảng xếp hạng cho mọi môn thể thao",
    href: "/products?category=cup-the-thao",
  },
  {
    icon: "GraduationCap",
    label: "Trường học",
    desc: "Giải thưởng học sinh, giáo viên xuất sắc và ngày lễ khai giảng",
    href: "/products",
  },
  {
    icon: "PartyPopper",
    label: "Sự kiện vinh danh",
    desc: "Gala, lễ trao giải, hội nghị tri ân và sự kiện thành tích",
    href: "/products?category=bang-vinh-danh",
  },
  {
    icon: "Heart",
    label: "Quà tri ân",
    desc: "Kỷ niệm chương, quà lưu niệm và cúp trao cho đối tác, khách hàng",
    href: "/products?category=ky-niem-chuong",
  },
  {
    icon: "UserCheck",
    label: "Thành tích cá nhân",
    desc: "Giải thưởng cá nhân theo mốc sự kiện đặc biệt",
    href: "/products",
  },
];

export function ShopByOccasionSection() {
  return (
    <section className="py-24 px-4 md:px-margin-desktop bg-surface">
      <div className="max-w-container-max mx-auto">
        {/* Heading */}
        <div className="mb-14 reveal active">
          <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
            Mua theo dịp
          </p>
          <h2 className="font-heading text-[36px] md:text-[44px] uppercase leading-none text-on-surface">
            Phù hợp mọi sự kiện
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {OCCASIONS.map(({ icon, label, desc, href }, i) => (
            <Link
              key={icon}
              to={href}
              className="reveal active group flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-6 transition-all duration-300 hover:border-brand-strong hover:shadow-md"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-strong/10 transition-colors duration-300 group-hover:bg-brand-strong">
                {icon === "Building2" && <Building2 className="text-[24px] text-brand-strong transition-colors duration-300 group-hover:text-white" />}
                {icon === "Trophy" && <Trophy className="text-[24px] text-brand-strong transition-colors duration-300 group-hover:text-white" />}
                {icon === "GraduationCap" && <GraduationCap className="text-[24px] text-brand-strong transition-colors duration-300 group-hover:text-white" />}
                {icon === "PartyPopper" && <PartyPopper className="text-[24px] text-brand-strong transition-colors duration-300 group-hover:text-white" />}
                {icon === "Heart" && <Heart className="text-[24px] text-brand-strong transition-colors duration-300 group-hover:text-white" />}
                {icon === "UserCheck" && <UserCheck className="text-[24px] text-brand-strong transition-colors duration-300 group-hover:text-white" />}
              </div>
              <div>
                <h3 className="font-label-md text-label-md uppercase tracking-wide text-on-surface mb-1.5">
                  {label}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant text-[14px] leading-snug">
                  {desc}
                </p>
              </div>
              <span className="mt-auto flex items-center gap-1 font-label-md text-label-md text-[12px] uppercase tracking-widest text-brand-support transition-all duration-300 group-hover:gap-2">
                Xem sản phẩm
                <ArrowRight className="text-[14px]" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
