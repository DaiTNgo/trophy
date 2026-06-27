import type { ChoiceOption, CustomizationTemplate } from "./types";

const presetSvg = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export const DEFAULT_TEXT_COLOR_OPTIONS: ChoiceOption[] = [
  { value: "#111111", label: "Black", swatch: "#111111" },
  { value: "#ffffff", label: "White", swatch: "#ffffff" },
  { value: "#b45309", label: "Gold", swatch: "#b45309" },
  { value: "#0f766e", label: "Teal", swatch: "#0f766e" },
];

export const DEFAULT_FONT_FAMILY_OPTIONS: ChoiceOption[] = [
  { value: "sans-bold", label: "Sans Bold" },
  { value: "serif-display", label: "Serif Display" },
  { value: "script-elegant", label: "Script Elegant" },
];

export const DEFAULT_TEMPLATE: CustomizationTemplate = {
  id: "template_demo_cup",
  productId: "prod_trophy_cup",
  name: "Classic Trophy Cup",
  revision: 1,
  status: "published",
  background: {
    assetId: "background_demo_cup",
    filename: "classic-trophy-cup.svg",
    mimeType: "image/svg+xml",
    widthPx: 900,
    heightPx: 900,
    previewUrl: presetSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#f8d878"/><stop offset=".5" stop-color="#fff5bf"/><stop offset="1" stop-color="#b8862b"/></linearGradient></defs><rect width="900" height="900" fill="#f5f5f4"/><path d="M300 150h300v130c0 150-65 250-150 270-85-20-150-120-150-270z" fill="url(#g)" stroke="#966f24" stroke-width="12"/><path d="M300 190H190c0 130 35 205 145 220M600 190h110c0 130-35 205-145 220" fill="none" stroke="#b8862b" stroke-width="38"/><path d="M430 550h40v120h120v55H310v-55h120z" fill="url(#g)" stroke="#966f24" stroke-width="10"/><rect x="270" y="725" width="360" height="90" rx="14" fill="#292524"/></svg>`,
    ),
  },
  layers: [
    {
      id: "badge_shape",
      name: "Badge artwork",
      type: "image_shape",
      hidden: false,
      locked: false,
      zIndex: 1,
      geometry: { xRatio: 0.5, yRatio: 0.31, widthRatio: 0.2, heightRatio: 0.2, rotationDeg: 0 },
      shape: { type: "circle", lockAspectRatio: true },
      upload: { fit: "cover", defaultCrop: { scale: 1, xRatio: 0, yRatio: 0 } },
    },
    {
      id: "line_1",
      name: "Main engraving",
      type: "text",
      hidden: false,
      locked: false,
      zIndex: 2,
      geometry: { xRatio: 0.5, yRatio: 0.43, widthRatio: 0.46, rotationDeg: 0 },
      text: {
        sampleText: "LEAGUE CHAMPION",
        maxLines: 1,
        minFontSizePt: 8,
        maxFontSizePt: 18,
        align: "center",
        colorPolicy: { mode: "fixed", color: "#111111" },
        fontPolicy: { mode: "fixed", fontId: "sans-bold" },
        path: { type: "straight" },
      },
    },
    {
      id: "curved_name",
      name: "Curved name",
      type: "text",
      hidden: false,
      locked: false,
      zIndex: 3,
      geometry: { xRatio: 0.5, yRatio: 0.52, widthRatio: 0.42, heightRatio: 0.16, rotationDeg: 0 },
      text: {
        sampleText: "ALEX MORGAN",
        maxLines: 1,
        minFontSizePt: 7,
        maxFontSizePt: 16,
        align: "center",
        colorPolicy: {
          mode: "shopper_selectable",
          defaultColor: "#111111",
          options: DEFAULT_TEXT_COLOR_OPTIONS,
        },
        fontPolicy: {
          mode: "shopper_selectable",
          defaultFontId: "sans-bold",
          options: DEFAULT_FONT_FAMILY_OPTIONS,
        },
        path: {
          type: "closed_ellipse",
          bounds: { xRatio: 0.5, yRatio: 0.5, widthRatio: 1, heightRatio: 1 },
          startAngleDeg: 180,
          direction: "clockwise",
          placement: "over_path",
        },
      },
    },
  ],
  formFields: [
    {
      id: "field_badge_shape",
      layerId: "badge_shape",
      label: "Upload your logo",
      helpText: "Your image will be clipped to the badge shape.",
      required: false,
      order: 2,
    },
    {
      id: "field_line_1",
      layerId: "line_1",
      label: "Line 1",
      placeholder: "LEAGUE CHAMPION",
      required: true,
      order: 1,
    },
    {
      id: "field_curved_name",
      layerId: "curved_name",
      label: "Name",
      placeholder: "ALEX MORGAN",
      required: true,
      order: 3,
    },
  ],
};
