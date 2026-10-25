import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { logger } from "./lib/logger";

window.addEventListener("error", (event) => {
  logger.error({
    msg: "Unhandled global error",
    error: event.error?.message || event.message,
    stack: event.error?.stack,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logger.error({
    msg: "Unhandled promise rejection",
    reason: event.reason,
  });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
