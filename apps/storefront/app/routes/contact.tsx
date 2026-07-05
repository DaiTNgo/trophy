import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/contact";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Liên Hệ Báo Giá | Phùng Thị" },
    { name: "description", content: "Liên hệ để nhận báo giá thủ công cho sản phẩm chưa có giá niêm yết." },
  ];
}

export default function ContactRoute() {
  const [searchParams] = useSearchParams();
  const product = searchParams.get("product");
  const variant = searchParams.get("variant");
  const sku = searchParams.get("sku");

  return (
    <div className="min-h-screen bg-surface text-on-background">
      <main className="mx-auto max-w-container-max px-margin-mobile py-12 md:px-margin-desktop">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[28px] border border-outline bg-white px-8 py-12">
            <p className="text-sm uppercase tracking-wide text-on-surface-variant">Contact price</p>
            <h1 className="mt-2 font-headline-lg text-[40px] uppercase text-on-surface">Liên hệ báo giá</h1>
            <p className="mt-4 max-w-2xl text-lg text-on-surface-variant">
              Một số biến thể được báo giá thủ công theo số lượng, vật liệu hoặc yêu cầu sản xuất. Gửi thông tin cho đội ngũ Phùng Thị để nhận tư vấn và báo giá phù hợp.
            </p>

            {(product || variant || sku) ? (
              <div className="mt-8 rounded-2xl border border-outline bg-surface-container-lowest p-5">
                <p className="text-sm uppercase tracking-wide text-on-surface-variant">Biến thể bạn đang xem</p>
                {product ? <p className="mt-2 font-semibold text-on-surface">{product}</p> : null}
                {variant ? <p className="text-sm text-on-surface-variant">Variant: {variant}</p> : null}
                {sku ? <p className="text-sm text-on-surface-variant">SKU: {sku}</p> : null}
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <a
                href="tel:0900000000"
                className="rounded-2xl border border-outline bg-white p-5 transition hover:border-primary"
              >
                <p className="text-sm uppercase tracking-wide text-on-surface-variant">Hotline</p>
                <p className="mt-2 text-2xl font-semibold text-on-surface">0900 000 000</p>
                <p className="mt-2 text-sm text-on-surface-variant">Gọi trực tiếp để được tư vấn nhanh.</p>
              </a>
              <a
                href="mailto:hello@phungthi.vn?subject=Yeu%20cau%20bao%20gia"
                className="rounded-2xl border border-outline bg-white p-5 transition hover:border-primary"
              >
                <p className="text-sm uppercase tracking-wide text-on-surface-variant">Email</p>
                <p className="mt-2 text-2xl font-semibold text-on-surface">hello@phungthi.vn</p>
                <p className="mt-2 text-sm text-on-surface-variant">Gửi thông tin để nhận báo giá bằng email.</p>
              </a>
            </div>
          </section>

          <aside className="rounded-[28px] border border-outline bg-white p-8 shadow-sm">
            <h2 className="border-b border-outline pb-4 font-headline-md text-2xl text-on-surface">Cần chuẩn bị gì?</h2>
            <div className="mt-6 space-y-4 text-sm text-on-surface-variant">
              <p>Sản phẩm hoặc biến thể bạn quan tâm.</p>
              <p>Số lượng dự kiến và thời hạn cần hàng.</p>
              <p>Yêu cầu khắc/in hoặc cá nhân hóa nếu có.</p>
              <p>Địa điểm giao hàng để đội ngũ ước tính triển khai.</p>
            </div>
            <div className="mt-8 rounded-2xl bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
              Sau khi tiếp nhận, đội ngũ sẽ phản hồi báo giá và hướng dẫn đặt hàng thủ công.
            </div>
            <Link
              to="/products"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-primary px-5 py-3 text-sm font-semibold uppercase tracking-wide text-primary"
            >
              Quay lại sản phẩm
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
