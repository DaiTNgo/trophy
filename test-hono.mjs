import { Hono } from 'npm:hono';
const app = new Hono();
app.use('*', async (c, next) => {
  await next();
  c.header('x-test', 'success');
});
app.get('/throw', () => { throw new Error('boom'); });
const req = new Request('http://localhost/throw');
const res = await app.fetch(req);
console.log('Status:', res.status);
console.log('Header x-test:', res.headers.get('x-test'));
