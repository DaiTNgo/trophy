# Text Formatting & Alignment Design

## 1. Overview
The goal is to provide advanced text formatting capabilities (Bold, Italic, Underline) and text alignment controls (Left, Center, Right, Justified) to both the Template Admin and the Shopper Preview. The shopper's access to these tools is configurable by the Admin.

## 2. UI / UX Design

### Admin (Template Inspector)
For each text block, the admin will see:
- **Format Policy (B, I, U) & Align Policy:** Toggle toggles dictating whether the shopper can modify the formatting and alignment.
- **Default Formatting:** A toolbar with B, I, U toggles and alignment toggles to set the default state of the text block.

### Shopper (Preview Form)
If the format/align policy allows, the shopper will see a rich-text-like toolbar under the text input area containing:
- Bold (B) toggle
- Italic (I) toggle
- Underline (U) toggle
- Alignment options (L, C, R)

## 3. Font Family Architecture (Handling Bold & Italic)
Instead of simulating faux bold/italic which fails or looks bad in PDF exports, we will use native font files.
- Fonts will be grouped into `FontFamily` objects containing paths to `regular`, `bold`, `italic`, and `boldItalic` font files.
- When the user presses "B" or "I", the `fontId` is automatically swapped to the respective variant within the same font family.
- If a font family lacks an italic variant, the "I" button will be disabled when that font family is selected.

## 4. Text Underline & Alignment
- **Underline:** Stored as `underline: boolean` on the text value object. Handled manually via drawing a line under the rendered text in both the canvas (DOM) and the exported PDF (pdf-lib `drawLine`).
- **Alignment:** Stored as `align: "left" | "center" | "right" | "justified"`. Already supported by the core rendering engine. Just requires exposing the UI toggles.

## 5. Required Model Changes
1. **`TextColorPolicy` / `TextFontPolicy` extension:** Add `formatPolicy` and `alignPolicy` inside `TextEditorLayer` to manage shopper access.
2. **`TextFieldValue` extension:** Add `isBold`, `isItalic`, `isUnderline`, `align` properties to track the dynamic state chosen by the shopper.
3. **`FontFamily` mapping:** Refactor `constants.ts` to use font families instead of discrete font variants.
