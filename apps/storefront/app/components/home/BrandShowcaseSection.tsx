interface BrandShowcaseSectionProps {
  className?: string;
}

export function BrandShowcaseSection({ className }: BrandShowcaseSectionProps) {
  return (
    <section className={`w-full overflow-hidden ${className ?? ""}`}>
      <div className="reveal active relative w-full aspect-[2/1]">
        <img
          src="/images/home/IMG_20260906_170226_424.jpg"
          alt="Phùng Thị - Cúp Vinh Danh & Kỷ Niệm Chương Cao Cấp"
          className="h-full w-full object-cover object-center"
          loading="lazy"
        />
      </div>
    </section>
  );
}
