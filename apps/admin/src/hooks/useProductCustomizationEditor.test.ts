import { DEFAULT_TEMPLATE } from "@trophy/customization";
import React from "react";
import { useProductCustomizationEditor } from "./useProductCustomizationEditor";
import type { TextEditorLayer } from "@trophy/customization";

type HookDispatcher = {
  useState: <S>(initialState: S | (() => S)) => [S, (action: S | ((prevState: S) => S)) => void];
  useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
};

function renderHook<T>(hookFn: () => T) {
  const states: unknown[] = [];
  let stateIdx = 0;
  let currentResult: T;

  function render() {
    stateIdx = 0;
    currentResult = hookFn();
  }
  type ReactInternals = {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: {
      H: HookDispatcher | null;
    };
  };
  const internals = (React as unknown as ReactInternals).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const prevDispatcher = internals?.H ?? null;

  const dispatcher: HookDispatcher = {
    useState: <S>(init: S | (() => S)): [S, (action: S | ((prevState: S) => S)) => void] => {
      const idx = stateIdx++;
      if (states[idx] === undefined) {
        states[idx] = typeof init === "function" ? (init as () => S)() : init;
      }
      const setState = (action: S | ((prevState: S) => S)) => {
        const current = states[idx] as S;
        states[idx] = typeof action === "function" ? (action as (prevState: S) => S)(current) : action;
        render();
      };
      return [states[idx] as S, setState];
    },
    useEffect: () => {
      // no-op for synchronous hook testing
    },
  };

  if (internals) {
    internals.H = dispatcher;
  }

  try {
    render();
    return {
      result: {
        get current() {
          return currentResult;
        },
      },
      restore: () => {
        if (internals) {
          internals.H = prevDispatcher;
        }
      },
    };
  } catch (e) {
    if (internals) {
      internals.H = prevDispatcher;
    }
    throw e;
  }
}
import { describe, expect, it } from "vitest";
import { getProductCustomizationPublishIssue } from "./product-customization-publish";

describe("getProductCustomizationPublishIssue", () => {
  it("returns the fixed category validation message when no fixed category is selected", () => {
    const issue = getProductCustomizationPublishIssue({
      productId: "product_1",
      initialCustomization: {
        canvasWidthPx: 1200,
        canvasHeightPx: 900,
      },
      template: {
        ...DEFAULT_TEMPLATE,
        background: {
          assetId: "asset_1",
          previewUrl: "/asset.png",
          widthPx: 1200,
          heightPx: 900,
        },
        layers: DEFAULT_TEMPLATE.layers.map((layer) =>
          layer.id === "badge_shape" && layer.type === "image_shape"
            ? {
                ...layer,
                sourcePolicy: "clipart_category_only",
                clipartCategoryMode: "fixed",
                clipartCategory: null,
                allowedClipartCategories: [],
              }
            : layer,
        ),
      },
    });

    expect(issue).toBe("Badge artwork needs a fixed clipart category.");
  });

  it("returns the allowed-category validation message when there are no allowed categories", () => {
    const issue = getProductCustomizationPublishIssue({
      productId: "product_1",
      initialCustomization: {
        canvasWidthPx: 1200,
        canvasHeightPx: 900,
      },
      template: {
        ...DEFAULT_TEMPLATE,
        background: {
          assetId: "asset_1",
          previewUrl: "/asset.png",
          widthPx: 1200,
          heightPx: 900,
        },
        layers: DEFAULT_TEMPLATE.layers.map((layer) =>
          layer.id === "badge_shape" && layer.type === "image_shape"
            ? {
                ...layer,
                sourcePolicy: "upload_or_clipart_category",
                presentation: "side_by_side",
                clipartCategoryMode: "allow_list",
                clipartCategory: null,
                allowedClipartCategories: [],
              }
            : layer,
        ),
      },
    });

    expect(issue).toBe("Badge artwork needs at least one allowed clipart category.");
  });
});

describe("useProductCustomizationEditor - text on path", () => {
  it("adds a closed ellipse text on path layer instead of a regular straight text layer", () => {
    const hook = renderHook(() =>
      useProductCustomizationEditor("p_1", null, async () => {}),
    );

    try {
      const initialLayerCount = hook.result.current.template.layers.length;
      hook.result.current.addTextOnPathLayer();

      const layers = hook.result.current.template.layers;
      expect(layers.length).toBe(initialLayerCount + 1);

      const addedLayer = layers[layers.length - 1] as TextEditorLayer;
      expect(addedLayer.type).toBe("text");
      expect(addedLayer.name).toBe("Text on path");
      expect(addedLayer.text.path.type).toBe("closed_ellipse");
      expect(hook.result.current.pathEditingLayerId).toBe(addedLayer.id);
    } finally {
      hook.restore();
    }
  });
});
