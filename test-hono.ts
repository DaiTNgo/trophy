import { Hono } from 'hono'
const app = new Hono()

app.use('*', async (c, next) => {
  await next()
  c.header('X-Custom-Header', 'Hello World')
})

app.get('/', (c) => {
  const headers = new Headers()
  headers.set('X-Initial', '123')
  return new Response('body', { headers })
})

const req = new Request('http://localhost/')
app.fetch(req).then(res => {
  console.log('Headers:', Object.fromEntries(res.headers.entries()))
})
