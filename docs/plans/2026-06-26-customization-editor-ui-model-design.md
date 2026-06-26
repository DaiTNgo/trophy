# Customization Editor UI And Model Redesign

## Scope

Redesign the admin customization authoring experience as a full editor UI and replace the current block-heavy customization model with a model that separates background, visual layers, and shopper form fields.

This design targets the admin app first, but the model must support storefront preview, backend validation, and production output.

## Goals

- Build an editor-style admin UI with a left vertical rail, central canvas, right inspector, and top document header.
- Support text layers with line limits, min/max font sizing, fixed or shopper-selectable color/font policies, alignment, and preset/custom text paths.
- Support image shape layers where shoppers upload artwork into admin-defined clipped shapes.
- Separate visual layer stack from shopper form order.
- Store geometry relative to the background while showing precise pixel fields in the admin UI.
- Replace the old coupled block model with explicit background, layer, and form-field concepts.

## Non-Goals

- No group layers in v1.
- No decorative shape fill or stroke as shopper-facing output.
- No accepted file type, max file size, or DPI controls in the new Image Shape UI.
- No background crop or transform. The uploaded background image is the coordinate system.
- No compatibility layer for the old editor model beyond whatever short-lived conversion is needed during implementation.

## Editor IA

The editor uses a Figma-like workspace.

### Top Header

The document header owns template-level metadata and actions:

- back/list breadcrumb
- product/template identity
- draft/published status
- save draft
- preview
- publish

Template name, product, and publish status do not live in the right inspector.

### Left Rail

The left rail is a vertical editor-style rail with these tabs:

- `Blocks`
- `Layers`
- `Form`
- `Background`

The rail opens a content panel beside it.

### Blocks Tab

`Blocks` creates new editor objects. It is disabled until a background exists.

Available blocks:

- `Text`: creates a text layer at the center of the canvas and selects it.
- `Image Shapes`: opens the v1 shape list:
  - rectangle
  - circle
  - ellipse
  - rounded rectangle
  - star
  - heart

New layers are added at the top of the visual stack and selected immediately.

### Layers Tab

`Layers` manages visual stack, not shopper form order.

Rules and actions:

- The top item in the panel is the topmost canvas layer.
- Dragging a layer up moves it visually above other layers.
- Click selects the layer and opens its inspector.
- Rename changes the admin layer name.
- Hide/show controls whether the layer is included after publish.
- Lock/unlock prevents canvas move and resize while still allowing selection from the panel.
- Delete removes immediately and shows a toast with Undo.

Hidden means hidden from shopper form, shopper preview, validation output, and production output. The editor can still show hidden layers in a muted state so admins can restore them.

### Form Tab

`Form` manages shopper-facing fields separately from visual stack.

It supports:

- drag/drop form order
- field label
- help text
- placeholder
- required/optional
- click to select the linked layer

Field label/help text/placeholder belong here because this tab defines the shopper form. Geometry and render behavior remain in the right inspector.

Hidden layers do not appear in the published shopper form. The editor may show them muted in the Form tab for clarity.

### Background Tab

`Background` manages the single template background.

It supports:

- upload
- replace
- remove
- thumbnail
- filename
- intrinsic dimensions

Replacing or removing the background does not mutate existing layer geometry. If the background is removed, layers remain in the template but block creation/editing is disabled until a new background is uploaded.

Publishing without a background is invalid.

## Canvas

The canvas uses the uploaded background image as the coordinate system. The image is not cropped, scaled in model space, or transformed.

Canvas behavior:

- No background: show upload/dropzone state and disable block creation.
- Background present: render the image and layers in background coordinate space.
- Click empty background area: clear selection only.
- Click overlapping layers: select the visible topmost layer at that point.
- Use the Layers tab to select a lower overlapping layer.
- Support viewport zoom in, zoom out, reset, fit, and pan.
- Inspector coordinates stay in intrinsic background pixels, regardless of viewport zoom.

## Right Inspector

The right inspector shows properties for the current selection only.

- Text selected: text geometry and typography behavior.
- Image Shape selected: shape geometry and crop behavior.
- No selected layer: canvas/background properties.

Template metadata and publish actions remain in the top header.

## Preview

Preview opens as a full-screen dialog instead of switching the editor layout into preview mode.

The dialog:

- uses the current draft
- does not write preview values into template config
- renders the shopper canvas behavior
- renders form fields in Form order
- lets admins test text, font/color policies, image upload, crop pan, and crop zoom
- closes back to the same editor selection/state

## Text UX

Text is created from `Blocks -> Text`. Admins do not choose single-line or multi-line at creation time.

### Text Inspector

Text inspector sections:

- `Position & Size`
  - `X`, `Y`, and `W` in background pixels
  - `H` is read-only because height is derived from max lines and max font size
  - Canvas supports move and horizontal resize only
- `Typography`
  - font mode: fixed or shopper-selectable
  - color mode: fixed or shopper-selectable
  - align: left, center, right
- `Fit Rules`
  - max lines
  - min font size
  - max font size
- `Text Path`
  - straight
  - arc up
  - arc down
  - circle top
  - circle bottom
  - custom path
- `Sample`
  - sample/default render text for admin layout testing

### Text Fitting

Text runtime rules:

- Shopper text cannot render more than `maxLines`.
- Renderer fits from max font size down to min font size.
- If the text still does not fit, overflow is trimmed silently.
- No warning is shown for trimmed overflow.
- Text never renders outside its allowed fit area/path.

### Text Path

Path behavior:

- Any path text forces `maxLines = 1`.
- `Arc up/down` use a curve amount control.
- `Circle top/bottom` use a radius control.
- `Custom path` uses polyline/Bezier points.
- Admin can enter path edit mode from an `Edit path` inspector button or by double-clicking the text/path on canvas.
- In path edit mode:
  - click creates anchor points
  - drag anchor points to move them
  - drag handles to adjust curvature
  - Done or Esc exits path editing
  - block move/resize is paused
- Alignment follows path length:
  - left aligns near the path start
  - center aligns around the path midpoint
  - right aligns near the path end

## Image Shape UX

Image Shape is created from `Blocks -> Image Shapes`.

V1 shape types:

- rectangle
- circle
- ellipse
- rounded rectangle
- star
- heart

After creation, shape type cannot be changed. To use a different shape, admins create a new layer and delete the old one.

### Image Shape Inspector

Image Shape inspector sections:

- `Position & Size`
  - `X`, `Y`, `W`, and `H` in background pixels
- `Shape`
  - readonly shape type
  - lock aspect ratio
- `Crop Behavior`
  - fixed cover fit
  - clip to shape

Aspect lock defaults:

- On by default for circle, star, and heart.
- Off by default for rectangle, ellipse, and rounded rectangle.

### Canvas Shape Editing

Admin edit mode changes the shape geometry, not the shopper image crop.

- Aspect lock on: corner handles only, uniform resize.
- Aspect lock off: corner handles and side handles, free width/height resize.
- The editor uses a muted fill/outline for visibility only. Shape fill/stroke is not a published property.

### Shopper Crop Behavior

Shopper/admin preview crop rules:

- Uploaded images render cover-fit into the admin-defined shape.
- Overflow clips to the shape.
- Users may pan inside the clipped shape.
- Users may scale/zoom uniformly.
- Users cannot stretch horizontally or vertically.
- Crop state stores only uniform scale and pan ratios.
- Crop handles in preview are corner handles or a zoom control, never side stretch handles.

## Model

The new model separates background, layers, and form fields.

```ts
type CustomizationTemplate = {
  id: string;
  productId: string;
  name: string;
  revision: number;
  status: "draft" | "published";
  background: BackgroundAsset | null;
  layers: CustomizationLayer[];
  formFields: CustomizationFormField[];
};
```

### Background

```ts
type BackgroundAsset = {
  assetId: string;
  previewUrl: string;
  filename?: string;
  mimeType?: string;
  widthPx: number;
  heightPx: number;
};
```

There is exactly one background per template in v1.

### Layers

Layers own visual/editor state:

- id
- name
- type
- hidden
- locked
- zIndex
- geometry
- type-specific render config

`locked` is editor-only. It does not affect storefront or production output.

V1 has no layer groups.

```ts
type LayerGeometry = {
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio?: number;
  rotationDeg: number;
};
```

Text layers:

```ts
type TextLayer = {
  id: string;
  name: string;
  type: "text";
  hidden: boolean;
  locked: boolean;
  zIndex: number;
  geometry: {
    xRatio: number;
    yRatio: number;
    widthRatio: number;
    rotationDeg: number;
  };
  text: {
    sampleText: string;
    maxLines: number;
    minFontSizePt: number;
    maxFontSizePt: number;
    align: "left" | "center" | "right";
    colorPolicy: TextColorPolicy;
    fontPolicy: TextFontPolicy;
    path: TextPath;
  };
};
```

Image shape layers:

```ts
type ImageShapeLayer = {
  id: string;
  name: string;
  type: "image_shape";
  hidden: boolean;
  locked: boolean;
  zIndex: number;
  geometry: {
    xRatio: number;
    yRatio: number;
    widthRatio: number;
    heightRatio: number;
    rotationDeg: number;
  };
  shape: {
    type: "rectangle" | "circle" | "ellipse" | "rounded_rectangle" | "star" | "heart";
    lockAspectRatio: boolean;
  };
  upload: {
    fit: "cover";
    defaultCrop?: ImageCrop;
  };
};
```

### Text Policies

```ts
type TextColorPolicy =
  | { mode: "fixed"; color: string }
  | { mode: "shopper_selectable"; defaultColor: string; options: Array<{ value: string; label: string; swatch?: string }> };

type TextFontPolicy =
  | { mode: "fixed"; fontId: string }
  | { mode: "shopper_selectable"; defaultFontId: string; options: Array<{ value: string; label: string }> };
```

### Text Paths

```ts
type TextPath =
  | { type: "straight" }
  | { type: "arc_up"; curveAmount: number }
  | { type: "arc_down"; curveAmount: number }
  | { type: "circle_top"; radiusRatio: number }
  | { type: "circle_bottom"; radiusRatio: number }
  | { type: "custom"; points: BezierPoint[] };

type BezierPoint = {
  id: string;
  xRatio: number;
  yRatio: number;
  inHandle?: { xRatio: number; yRatio: number };
  outHandle?: { xRatio: number; yRatio: number };
};
```

### Form Fields

Form fields own shopper-facing form state:

```ts
type CustomizationFormField = {
  id: string;
  layerId: string;
  label: string;
  helpText?: string;
  placeholder?: string;
  required: boolean;
  order: number;
};
```

V1 has one form field per renderable layer. This keeps the shopper form explicit while allowing visual layer stack and form order to evolve separately.

### Shopper Values

Text values:

```ts
type TextFieldValue = {
  text: string;
  color?: string;
  fontId?: string;
};
```

Image shape values:

```ts
type ImageShapeFieldValue = {
  assetId: string;
  previewUrl: string;
  sourceWidthPx: number;
  sourceHeightPx: number;
  cropScale?: number;
  cropXRatio?: number;
  cropYRatio?: number;
};
```

Crop scale is always uniform.

## Validation

Publish validation:

- background is required
- every renderable layer must have a matching form field
- every form field must reference an existing layer
- text min font size must be less than or equal to max font size
- path text must have max lines equal to 1
- shopper-selectable text color/font policies must have valid defaults and non-empty options
- hidden layers are excluded from published form, render, validation, and output

Runtime validation:

- shopper color/font choices must match the layer policy
- image crop scale is clamped and uniform
- image crop pan is clamped to the clipped shape bounds
- text overflow is trimmed silently rather than failing validation

## Delete And Shortcuts

Delete behavior:

- Delete/Backspace deletes the selected layer immediately.
- A toast offers Undo.
- Undo restores the layer, form field, visual stack order, form order, properties, and selection.

Keyboard shortcuts:

- Delete/Backspace: delete selected layer
- Cmd/Ctrl+Z: undo most recent delete
- Esc: clear selection or exit path edit mode
- Arrow keys: nudge selected layer by 1 px
- Shift+Arrow: nudge selected layer by 10 px

## Verification Plan

Shared package tests:

- visual layer stack is separate from form order
- hidden layers are excluded from form, render, validation, and output
- text path forces one line
- text fit trims overflow silently
- image shape crop uses uniform scale
- image crop metadata preserves cover clip behavior

Admin verification:

- `pnpm --filter admin build`

Shared package verification:

- `pnpm --filter customization test`

Storefront verification, when runtime is updated:

- `pnpm --filter router-cf build`
- `pnpm --filter router-cf typecheck`

Backend verification, when persistence/API changes:

- `pnpm --filter backend build`
- `pnpm --filter backend check`

Final repo verification:

- `./init.sh`

End-of-session artifacts must be updated:

- `feature_list.json`
- `progress.md`
- `session-handoff.md`
