import { Mail } from "lucide-react";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "~/components/ui/input-group";
import { Button } from "../ui/button";

export function NewsletterSection() {
  return (
    <section className="bg-secondary-container px-4 py-20 md:px-margin-desktop">
      <div className=" mx-auto flex flex-col items-center text-center">
        {/* Copy */}
        <div className="mb-8">
        
          <h2 className="font-heading text-[32px] md:text-[40px] uppercase leading-none text-foreground mb-4">
            Đăng ký nhận bản tin
          </h2>
          <p className="font-body-lg text-body-lg text-foreground leading-relaxed">
            Để nhận các thông tin mới từ Phùng Thị cũng như các chương trình khuyến mãi hấp dẫn
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="w-full max-w-2xl"
          aria-label="Đăng ký nhận bản tin"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Địa chỉ email
          </label>
          <InputGroup className="rounded-sm border border-border-strong py-6">
            <InputGroupInput
              id="newsletter-email"
              type="email"
              required
              placeholder="Nhập địa chỉ email của bạn"
              className="text-2xl"
            />
            <InputGroupAddon align="inline-end">
              <Button className="rounded-sm bg-action-support px-5 hover:bg-action-support-hover" type="submit" aria-label="Đăng ký" >
                <Mail />
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </div>
    </section>
  );
}
