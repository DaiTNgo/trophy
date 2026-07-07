import { describe, expect, it, vi } from "vitest";
import { isValidLocale } from "./locale";
import { hydrateTranslations, loadTranslationsForOwner, upsertTranslations } from "./catalog-translation";

function createMockDb(selectResult: any[] = []) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    values: vi.fn(() => chain),
    onConflictDoUpdate: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    then: (resolve: any) => resolve(selectResult), // for await db.select()...
  };

  return {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    delete: vi.fn(() => chain),
  } as any;
}

describe("Catalog Translation Helpers", () => {
  it("validates exactly vi and en", () => {
    expect(isValidLocale("vi")).toBe(true);
    expect(isValidLocale("en")).toBe(true);
    expect(isValidLocale("fr")).toBe(false);
    expect(isValidLocale("")).toBe(false);
    expect(isValidLocale(null)).toBe(false);
  });

  it("upserts and deletes translations for a specific owner", async () => {
    const db = createMockDb();
    await upsertTranslations(db, "product", "prod-1", "title", {
      vi: "Tiêu đề",
      en: null,
    });

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("loads translations for a specific owner", async () => {
    const db = createMockDb([
      { fieldName: "title", locale: "vi", value: "Tiêu đề" },
      { fieldName: "title", locale: "en", value: "Title" },
    ]);
    const loaded = await loadTranslationsForOwner(db, "product", "prod-1");
    
    expect(loaded["title"]).toBeDefined();
    expect(loaded["title"]["vi"]).toBe("Tiêu đề");
    expect(loaded["title"]["en"]).toBe("Title");
  });

  it("hydrates items with translations and Vietnamese canonical fallback", async () => {
    const db = createMockDb([
      { ownerKey: "prod-2", fieldName: "title", locale: "en", value: "Hydrated Title" }
    ]);

    const items = [
      { id: "prod-2", canonicalTitle: "Tiêu đề gốc" },
      { id: "prod-3", canonicalTitle: "Chỉ gốc" } // no translations
    ];

    const hydrated = await hydrateTranslations(
      db,
      "product",
      items,
      (item) => item.id,
      [{ fieldName: "title", objectKey: "localizedTitle" as keyof typeof items[0] }],
      [{ fieldName: "title", objectKey: "canonicalTitle" as keyof typeof items[0] }]
    );

    expect((hydrated[0] as any).localizedTitle.vi).toBe("Tiêu đề gốc"); // Fallback
    expect((hydrated[0] as any).localizedTitle.en).toBe("Hydrated Title"); // Translation

    expect((hydrated[1] as any).localizedTitle.vi).toBe("Chỉ gốc"); // Fallback
    expect((hydrated[1] as any).localizedTitle.en).toBe(""); // Missing translation
  });
});
