import type { DynamicFontFamily } from "@trophy/customization";
import { ProductCustomizationPreview } from "@trophy/customization-react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import type { useProductDetailState } from "../../hooks/use-product-detail-state";
import { backendFontUrl, backendStaticFontUrl } from "../../lib/api";
import { getLocalized } from "../../lib/translation";
import Container from "../container";
import { QuantityInput } from "../ui/quantity-input";
import { ProductBreadcrumbs } from "./ProductBreadcrumbs";
import { ProductCustomizationPurchase } from "./ProductCustomizationPurchase";
import { ProductGallery, ProductGalleryThumbnails } from "./ProductGallery";
import { ProductDetailSections, ProductInfo } from "./ProductInfo";
import { ProductOptionGroups } from "./ProductOptionGroups";

export function ProductDetailLayout({
  state,
}: {
  state: ReturnType<typeof useProductDetailState>;
}) {
  const {
    activeCategory,
    addToCartDisabled,
    addToCartMessage,
    contactHref,
    customizationTemplate,
    customizationValues,
    dynamicFonts,
    displayPrice,
    galleryThumbnails,
    handleAddToCart,
    isOptionValueAvailable,
    isAtPageTop,
    isMobilePreviewAutoRestoreArmed,
    isMobilePreviewHidden,
    isMobilePreviewSticky,
    locale,
    mainMedia,
    message,
    mobileGalleryThumbnails,
    mobileHiddenShellHeight,
    mobilePreviewSentinelRef,
    mobilePreviewShellRef,
    moveSelectedMedia,
    onOptionSelect,
    previewSectionRef,
    product,
    quantity,
    resetToCustomizationMedia,
    revisionNotice,
    selectedMedia,
    selectedVariant,
    selectedVariantMedia,
    selectedOptionValueIds,
    setCustomizationValues,
    setIsMobilePreviewAutoRestoreArmed,
    setIsMobilePreviewHidden,
    setMessage,
    setMobileHiddenShellHeight,
    setQuantity,
    shortDescription,
    specs,
    uploadCustomizationImage,
    visibleOptions,
  } = state;
  const optionGroups = (
    <ProductOptionGroups
      options={visibleOptions}
      selectedOptionValueIds={selectedOptionValueIds}
      locale={locale}
      isAvailable={isOptionValueAvailable}
      onSelect={onOptionSelect}
    />
  );
  const galleryMediaFrameClassName =
    "h-[clamp(240px,42svh,380px)] lg:h-[min(72vh,740px)] lg:min-h-[520px]";

  const previewNode = customizationTemplate ? (
    <ProductCustomizationPreview
      template={customizationTemplate}
      values={customizationValues}
      dynamicFonts={dynamicFonts as DynamicFontFamily[]}
      watermark
      className={`border-0 min-h-0 rounded-none ${galleryMediaFrameClassName}`}
      viewportClassName="bg-white bg-none"
      resolveFontUrl={backendFontUrl}
      resolveStaticFontUrl={backendStaticFontUrl}
      selectedVariantId={selectedVariant?.id ?? null}
      onImageValueChange={(fieldId, value) => {
        setCustomizationValues((current) => ({ ...current, [fieldId]: value }));
      }}
    />
  ) : null;
  const isCustomizationMediaActive = Boolean(
    customizationTemplate &&
    selectedMedia?.id === selectedVariant?.customizationMedia?.id,
  );
  const galleryImageNode = mainMedia?.contentUrl ? (
    <div
      className={`flex items-center justify-center bg-white p-6 ${galleryMediaFrameClassName}`}
    >
      <img
        className="h-full w-full object-contain transition-transform duration-700"
        src={mainMedia.contentUrl}
        alt={getLocalized(product.title, locale)}
      />
    </div>
  ) : (
    <div
      className={`flex items-center justify-center bg-white text-on-surface-variant ${galleryMediaFrameClassName}`}
    >
      Product image unavailable
    </div>
  );
  // Keep the customization canvas mounted while gallery media is visible. Its
  // mount effect measures and fits the canvas, so replacing it with an image
  // made the shared media frame repaint and jump on every media change.
  const selectedMediaStage = customizationTemplate ? (
    <div
      className={`relative isolate overflow-hidden ${galleryMediaFrameClassName}`}
    >
      <div
        aria-hidden={!isCustomizationMediaActive || undefined}
        className={`absolute inset-0 ${
          isCustomizationMediaActive
            ? "z-10"
            : "pointer-events-none invisible z-0"
        }`}
      >
        {previewNode}
      </div>
      <div
        aria-hidden={isCustomizationMediaActive || undefined}
        className={`absolute inset-0 ${
          isCustomizationMediaActive
            ? "pointer-events-none invisible z-0"
            : "z-10"
        }`}
      >
        {galleryImageNode}
      </div>
    </div>
  ) : (
    galleryImageNode
  );
  const shouldShowHiddenPreviewBar = isMobilePreviewHidden && !isAtPageTop;
  const mobilePreviewShellMinHeight = shouldShowHiddenPreviewBar
    ? (mobileHiddenShellHeight ?? undefined)
    : undefined;

  return (
    <div className="bg-white font-body-md text-on-surface">
      <ProductBreadcrumbs
        title={getLocalized(product.title, locale)}
        categoryTitle={activeCategory ? getLocalized(activeCategory.name, locale) : null}
        categoryHandle={activeCategory?.handle}
      />
      <Container className="py-8">
        {revisionNotice ? (
          <p
            className="mb-5 border border-border-subtle bg-surface-subtle px-4 py-3 text-sm text-text-base"
            role="status"
          >
            {revisionNotice}
          </p>
        ) : null}
        <div ref={previewSectionRef} className="h-0" aria-hidden />
        {customizationTemplate ? (
          <>
            <div className="lg:hidden">
              <div
                ref={mobilePreviewSentinelRef}
                className="h-px"
                aria-hidden
              />
              <div
                ref={mobilePreviewShellRef}
                className="sticky top-0 z-[70]"
                style={
                  mobilePreviewShellMinHeight
                    ? { minHeight: `${mobilePreviewShellMinHeight}px` }
                    : undefined
                }
              >
                {shouldShowHiddenPreviewBar ? (
                  <div className="rounded-b-2xl border border-border-subtle bg-white/96 px-4 py-3 shadow-[0_20px_48px_rgba(24,22,26,0.12)] backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobilePreviewHidden(false);
                        setIsMobilePreviewAutoRestoreArmed(false);
                        setMobileHiddenShellHeight(null);
                      }}
                      className="flex w-full items-center justify-center gap-2 text-sm font-bold uppercase tracking-[0.1em] text-brand-strong"
                    >
                      <ChevronDown className="size-4" />
                      Show preview
                    </button>
                  </div>
                ) : (
                  <section
                    className={`overflow-hidden border border-border-subtle bg-white shadow-[0_18px_48px_rgba(24,22,26,0.08)] ${
                      isMobilePreviewSticky
                        ? "rounded-b-2xl shadow-[0_22px_56px_rgba(24,22,26,0.12)]"
                        : "rounded-2xl"
                    }`}
                    data-selected-variant-id={selectedVariant?.id ?? ""}
                  >
                    <div className="relative">
                      {selectedVariantMedia.length > 1 ? (
                        <>
                          <button
                            type="button"
                            aria-label="Previous product image"
                            onClick={() => moveSelectedMedia(-1)}
                            className="absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-white/90 shadow-sm"
                          >
                            <ChevronLeft className="size-5 text-text-base" />
                          </button>
                          <button
                            type="button"
                            aria-label="Next product image"
                            onClick={() => moveSelectedMedia(1)}
                            className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-white/90 shadow-sm"
                          >
                            <ChevronRight className="size-5 text-text-base" />
                          </button>
                        </>
                      ) : null}
                      {selectedMediaStage}
                    </div>
                    <ProductGalleryThumbnails
                      thumbnails={mobileGalleryThumbnails}
                    />
                    {isMobilePreviewSticky ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileHiddenShellHeight(
                            mobilePreviewShellRef.current?.getBoundingClientRect()
                              .height ?? null,
                          );
                          setIsMobilePreviewHidden(true);
                          setIsMobilePreviewAutoRestoreArmed(false);
                        }}
                        className="flex w-full items-center justify-center gap-2 border-t border-border-subtle bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.1em] text-brand-strong"
                      >
                        Hide preview
                        <ChevronUp className="size-4" />
                      </button>
                    ) : null}
                  </section>
                )}
              </div>
              <div className="mt-6">
                <ProductInfo
                  title={getLocalized(product.title, locale)}
                  price={displayPrice}
                  rating={5}
                  reviewsCount={0}
                  description={shortDescription}
                  variantSelector={
                    visibleOptions.length > 0 ? (
                      <div className="space-y-4">{optionGroups}</div>
                    ) : null
                  }
                  customizationSection={
                    <ProductCustomizationPurchase
                      template={customizationTemplate}
                      values={customizationValues}
                      dynamicFonts={dynamicFonts as DynamicFontFamily[]}
                      message={message}
                      quantity={quantity}
                      onQuantityChange={setQuantity}
                      onMessageChange={setMessage}
                      onUploadImage={uploadCustomizationImage}
                      onValueChange={(fieldId, value) => {
                        setCustomizationValues((current) => ({
                          ...current,
                          [fieldId]: value,
                        }));
                      }}
                      onInteraction={resetToCustomizationMedia}
                    />
                  }
                  isContactPrice={selectedVariant?.priceAmount === null}
                  contactHref={contactHref}
                  primaryActionLabel="Add to Cart"
                  primaryActionDisabled={addToCartDisabled}
                  primaryActionMessage={addToCartMessage}
                  previewRef={previewSectionRef}
                  onPrimaryAction={handleAddToCart}
                  flatCustomization
                />
              </div>
            </div>

            <div className="hidden grid-cols-1 gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start xl:grid-cols-[minmax(0,1fr)_480px]">
              <ProductGallery
                customizable
                onPrevious={() => moveSelectedMedia(-1)}
                onNext={() => moveSelectedMedia(1)}
                mainContent={
                  <section data-selected-variant-id={selectedVariant?.id ?? ""}>
                    {selectedMediaStage}
                  </section>
                }
                thumbnails={galleryThumbnails}
              />
              <ProductInfo
                title={getLocalized(product.title, locale)}
                price={displayPrice}
                rating={5}
                reviewsCount={0}
                description={shortDescription}
                variantSelector={
                  visibleOptions.length > 0 ? (
                    <div className="space-y-4">{optionGroups}</div>
                  ) : null
                }
                customizationSection={
                  <ProductCustomizationPurchase
                    template={customizationTemplate}
                    values={customizationValues}
                    dynamicFonts={dynamicFonts as DynamicFontFamily[]}
                    message={message}
                    quantity={quantity}
                    onQuantityChange={setQuantity}
                    onMessageChange={setMessage}
                    onUploadImage={uploadCustomizationImage}
                    onValueChange={(fieldId, value) => {
                      setCustomizationValues((current) => ({
                        ...current,
                        [fieldId]: value,
                      }));
                    }}
                    onInteraction={resetToCustomizationMedia}
                  />
                }
                isContactPrice={selectedVariant?.priceAmount === null}
                contactHref={contactHref}
                primaryActionLabel="Add to Cart"
                primaryActionDisabled={addToCartDisabled}
                primaryActionMessage={addToCartMessage}
                previewRef={previewSectionRef}
                onPrimaryAction={handleAddToCart}
                flatCustomization
              />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start xl:grid-cols-[minmax(0,1fr)_480px]">
            <ProductGallery
              onPrevious={
                selectedVariantMedia.length > 1
                  ? () => moveSelectedMedia(-1)
                  : undefined
              }
              onNext={
                selectedVariantMedia.length > 1
                  ? () => moveSelectedMedia(1)
                  : undefined
              }
              mainContent={galleryImageNode}
              thumbnails={galleryThumbnails}
            />
            <ProductInfo
              title={getLocalized(product.title, locale)}
              price={displayPrice}
              rating={5}
              reviewsCount={0}
              description={shortDescription}
              variantSelector={
                visibleOptions.length > 0 ? (
                  <div className="space-y-4">{optionGroups}</div>
                ) : null
              }
              customizationSection={
                // <QuantityOnlySection quantity={quantity} setQuantity={setQuantity} />
                <QuantityInput
                  value={quantity}
                  min={1}
                  max={99}
                  onValueChange={(next) => setQuantity(next)}
                />
              }
              isContactPrice={selectedVariant?.priceAmount === null}
              contactHref={contactHref}
              primaryActionLabel="Add to Cart"
              primaryActionDisabled={addToCartDisabled}
              primaryActionMessage={addToCartMessage}
              previewRef={previewSectionRef}
              onPrimaryAction={handleAddToCart}
            />
          </div>
        )}
        {/*

        <ProductMobileActionBar
          price={displayPrice}
          label="Add to Cart"
          disabled={addToCartDisabled}
          onClick={handleAddToCart}
          contactHref={selectedVariant?.priceAmount === null ? contactHref : undefined}
        />
          */}
        <ProductDetailSections
          description={getLocalized(product.description, locale) || ""}
          specs={specs}
        />
      </Container>
    </div>
  );
}
