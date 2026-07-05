import { createMiddleware } from 'hono/factory';
import type { AppEnv } from './env';
import { getAdminSession } from './admin-session';

export const requireAdminSession = createMiddleware<AppEnv>(async (c, next) => {
  const session = await getAdminSession(c.env, c.req.raw.headers);

  if (!session?.user) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  await next();
});
