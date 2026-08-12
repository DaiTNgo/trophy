import { describe, expect, it } from "vitest";
import { isValidVietnamTaxId } from "./checkout";

describe("checkout VAT tax ID validation", () => {
  it("accepts valid Vietnamese tax IDs after removing spaces and hyphens", () => {
    expect(isValidVietnamTaxId("0314-042-508")).toBe(true);
    expect(isValidVietnamTaxId("0314 042 508-001")).toBe(true);
  });

  it("rejects tax IDs with an invalid checksum", () => {
    expect(isValidVietnamTaxId("0312345678")).toBe(false);
  });
});
