import { logger as clientLogger } from "./logger.client";
import { logger as serverLogger } from "./logger.server";

export const logger = typeof document === "undefined" ? serverLogger : clientLogger;
