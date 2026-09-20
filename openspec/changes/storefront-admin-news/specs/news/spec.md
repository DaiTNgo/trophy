## ADDED Requirements

### Requirement: Admin operators can create, update, and publish articles
The system SHALL provide authenticated admin endpoints and UI to author articles with rich text, media, categories, related products, and SEO metadata.

#### Scenario: Admin creates a draft article
- **WHEN** an authenticated operator submits a new article with a title and content
- **THEN** the system generates a unique URL slug and persists the article with status `draft`

#### Scenario: Admin uploads images within TipTap editor
- **WHEN** an operator pastes or uploads an image in the editor
- **THEN** the image is uploaded to Cloudflare R2 and inserted into the editor content with an absolute URL

#### Scenario: Admin customizes SEO metadata
- **WHEN** an operator provides custom meta title, meta description, or slug
- **THEN** the system validates the slug uniqueness and saves the custom SEO fields

#### Scenario: Admin links catalog products to an article
- **WHEN** an operator selects one or more products to feature in the article
- **THEN** the system stores the associations and exposes them for storefront rendering

#### Scenario: Admin publishes an article
- **WHEN** an operator changes article status to `published`
- **THEN** the article becomes immediately visible on public storefront endpoints

---

### Requirement: Storefront displays published news and articles with server rendering
The system SHALL provide public storefront pages for article discovery and reading with complete server-side HTML rendering for optimal SEO and performance.

#### Scenario: Shopper views news listing
- **WHEN** a shopper visits `/news`
- **THEN** the server returns a list of published articles with thumbnails, excerpts, categories, reading time, and pagination

#### Scenario: Shopper filters news by category
- **WHEN** a shopper selects a category on `/news?category=kien-thuc`
- **THEN** the listing returns only articles belonging to that category

#### Scenario: Shopper reads an article by slug
- **WHEN** a shopper navigates to `/news/:slug`
- **THEN** the server renders the full article content, automatic Table of Contents, author details, and related products

#### Scenario: Draft article is not accessible publicly
- **WHEN** a shopper requests `/news/:slug` for an article that is still in `draft` status
- **THEN** the storefront returns a 404 Not Found response

---

### Requirement: Search engine optimization and structured data markup
The system SHALL output comprehensive search metadata and Schema.org JSON-LD for every article.

#### Scenario: Article page outputs OpenGraph and Twitter cards
- **WHEN** search crawlers or social bots request `/news/:slug`
- **THEN** the HTML head includes `og:title`, `og:description`, `og:image`, `og:type=article`, and `twitter:card=summary_large_image`

#### Scenario: Article page outputs Schema.org JSON-LD
- **WHEN** search engines parse `/news/:slug`
- **THEN** an embedded `<script type="application/ld+json">` provides `Article` and `BreadcrumbList` schemas

#### Scenario: Auto-generated Table of Contents enables anchor jump links
- **WHEN** the storefront renders article headings (`<h2>`, `<h3>`)
- **THEN** each heading receives a kebab-case anchor ID matching the Table of Contents links
