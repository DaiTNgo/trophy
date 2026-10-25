import { Hono } from "hono";
import type { AppEnv } from "../lib/env";
import * as v from "valibot";

const pinoPayloadSchema = v.array(
  v.object({
    ts: v.number(),
    messages: v.array(v.any()),
    bindings: v.array(v.any()),
    level: v.object({
      label: v.string(),
      value: v.number()
    })
  })
);

export const logsRoute = new Hono<AppEnv>()
  .post("/client", async (c) => {
    let rawPayload;
    try {
      rawPayload = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }
    
    const parseResult = v.safeParse(pinoPayloadSchema, rawPayload);
    if (!parseResult.success) {
      return c.json({ error: "Invalid payload format" }, 400);
    }
    const payload = parseResult.output;

    
    // Process logs from frontend
    for (const log of payload) {
      const { level, messages, ts } = log;
      const logStr = JSON.stringify({
        source: "client",
        level: level.label,
        timestamp: new Date(ts).toISOString(),
        messages
      });
      
      // We will just print to stdout for now. If backend adopts pino globally, we can use the global logger.
      if (level.value >= 50) { // error
        console.error(logStr);
      } else if (level.value >= 40) { // warn
        console.warn(logStr);
      } else {
        console.log(logStr);
      }
    }
    
    return c.json({ ok: true });
  });
