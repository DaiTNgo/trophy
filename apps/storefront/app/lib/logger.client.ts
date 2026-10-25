import { createClientLogger } from "@trophy/client-logger";

export const logger = createClientLogger("/api/logs/client");

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
