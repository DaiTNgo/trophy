import pino from "pino";

// VITE_BACKEND_URL contains the base url (e.g., http://localhost:8787).
// If not defined, fallback to a sensible default or just origin.
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8787";

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

        // Use sendBeacon for best effort delivery without blocking unloads
        const url = `${backendUrl}/api/logs/client`;
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, blob);
        } else {
          fetch(url, {
            method: "POST",
            body: blob,
            keepalive: true,
          }).catch(() => {
            // Silently fail if fetch fails, to avoid infinite loops
          });
        }
      },
    },
  },
});
