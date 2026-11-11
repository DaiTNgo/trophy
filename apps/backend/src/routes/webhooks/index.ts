import { Hono } from "hono";
import type { AppEnv } from "../../lib/env";
import { jetpayBankhubWebhookRoute } from "./jetpay-bankhub";

/** Public, server-to-server callbacks from external providers (no session, no CORS). */
export const webhooksRoute = new Hono<AppEnv>().route("/jetpay-bankhub", jetpayBankhubWebhookRoute);
