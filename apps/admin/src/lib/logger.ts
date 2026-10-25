import { createClientLogger } from "@trophy/client-logger";

// VITE_BACKEND_URL contains the base url (e.g., http://localhost:8787).
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8787";

export const logger = createClientLogger(`${backendUrl}/api/logs/client`);
