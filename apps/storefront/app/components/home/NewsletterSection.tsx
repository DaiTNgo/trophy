import { Mail } from "lucide-react";

export function NewsletterSection() {
  return (
    <section className="bg-surface-subtle px-4 py-14 md:px-margin-desktop md:py-20">
      <div className="mx-auto flex max-w-[980px] flex-col items-center text-center">
        <h2 className="max-w-[860px] font-heading text-[30px] font-bold uppercase leading-[1.15] text-brand-strong md:text-[40px]">
          Đăng ký nhận bản tin
        </h2>
        <p className="mt-4 max-w-[680px] font-body-md text-[16px] leading-7 text-text-base md:text-[18px]">
          Để nhận thông tin sản phẩm mới, lịch ra mắt và chương trình khuyến mãi.
        </p>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-8 w-full max-w-[600px]"
          aria-label="Đăng ký nhận bản tin"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Địa chỉ email
          </label>
          <div className="flex h-[58px] w-full items-center border border-border-strong bg-surface-base shadow-sm transition-colors focus-within:border-action-support focus-within:ring-2 focus-within:ring-action-support/20">
            <input
              id="newsletter-email"
              type="email"
              required
              autoComplete="email"
              placeholder="email@example.com"
              className="h-full min-w-0 flex-1 bg-transparent px-5 font-body-md text-[17px] text-text-base outline-none placeholder:text-text-muted"
            />
            <button
              type="submit"
              aria-label="Đăng ký"
              className="flex h-full w-[64px] shrink-0 items-center justify-center bg-action-support text-white transition-colors hover:bg-action-support-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-support focus-visible:ring-offset-2"
            >
              <Mail className="h-6 w-6" strokeWidth={1.8} />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
