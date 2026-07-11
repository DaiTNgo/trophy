import { Link } from "react-router";
import { Trophy, PenSquare } from "lucide-react";

// Cinematic, brand-level hero — no product prop.
// The award is the main character on the right; headline + CTAs live in the dark left zone.
const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB90_lWYrj8CHeTfe5v4IeTsK_jccQ7hfjKlUGyDzAE_2VQyHihcE0RYeeSzTHrJ7NaTWjH5OrEOsqCdW81uy7isGpX0K9vkN3r2KvwIbAouk5-6HuStftZiDZI0G6HaqG8xo5u911qOcj3AcceeX7ZA-VJUiZym64lQql7RwZ-cOqyN4T7ZVzTnUeFVqc_8DUI58IrGI7JxBWtyoidZXuDgp1_mPySh3xlToWIheWaPGeZyxz-EltiKtZPjoTqJemO2xHf8Hlzam4";

export function HeroSection() {
  return (
    <section
      className="relative flex min-h-[90vh] w-full items-center overflow-hidden bg-surface-dark"
      aria-label="Giới thiệu Trophy"
    >
      {/* Background image — award as main character */}
      <div className="absolute inset-0 z-0">
        <img
          className="w-full h-full object-cover object-center"
          src={HERO_IMAGE}
          alt="Cúp vinh danh cao cấp — Trophy"
          fetchPriority="high"
        />
      </div>

      {/* Gradient: dark left zone for text, fade to transparent on right */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-[color:color-mix(in_srgb,var(--brand-hero)_94%,transparent)] via-[color:color-mix(in_srgb,var(--brand-hero)_60%,transparent)] to-transparent" />
      {/* Subtle bottom vignette for readability */}
      <div className="absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-[color:color-mix(in_srgb,var(--brand-hero)_70%,transparent)] to-transparent" />

      {/* Content */}
      <div className="relative z-20 px-4 md:px-margin-desktop max-w-container-max mx-auto w-full py-24">
        <div className="max-w-xl reveal active">
          {/* Eyebrow + accent rule */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-[3px] w-16 bg-brand-accent" />
            <span className="font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              Phùng Thị
            </span>
          </div>

          {/* H1 — Koulen display stack */}
          <h1 className="font-heading uppercase text-white mb-6 leading-none tracking-wide">
            <span className="block text-[56px] md:text-[72px] leading-[1]">VINH DANH</span>
            <span className="block text-[56px] md:text-[72px] leading-[1]">XỨNG TẦM</span>
            <span className="block text-[56px] leading-[1] text-brand-accent md:text-[72px]">THÀNH TỰU</span>
          </h1>

          {/* Body */}
          <p className="font-body-lg text-body-lg text-white/80 mb-8 leading-relaxed max-w-md">
            Cúp, kỷ niệm chương và giải thưởng tùy chỉnh cho doanh nghiệp,
            giải đấu và sự kiện.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10">
            <Link
              to="/products"
              className="rounded-lg bg-action-support px-8 py-4 text-center font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:bg-action-support-hover"
            >
              Khám phá sản phẩm
            </Link>
            <Link
              to="/contact"
              className="rounded-lg border-2 border-white/60 px-8 py-4 text-center font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:border-brand-accent hover:bg-white/10"
            >
              Tùy chỉnh theo yêu cầu
            </Link>
          </div>

          {/* Compact proof line */}
          <div className="flex items-center gap-6 text-white/50 text-[13px] font-semibold uppercase tracking-wide">
            <span className="flex items-center gap-1.5">
              <Trophy className="text-[16px] text-brand-accent" />
              600k+ sản phẩm vinh danh
            </span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span className="flex items-center gap-1.5">
              <PenSquare className="text-[16px] text-brand-support" />
              Khắc theo yêu cầu
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
