import pino from "pino";

/**
 * Browser logger that forwards warnings and errors to the backend log endpoint at `endpoint`,
 * via sendBeacon so delivery does not block page unloads.
 */
export function createClientLogger(endpoint: string) {
  return pino({
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
            navigator.sendBeacon(endpoint, blob);
          } else {
            fetch(endpoint, {
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
}
