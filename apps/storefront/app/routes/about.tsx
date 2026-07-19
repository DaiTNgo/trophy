import { Link } from "react-router";
import type { Route } from "./+types/about";
import { useScrollReveal } from "../hooks/useScrollReveal";
import {
  Trophy,
  Gem,
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
  Handshake,
  PartyPopper,
  Rocket,
} from "lucide-react";
import { ProductMarqueeSection } from "../components/about/product-marquee-section";
import Container from "../components/container";

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
    body: "Bạn có thể đưa ra ý tưởng hoặc chính bạn thiết kế trên chính trang web của chúng tôi. Chúng tôi sẽ hỗ trợ bạn hoàn thiện bản vẽ.",
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

const CORE_VALUES = [
  {
    icon: Gem,
    title: "CHẾ TÁC THỦ CÔNG",
    body: "Từng sản phẩm được làm bởi nghệ nhân giàu kinh nghiệm — không dây chuyền vô hồn, không hàng loạt thiếu cá tính.",
  },
  {
    icon: PenLine,
    title: "SÁNG TẠO KHÔNG GIỚI HẠN",
    body: "Logo, chữ ký, hình ảnh thương hiệu — bất kỳ ý tưởng nào cũng có thể khắc lên pha lê, hợp kim hoặc kim loại.",
  },
  {
    icon: Handshake,
    title: "ĐỒNG HÀNH TRỌN VẸN",
    body: "Từ phác thảo đầu tiên đến lúc sản phẩm về tay khách hàng — đội ngũ Phùng Thị luôn sẵn sàng hỗ trợ.",
  },
];

const CLIENTS = [
  {
    icon: Building2,
    title: "DOANH NGHIỆP & TẬP ĐOÀN",
    body: "Kỷ niệm thành lập, hội nghị khách hàng, tri ân nhân viên. Giải pháp vinh danh trọn gói cho mọi quy mô.",
  },
  {
    icon: Trophy,
    title: "THỂ THAO & GIẢI ĐẤU",
    body: "Từ giải phong trào đến đấu trường chuyên nghiệp — cúp, huy chương và kỷ niệm chương cho mọi bộ môn.",
  },
  {
    icon: PartyPopper,
    title: "SỰ KIỆN & GIÁO DỤC",
    body: "Hội thảo chuyên ngành, lễ tốt nghiệp, cuộc thi học thuật, sự kiện văn hóa — vinh danh mọi thành tựu.",
  },
  {
    icon: Rocket,
    title: "START-UP & SME",
    body: "Quà tặng thương hiệu, vinh danh nội bộ. Cá nhân hóa sản phẩm với ngân sách linh hoạt.",
  },
];

export default function AboutRoute() {
  useScrollReveal();

  return (
    <div className="overflow-x-hidden">
      <ProductMarqueeSection />

      {/* ── B. What We Make ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface-base pb-24">
        <Container>
          <div className="reveal">
            <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              Sản phẩm của chúng tôi
            </p>
            <h2 className="mb-4 font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
              Chúng tôi làm gì?
            </h2>
            <div className="mb-6 h-[3px] w-16 bg-brand-support" />
            <p className="mb-14 max-w-2xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
              6 dòng sản phẩm chính — từ cúp vinh danh pha lê đến bảng vinh danh
              gỗ. Tất cả được sản xuất trực tiếp tại xưởng, không qua trung
              gian.
            </p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4">
              {PRODUCTS.map((product) => (
                <div
                  key={product.name}
                  className="group relative overflow-hidden rounded-xl bg-white shadow-lg transition-all duration-300 hover:shadow-xl"
                >
                  <img
                    className="w-full transition-transform duration-500 group-hover:scale-105"
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                  />
                  <div className="px-3 py-2.5">
                    <p className="text-center text-[13px] font-bold uppercase tracking-wide text-on-surface">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-center text-[12px] font-semibold text-on-surface-variant">
                      {product.material}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/products"
              className="mx-auto mt-10 flex w-fit items-center gap-2 rounded-lg border-2 border-brand-strong px-8 py-3.5 font-label-md text-label-md uppercase tracking-widest text-brand-strong transition-all duration-300 hover:bg-brand-strong hover:text-white"
            >
              Xem thêm sản phẩm khác
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* ── C. How We Make It ───────────────────────────────── */}
      <section className="bg-surface-container-low py-24">
        <Container>
          <div className="reveal">
            <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              Quy trình sản xuất
            </p>
            <h2 className="mb-4 font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
              Cách chúng tôi làm ra sản phẩm
            </h2>
            <div className="mb-6 h-[3px] w-16 bg-brand-support" />
            <p className="mb-14 max-w-2xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
              Từ ý tưởng đến bàn giao — quy trình 4 bước minh bạch, bạn kiểm
              soát ở mọi giai đoạn.
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
        </Container>
      </section>

      {/* ── D. Materials ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface-container-low py-24">
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full border border-brand-support/10" />
        <div className="pointer-events-none absolute -bottom-16 right-[10%] h-32 w-32 rotate-45 border border-brand-accent/10" />
        <Container>
          <div className="reveal">
            <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              Chất liệu
            </p>
            <h2 className="mb-14 font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
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
        </Container>
      </section>

      {/* ── E. Core Values ──────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-container-low to-surface-base py-24">
        <div className="pointer-events-none absolute -right-24 top-[20%] h-48 w-48 rounded-full border border-brand-accent/8" />
        <div className="pointer-events-none absolute left-[10%] top-[60%] h-6 w-6 rotate-45 bg-brand-strong/10" />
        <Container>
          <div className="reveal">
            <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              Giá trị cốt lõi
            </p>
            <h2 className="mb-4 font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
              Cách chúng tôi làm việc
            </h2>
            <div className="mb-6 h-[3px] w-16 bg-brand-support" />
            <p className="mb-14 max-w-2xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
              Không chỉ là sản phẩm — mỗi đơn hàng là một sự hợp tác, được xây
              dựng trên sự tận tâm, sáng tạo và trách nhiệm.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 reveal">
              {CORE_VALUES.map((v, i) => (
                <div
                  key={v.title}
                  className="reveal flex flex-col justify-between rounded-xl border border-outline-variant bg-white p-8 luxury-shadow"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-strong to-brand-support shadow-lg shadow-brand-strong/20">
                    <v.icon className="text-[22px] text-white" />
                  </div>
                  <h3 className="mb-3 font-heading text-[22px] uppercase text-on-surface">
                    {v.title}
                  </h3>
                  <p className="font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
                    {v.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ── F. Who We Serve ──────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface-base py-24">
        <Container>
          <div className="reveal">
            <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              Đối tác
            </p>
            <h2 className="mb-4 font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
              Đối tác của chúng tôi
            </h2>
            <div className="mb-6 h-[3px] w-16 bg-brand-support" />
            <p className="mb-14 max-w-2xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
              Từ doanh nghiệp lớn đến start-up nhỏ — sản phẩm của Phùng Thị đồng
              hành cùng mọi tổ chức trong những cột mốc đáng nhớ.
            </p>

            <div className="space-y-0">
              {CLIENTS.map((client, i) => {
                const isLeft = i % 2 === 0;
                return (
                  <div
                    key={client.title}
                    className={`reveal flex flex-col items-center gap-8 rounded-xl px-6 py-12 md:flex-row md:gap-16 md:px-16 ${isLeft ? "bg-gradient-to-r from-brand-support/[0.07] to-white" : "bg-gradient-to-l from-brand-support/[0.07] to-white md:flex-row-reverse"}`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex-shrink-0">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-strong to-brand-support shadow-lg shadow-brand-strong/20 md:h-24 md:w-24">
                        <client.icon className="text-[32px] text-white md:text-[36px]" />
                      </div>
                    </div>
                    <div className={isLeft ? "md:text-left" : "md:text-right"}>
                      <h3 className="mb-3 font-heading text-[24px] uppercase tracking-wide text-on-surface md:text-[28px]">
                        {client.title}
                      </h3>
                      <p className="max-w-xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
                        {client.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mx-auto mt-16 max-w-2xl text-center reveal">
              <div className="mx-auto mb-6 h-[3px] w-16 bg-brand-accent" />
              <p className="font-heading text-[26px] uppercase leading-tight text-on-surface md:text-[32px]">
                Vinh danh không có giới hạn.
                <br />
                <span className="text-brand-accent">
                  Mọi tổ chức, mọi sứ mệnh
                </span>
                <br />
                Phùng Thị đồng hành cùng bạn.
              </p>
            </div>
          </div>
        </Container>
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
