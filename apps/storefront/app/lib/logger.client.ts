import pino from "pino";

// Since it's storefront client, it talks to the backend on /api/logs/client
const backendUrl = "/api/logs/client";

export const logger = pino({
  level: "debug",
  browser: {
    asObject: true,
    transmit: {
      level: "warn",
      send: (_level, logEvent) => {
        const payload = [
          {
            ts: logEvent.ts,
            messages: logEvent.messages,
            bindings: logEvent.bindings,
            level: {
              label: logEvent.level.label,
              value: logEvent.level.value,
            },
          },
        ];

        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        
        if (navigator.sendBeacon) {
          navigator.sendBeacon(backendUrl, blob);
        } else {
          fetch(backendUrl, {
            method: "POST",
            body: blob,
            keepalive: true,
          }).catch(() => {});
        }
      },
    },
  },
});

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
