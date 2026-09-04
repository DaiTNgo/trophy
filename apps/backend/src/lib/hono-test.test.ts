import { describe, it, expect } from "vitest";
import { Hono } from "hono";

describe("Hono middleware", () => {
  it("appends headers even on error", async () => {
    const app = new Hono();
    app.use('*', async (c, next) => {
      await next();
      c.header('x-test', 'success');
    });
    app.get('/throw', () => { throw new Error('boom'); });
    const res = await app.request('/throw');
    expect(res.status).toBe(500);
    expect(res.headers.get('x-test')).toBe('success');
  });
});
