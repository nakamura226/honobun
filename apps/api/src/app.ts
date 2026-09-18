import { Hono } from 'hono'
import { cors } from 'hono/cors'

const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3001'

const app = new Hono()
  .use('*', cors({ origin: webOrigin }))
  .get('/', (c) => {
    return c.text('Hello Hono!')
  })
  .get('/health', (c) => {
    return c.json({ status: 'ok' as const })
  })

export type AppType = typeof app

export default app
