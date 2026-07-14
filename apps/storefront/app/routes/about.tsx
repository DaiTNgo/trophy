import { Link } from "react-router";
import type { Route } from "./+types/about";
import { useScrollReveal } from "../hooks/useScrollReveal";
import {
  Trophy,
  Gem,
  Eye,
  Factory,
  ShieldCheck,
  Clock,
  ArrowRight,
  Building2,
  Pickaxe,
  Award,
  Phone,
  MessageCircle,
  Mail,
  PenLine,
  FileCheck,
  Hammer,
  PackageCheck,
} from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Về Chúng Tôi | Phùng Thị" },
    {
      name: "description",
      content:
        "Hơn 600,000 giải thưởng đã trao tay. Xưởng sản xuất cúp pha lê, kỷ niệm chương và quà tặng vinh danh hàng đầu Việt Nam với 15+ năm kinh nghiệm.",
    },
  ];
}

const PRODUCTS = [
  {
    image: "/images/about/product-1.jpg",
    name: "Cúp Pha Lê",
    material: "Pha Lê K9",
    category: "Cúp Vinh Danh",
  },
  {
    image: "/images/about/product-2.jpg",
    name: "Cúp Hợp Kim Đế Gỗ",
    material: "Hợp Kim + Gỗ",
    category: "Cúp Vinh Danh",
  },
  {
    image: "/images/about/product-3.jpg",
    name: "Kỷ Niệm Chương Pha Lê",
    material: "Pha Lê K9",
    category: "Kỷ Niệm Chương",
  },
  {
    image: "/images/about/product-4.jpg",
    name: "Đồng Hồ Pha Lê",
    material: "Pha Lê K9",
    category: "Quà Tặng Sự Kiện",
  },
  {
    image: "/images/about/product-5.jpg",
    name: "Cúp Golf Cao Cấp",
    material: "Hợp Kim",
    category: "Cúp Thể Thao",
  },
  {
    image: "/images/about/product-6.jpg",
    name: "Bảng Vinh Danh",
    material: "Gỗ + Pha Lê",
    category: "Bảng Vinh Danh",
  },
];

const STEPS = [
  {
    icon: PenLine,
    title: "Thiết kế",
    body: "Bạn gửi yêu cầu — chúng tôi phác thảo bản vẽ 2D theo ý tưởng.",
  },
  {
    icon: FileCheck,
    title: "Duyệt mẫu",
    body: "Bạn xem và duyệt thiết kế trước khi chúng tôi bước vào sản xuất.",
  },
  {
    icon: Hammer,
    title: "Chế tác",
    body: "Chế tác từ pha lê K9, hợp kim hoặc kim loại với công nghệ khắc laser.",
  },
  {
    icon: PackageCheck,
    title: "Bàn giao",
    body: "Kiểm tra chất lượng, đóng gói sang trọng và giao hàng toàn quốc.",
  },
];

const MATERIALS = [
  {
    icon: Gem,
    name: "Pha Lê K9",
    desc: "Trong suốt, lấp lánh, khúc xạ ánh sáng tuyệt đẹp. Dòng sản phẩm chủ lực.",
    use: "Cúp vinh danh, kỷ niệm chương, đồng hồ",
  },
  {
    icon: Pickaxe,
    name: "Hợp Kim",
    desc: "Bền, chống oxy hóa, dễ mạ màu. Kết hợp hoàn hảo với pha lê và gỗ.",
    use: "Cúp thể thao, cúp mix pha lê",
  },
  {
    icon: Award,
    name: "Kim Loại Mạ",
    desc: "Mạ vàng, bạc, đồng sang trọng. Giữ độ sáng bóng theo thời gian.",
    use: "Cúp kim loại, huy chương",
  },
  {
    icon: Building2,
    name: "Gỗ Tự Nhiên",
    desc: "Đế gỗ tự nhiên xử lý chống cong vênh. Tạo sự bề thế cho sản phẩm.",
    use: "Bảng vinh danh, đế cúp",
  },
];

const GUARANTEES = [
  {
    icon: ShieldCheck,
    quote:
      "Nếu sản phẩm không đúng với bản thiết kế đã duyệt, chúng tôi sẽ làm lại miễn phí.",
    title: "Cam kết chất lượng",
  },
  {
    icon: Eye,
    quote:
      "Bạn nhận file thiết kế để duyệt trước khi sản xuất. Không có bất ngờ.",
    title: "Minh bạch tuyệt đối",
  },
  {
    icon: Clock,
    quote:
      "Tư vấn thời gian thực tế ngay từ đầu. Cam kết tiến độ với mọi đơn hàng.",
    title: "Cam kết tiến độ",
  },
];

const EVENTS = [
  "Giải đấu thể thao",
  "Lễ kỷ niệm doanh nghiệp",
  "Hội nghị khách hàng",
  "Sự kiện văn hóa",
  "Ngày kỷ niệm thành lập",
  "Hội thảo & hội nghị",
];

export default function AboutRoute() {
  useScrollReveal();

  return (
    <div className="overflow-x-hidden">
      {/* ── A. Hero ─────────────────────────────────────────── */}
      <section
        className="relative flex min-h-[80vh] w-full items-center overflow-hidden"
        aria-label="Về chúng tôi"
      >
        {/* Premium dark gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-hero via-[#151530] to-[#0d0d1a]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: [
              "radial-gradient(circle at 20% 30%, rgba(212,175,55,0.12) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 70%, rgba(212,175,55,0.08) 0%, transparent 50%)",
            ].join(","),
          }}
        />
        {/* Decorative geometric shapes */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-brand-accent/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full border border-white/5" />
        <div className="pointer-events-none absolute right-[25%] top-[20%] h-4 w-4 rotate-45 bg-brand-accent/20" />
        <div className="pointer-events-none absolute bottom-[30%] left-[15%] h-6 w-6 rotate-45 bg-brand-support/15" />

        <div className="relative z-10 mx-auto w-full max-w-container-max px-margin-mobile py-24 md:px-margin-desktop">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="reveal active">
              <div className="mb-5 flex items-center gap-3">
                <div className="h-[3px] w-16 bg-brand-accent" />
                <span className="font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
                  Phùng Thị
                </span>
              </div>
              <h1 className="mb-6 font-heading uppercase leading-none tracking-wide text-white">
                <span className="block text-[48px] leading-[1] md:text-[64px]">
                  HƠN 600,000
                </span>
                <span className="block text-[48px] leading-[1] md:text-[64px]">
                  GIẢI THƯỞNG
                </span>
                <span className="block text-[48px] leading-[1] text-brand-accent md:text-[64px]">
                  ĐÃ TRAO TAY
                </span>
              </h1>
              <p className="mb-8 max-w-md font-body-lg text-body-lg leading-relaxed text-white/80">
                Xưởng sản xuất cúp, kỷ niệm chương và quà tặng vinh danh hàng đầu
                Việt Nam. Mỗi chiếc là một câu chuyện — chúng tôi làm cho nó trở
                nên xứng tầm.
              </p>
              <div className="mb-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                <Link
                  to="/products"
                  className="rounded-lg bg-action-support px-8 py-4 text-center font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:bg-action-support-hover"
                >
                  Khám phá sản phẩm
                </Link>
                <Link
                  to="/contact"
                  className="rounded-lg border-2 border-white/40 px-8 py-4 text-center font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:border-brand-accent hover:bg-white/10"
                >
                  Nhận báo giá
                </Link>
              </div>
              <div className="flex items-center gap-6 text-[13px] font-semibold uppercase tracking-wide text-white/50">
                <span className="flex items-center gap-1.5">
                  <Clock className="text-[16px] text-brand-accent" />
                  15+ năm kinh nghiệm
                </span>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span className="flex items-center gap-1.5">
                  <Factory className="text-[16px] text-brand-support" />
                  2 xưởng sản xuất
                </span>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span className="flex items-center gap-1.5">
                  <Trophy className="text-[16px] text-brand-accent" />
                  165+ mẫu thiết kế
                </span>
              </div>
            </div>
            <div className="reveal">
              <div className="aspect-video overflow-hidden rounded-xl luxury-shadow shadow-2xl shadow-brand-accent/20">
                <iframe
                  className="h-full w-full"
                  src="https://www.youtube.com/embed/cYWDGlo7t8k"
                  title="Giới thiệu Phùng Thị"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── B. What We Make ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface-base px-margin-mobile py-24 md:px-margin-desktop">
        <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full border border-brand-accent/5" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-brand-support/[0.03]" />
        <div className="mx-auto max-w-container-max reveal">
          <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
            Sản phẩm của chúng tôi
          </p>
          <h2 className="mb-4 font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
            Chúng tôi làm gì?
          </h2>
          <div className="mb-6 h-[3px] w-16 bg-brand-support" />
          <p className="mb-14 max-w-2xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
            6 dòng sản phẩm chính — từ cúp vinh danh pha lê đến bảng vinh danh
            gỗ. Tất cả được sản xuất trực tiếp tại xưởng, không qua trung gian.
          </p>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6">
            {PRODUCTS.map((product, i) => (
              <div
                key={product.name}
                className="group reveal rounded-xl border border-outline-variant bg-white luxury-shadow transition-all duration-300 hover:scale-[1.02] hover:luxury-shadow"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-t-xl bg-[#f8f8f8] p-4">
                  <img
                    className="h-full w-full max-h-[65%] object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                  />
                </div>
                <div className="border-t border-outline-variant p-4">
                  <p className="font-label-md text-label-md uppercase tracking-wide text-on-surface group-hover:text-primary transition-colors">
                    {product.name}
                  </p>
                  <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                    {product.material}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── C. How We Make It ───────────────────────────────── */}
      <section className="bg-surface-container-low px-margin-mobile py-24 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max reveal">
          <p className="mb-3 text-center font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
            Quy trình sản xuất
          </p>
          <h2 className="mb-4 text-center font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
            Cách chúng tôi làm ra sản phẩm
          </h2>
          <div className="mx-auto mb-6 h-[3px] w-16 bg-brand-support" />
          <p className="mx-auto mb-14 max-w-2xl text-center font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
            Từ ý tưởng đến bàn giao — quy trình 4 bước minh bạch, bạn kiểm soát
            ở mọi giai đoạn.
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="group reveal rounded-xl border border-brand-accent/20 bg-brand-strong/[0.03] luxury-shadow transition-all duration-500 hover:-translate-y-1 hover:border-brand-accent/40 hover:bg-brand-strong/[0.06] hover:luxury-shadow-lg"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex flex-col items-center p-8 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-brand-strong to-brand-support shadow-lg shadow-brand-strong/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                    <step.icon className="text-[24px] text-white" />
                  </div>
                  <h3 className="mb-3 font-heading text-[22px] uppercase text-on-surface">
                    {step.title}
                  </h3>
                  <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── D. Materials ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface-container-low px-margin-mobile py-24 md:px-margin-desktop">
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full border border-brand-support/10" />
        <div className="pointer-events-none absolute -bottom-16 right-[10%] h-32 w-32 rotate-45 border border-brand-accent/10" />
        <div className="mx-auto max-w-container-max reveal">
          <p className="mb-3 text-center font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
            Chất liệu
          </p>
          <h2 className="mb-14 text-center font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
            Chất liệu chúng tôi làm việc cùng
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {MATERIALS.map((mat, i) => (
              <div
                key={mat.name}
                className="reveal rounded-xl border border-outline-variant bg-surface-container-low p-6 transition-all duration-300 hover:scale-[1.02] hover:luxury-shadow"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-strong/10">
                  <mat.icon className="text-[24px] text-brand-strong" />
                </div>
                <h3 className="mb-2 font-heading text-[22px] uppercase text-on-surface">
                  {mat.name}
                </h3>
                <p className="mb-3 font-body-md text-body-md text-on-surface-variant">
                  {mat.desc}
                </p>
                <p className="font-label-md text-label-md text-[12px] uppercase tracking-wide text-brand-accent">
                  {mat.use}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── E. Scale & Guarantees ────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-container-low to-surface-base px-margin-mobile py-24 md:px-margin-desktop">
        <div className="pointer-events-none absolute -right-24 top-[20%] h-48 w-48 rounded-full border border-brand-accent/8" />
        <div className="pointer-events-none absolute left-[10%] top-[60%] h-6 w-6 rotate-45 bg-brand-strong/10" />
        <div className="mx-auto max-w-container-max">
          <div className="mb-16 grid grid-cols-2 gap-8 md:grid-cols-4 reveal">
            {[
              { number: "600k+", label: "Sản phẩm đã trao" },
              { number: "15+", label: "Năm kinh nghiệm" },
              { number: "2", label: "Xưởng sản xuất" },
              { number: "Toàn quốc", label: "Giao hàng" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="reveal flex flex-col items-center text-center"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="font-heading text-[40px] uppercase leading-none text-brand-strong md:text-[52px]">
                  {stat.number}
                </span>
                <span className="mt-2 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 reveal">
            {GUARANTEES.map((g, i) => (
              <div
                key={g.title}
                className="reveal flex flex-col justify-between rounded-xl border border-outline-variant bg-white p-8 luxury-shadow"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-strong/10">
                  <g.icon className="text-[22px] text-brand-accent" />
                </div>
                <p className="mb-6 font-body-lg text-body-lg leading-relaxed italic text-on-surface-variant">
                  "{g.quote}"
                </p>
                <div className="border-t border-outline-variant pt-4">
                  <p className="font-label-md text-label-md uppercase tracking-wide text-on-surface">
                    {g.title}
                  </p>
                  <p className="font-body-md text-body-md text-[13px] text-brand-accent">
                    Phùng Thị
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── F. Who We've Served ──────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-brand-accent/10 bg-white px-margin-mobile py-24 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max reveal">
          <p className="mb-3 text-center font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
            Đối tượng
          </p>
          <h2 className="mb-4 text-center font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
            Chúng tôi phục vụ ai?
          </h2>
          <div className="mx-auto mb-6 h-[3px] w-16 bg-brand-support" />
          <p className="mx-auto mb-14 max-w-2xl text-center font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
            Từ giải đấu thể thao đến lễ kỷ niệm doanh nghiệp — sản phẩm của
            chúng tôi góp mặt trong nhiều sự kiện quan trọng trên khắp cả nước.
          </p>

          <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-3">
            {EVENTS.map((event, i) => (
              <span
                key={event}
                className="reveal rounded-full border border-outline-variant bg-surface-container-low px-6 py-3 font-body-md text-body-md text-on-surface transition-all duration-300 hover:border-brand-accent hover:bg-brand-accent/5"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {event}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── G. Final CTA ─────────────────────────────────────── */}
      <section className="bg-surface-dark px-margin-mobile py-24 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max text-center reveal">
          <h2 className="font-heading text-[36px] uppercase leading-tight text-white md:text-[48px]">
            Sẵn sàng tạo ra
            <br />
            giải thưởng của bạn?
          </h2>
          <div className="mx-auto mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-lg bg-action-support px-10 py-5 font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:bg-action-support-hover"
            >
              Xem danh mục sản phẩm
              <ArrowRight className="text-[18px]" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-white/40 px-10 py-5 font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:border-brand-accent hover:bg-white/10"
            >
              Liên hệ báo giá
            </Link>
          </div>

          <div className="mx-auto mt-16 flex max-w-lg flex-wrap items-center justify-center gap-x-8 gap-y-4 font-body-md text-body-md text-white/60">
            <a
              href="tel:0816999296"
              className="flex items-center gap-2 transition-colors hover:text-brand-accent"
            >
              <Phone className="size-4" />
              0816 999 296
            </a>
            <a
              href="https://zalo.me/352826287636550047"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition-colors hover:text-brand-accent"
            >
              <MessageCircle className="size-4" />
              Zalo OA
            </a>
            <a
              href="mailto:Lienhe.phungthi@gmail.com"
              className="flex items-center gap-2 transition-colors hover:text-brand-accent"
            >
              <Mail className="size-4" />
              Lienhe.phungthi@gmail.com
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
