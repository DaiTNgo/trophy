import { describe, expect, it } from "vitest";
import homeCopy from "../locales/vi/home.json";

type HomeLocale = {
  hero_slides: Array<{
    eyebrow: string;
    headlines: string[];
    body: string;
    cta: string;
    cta2: string;
  }>;
  categories_title: string;
  categories_subtitle: string;
  categories_cta: string;
  hero_aria_label: string;
  hero_slide_aria_label: string;
};

describe("Vietnamese home page copy", () => {
  it("keeps each hero slide concise and clear for shoppers", () => {
    const copy = homeCopy as unknown as HomeLocale;

    expect(copy.hero_slides).toHaveLength(3);
    expect(copy.hero_slides.every((slide) => slide.headlines.length <= 2)).toBe(
      true,
    );
    expect(
      copy.hero_slides.every((slide) => slide.body.split(/\s+/).length <= 20),
    ).toBe(true);
    expect(new Set(copy.hero_slides.map((slide) => slide.cta))).toEqual(
      new Set(["Xem mẫu cúp"]),
    );
    expect(new Set(copy.hero_slides.map((slide) => slide.cta2))).toEqual(
      new Set(["Nhận tư vấn"]),
    );
  });

  it("provides Vietnamese catalog and accessibility labels", () => {
    const copy = homeCopy as unknown as HomeLocale;

    expect(copy.categories_title).toBe("Chọn mẫu cúp phù hợp");
    expect(copy.categories_cta).toBe("Xem mẫu");
    expect(copy.hero_aria_label).toBe("Trình chiếu cúp và kỷ niệm chương");
    expect(copy.hero_slide_aria_label).toBe("Chuyển đến slide {{slide}}");
  });
});
