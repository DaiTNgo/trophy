import { describe, expect, it } from "vitest";
import viProducts from "../locales/vi/products.json";
import enProducts from "../locales/en/products.json";

type ProductsLocale = {
  editorial_more_about: string;
  editorial_why_choose_title: string;
  editorial_fallback_intro: string;
  editorial_fallback_body: string;
};

describe("Vietnamese and English product listing editorial copy", () => {
  it("keeps each language's key set aligned", () => {
    expect(Object.keys(enProducts).sort()).toEqual(
      Object.keys(viProducts).sort(),
    );
  });

  it("provides Vietnamese more-about heading and fallback content", () => {
    const copy = viProducts as unknown as ProductsLocale;
    expect(copy.editorial_more_about).toBe(
      "Tìm hiểu thêm về {{category}}",
    );
    expect(copy.editorial_why_choose_title).toBe(
      "Vì sao chọn sản phẩm Trophy?",
    );
    expect(copy.editorial_fallback_intro.length).toBeGreaterThan(40);
    expect(copy.editorial_fallback_body.length).toBeGreaterThan(40);
  });
});
