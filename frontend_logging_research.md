# Frontend Logging Libraries Research (React/TypeScript)

This document evaluates high-quality, popular open-source options for logging in modern frontend applications (JavaScript/TypeScript/React). It focuses on universal and client-specific loggers, evaluating them across several key features based on official documentation and community standards.

## 1. Top Open-Source Candidates

Based on current ecosystem usage, three libraries stand out for React and TypeScript applications:

1. **tslog** ([tslog.js.org](https://tslog.js.org/))
2. **Pino** ([getpino.io](https://getpino.io/))
3. **loglevel** ([github.com/pimterry/loglevel](https://github.com/pimterry/loglevel))

*(Note: While tools like Sentry or Datadog are standard for observability, they are often used alongside or instead of internal logging libraries for error tracking. This research focuses strictly on open-source logging libraries.)*

---

## 2. Feature Evaluation

### Log Levels
All three libraries support standard log levels (e.g., `trace`, `debug`, `info`, `warn`, `error`, `fatal`).
* **loglevel**: Provides a very simple, standard set of levels mirroring the `console` API. It allows enabling/disabling levels globally or per-logger.
* **tslog**: Offers fully customizable log levels and pretty-printing (colorized output) for development, with robust TypeScript support.
* **Pino**: Follows standard levels but focuses heavily on high-performance structured JSON logging by default.

### Transports (Sending to Backend)
Sending logs from the browser to an external service or backend requires "transports" or plugins.
* **Pino**: Has a built-in `browser` configuration property where you can specify a `transmit` function to send logs to a server using `fetch` or `sendBeacon`.
* **loglevel**: Being minimalist, it requires a plugin like `loglevel-plugin-remote` to push logs to a server URL.
* **tslog**: Supports custom transports allowing you to easily write a function that forwards JSON logs to your backend API.

### Error Boundary Integration (React)
React Error Boundaries can easily integrate with any of these loggers using the `componentDidCatch` lifecycle method (or `onError` if using `react-error-boundary`).
* **Usage**: You simply import the configured logger instance into your boundary component and call `logger.error()`.
* **Context**: It is highly recommended to pass `info.componentStack` along with the `error` object so the structured log retains the React tree context. All three libraries handle passing arbitrary object metadata elegantly (especially Pino and tslog).

### Performance and Bundle Size
* **loglevel**: **~1.4 KB** minified and gzipped. It is the best choice if bundle size is the absolute priority and you just need basic level filtering.
* **tslog**: Zero dependencies, making it very lean for what it offers. It balances rich features (like correlation IDs, masking, and pretty-printing) with a reasonable footprint.
* **Pino**: Extremely fast and low-overhead, though primarily designed for Node.js. When used in the browser via its browser-specific build, it remains relatively lightweight, but setup is slightly more involved than `loglevel`.

### Maintenance Status
* **Pino**: Backed by a massive community and heavily maintained as an industry standard.
* **loglevel**: Very stable, mature, and actively maintained for bug fixes. Because its scope is small, it doesn't need frequent large feature updates.
* **tslog**: Actively maintained and highly regarded in the modern TypeScript ecosystem for its developer experience.

---

## 3. Recommendations

1. **For the best TypeScript experience and local developer tooling**: Use **`tslog`**. Its dual ability to provide pretty console output locally and structured JSON in production is ideal for modern React.
2. **For performance and backend consistency**: If your backend already uses **`Pino`**, using Pino's browser logger provides a unified logging API across the full stack.
3. **For absolute minimal bundle size**: Use **`loglevel`**. It's perfect if you just want to silence `console.debug` in production without adding weight to your app.

### Sources
* [tslog Documentation](https://tslog.js.org/)
* [Pino Browser API](https://getpino.io/#/docs/browser)
* [loglevel GitHub Repository](https://github.com/pimterry/loglevel)
* [react-error-boundary](https://www.npmjs.com/package/react-error-boundary)
