import { describe, expect, it } from "vitest";
import {
  stagedBackgroundPreview,
  stagedCustomizationMediaReadiness,
} from "./customization-background-staging";

const file = new File(["image"], "background.png", { type: "image/png" });

describe("staged customization background preview", () => {
  it("uses the selected file dimensions instead of an uninitialized template canvas", () => {
    expect(
      stagedBackgroundPreview(
        "7",
        {
          file,
          widthPx: 1200,
          heightPx: 900,
        },
        "blob:preview",
      ),
    ).toMatchObject({
      widthPx: 1200,
      heightPx: 900,
    });
  });

  it("is ready when every affected variant has same-sized staged media", () => {
    expect(
      stagedCustomizationMediaReadiness(["7", "8"], {
        7: { file, widthPx: 1200, heightPx: 900 },
        8: { file, widthPx: 1200, heightPx: 900 },
      }),
    ).toEqual({ ready: true, widthPx: 1200, heightPx: 900 });
  });

  it("is not ready when a variant has no staged media or dimensions differ", () => {
    expect(
      stagedCustomizationMediaReadiness(["7", "8"], {
        7: { file, widthPx: 1200, heightPx: 900 },
      }),
    ).toEqual({ ready: false });

    expect(
      stagedCustomizationMediaReadiness(["7", "8"], {
        7: { file, widthPx: 1200, heightPx: 900 },
        8: { file, widthPx: 1000, heightPx: 900 },
      }),
    ).toEqual({ ready: false });
  });

  it("is not ready for repair when staged media differs from the retained canvas", () => {
    expect(
      stagedCustomizationMediaReadiness(
        ["7"],
        {
          7: { file, widthPx: 1200, heightPx: 900 },
        },
        { widthPx: 1000, heightPx: 900 },
      ),
    ).toEqual({ ready: false });
  });
});
