# Bilingual Catalog Localization

Trophy will model Vietnamese and English catalog text as localized content attached to language-neutral catalog records. Product, category, collection, option, option value, attribute, and shopper-facing customization labels keep one canonical identity, while their display text can have `vi` and `en` values. Prices remain VND-only and are not part of localization.

**Considered Options**

- Add `_vi` and `_en` columns to every table with shopper-facing text. This is simple for the first few fields but spreads localization rules across many schemas and becomes awkward for nested customization JSON.
- Store translation maps as JSON in each owning table. This keeps writes local but makes querying, validation, and completeness checks inconsistent across record types.
- Use a shared translation table keyed by owner type, owner ID, field name, and locale. This is the chosen direction because it keeps catalog identity language-neutral, supports uniform validation/read-model hydration, and can cover both table-backed records and nested customization labels.

**Consequences**

Admin route surfaces must hydrate and save localized catalog content alongside the canonical records they manage. Admin route surfaces and Storefront route surfaces will both return the full localized text object (`LocalizedTextValue`: `{ vi?: string, en?: string }`). Storefront API endpoints no longer resolve localization down to a string on the backend to avoid redundant API calls. Instead, the React Storefront UI is responsible for deriving the final display string based on the user's active locale (using helpers like `getLocalized`). Variant generation, option selection, category links, handles, prices, order snapshots, and customization geometry must continue to use canonical IDs and VND prices rather than localized text.

Product field requirements are field-specific. Product title requires Vietnamese (`vi`) text only; English (`en`) title is optional. Product subtitle and product description are optional in both locales. The backend must not block draft save or publish solely because product title `en`, subtitle, or description is empty.

**API Payload Convention (Storefront & Admin)**

All displayable catalog strings (e.g., `title`, `subtitle`, `description`, `name`) are returned as objects of type `LocalizedTextValue`:
```typescript
type LocalizedTextValue = {
  vi?: string;
  en?: string;
} | string | null;
```

- **Backend / API Layer**: The backend retrieves these via `hydrateTranslations()` and sends the entire object down. It does NOT filter or select a specific language based on a `?locale=` query parameter.
- **Frontend / UI Layer**: Any React component that renders these fields must use the `getLocalized(value, locale)` helper.
  - *Example*: `<h1>{getLocalized(product.title, currentLocale)}</h1>`
  - *Error Prevention*: Passing `product.title` directly to React will result in a crash (`Objects are not valid as a React child`).
