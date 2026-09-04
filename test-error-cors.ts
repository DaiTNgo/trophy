import { Hono } from 'hono'
const app = new Hono()

app.use('*', async (c, next) => {
  try {
    await next()
  } finally {
    c.header('X-Custom-Header', 'Finally Block')
  }
})

app.get('/', (c) => {
  throw new Error('Boom')
})

const req = new Request('http://localhost/')
app.fetch(req).then(res => {
  console.log('Status:', res.status)
  console.log('Headers:', Object.fromEntries(res.headers.entries()))
})
