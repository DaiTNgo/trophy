const { Hono } = require('hono');
const app = new Hono();
app.use('*', async (c, next) => {
  await next();
  c.header('x-custom-cors', 'hello');
});
app.get('/test1', (c) => c.text('hello'));
app.get('/test2', (c) => {
  const headers = new Headers();
  headers.set('x-route', 'route');
  return new Response('body', { headers });
});
app.request('/test1').then(async r => {
  console.log('/test1:', r.headers.get('x-custom-cors'));
});
app.request('/test2').then(async r => {
  console.log('/test2:', r.headers.get('x-custom-cors'));
});
