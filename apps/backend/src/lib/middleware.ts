import { createMiddleware } from 'hono/factory';
import type { AppEnv } from './env';
import { getAuth } from './auth';

export const requireAdminSession = createMiddleware<AppEnv>(async (c, next) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'super-admin')) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  await next();
});
