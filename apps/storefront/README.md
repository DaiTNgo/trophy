# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5175`.

## Previewing the Production Build

Preview the production build locally:

```bash
npm run preview
```

The preview server runs at `http://localhost:4175`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

Deployment is done using the Wrangler CLI.

To build and deploy directly to production:

```sh
npm run deploy
```

To deploy a preview URL:

```sh
npx wrangler versions upload
```

You can then promote a version to production after verification or roll it out progressively.

```sh
npx wrangler versions deploy
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

## Internationalization (i18n) Configuration

To support multiple languages (e.g., Vietnamese and English) in the storefront, you should set up i18n. Here is a recommended approach for React Router v7:

1. **Libraries**:
   - `i18next`: The core translation framework.
   - `react-i18next`: React bindings for i18next.
   - `i18next-browser-languagedetector`: For detecting user language.
   - `remix-i18next` / `i18next-http-backend`: Useful for integrating i18next with Remix/React Router SSR data loaders.

2. **Setup Steps**:
   - Install the necessary dependencies: `pnpm --filter router-cf add i18next react-i18next i18next-browser-languagedetector remix-i18next i18next-http-backend`
   - Create an `i18n.ts` configuration file to define supported languages (e.g., `['en', 'vi']`), the fallback language, and namespaces.
   - Initialize `i18next` on both the client (via `entry.client.tsx`) and the server (via `entry.server.tsx`).
   - Create translation files (e.g., `public/locales/vi/common.json` and `public/locales/en/common.json`).
   - Use the `useTranslation` hook in your React components to translate text.
   - For SEO and better user experience, consider handling language switching via route params (e.g., `/:lang/products`) or utilizing HTTP cookies to remember user preferences.

3. **Cloudflare Workers Consideration**:
   - When running on Cloudflare Workers, if you use `i18next-http-backend`, ensure the translations can be fetched properly. An alternative for server-side rendering on edge is to directly import the translation JSON files into your server bundle to avoid internal network requests, which speeds up the SSR process.

---

Built with ❤️ using React Router.
