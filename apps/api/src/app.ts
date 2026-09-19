import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { chatRoute } from './routes/chat.js'
import { conversationsRoute } from './routes/conversations.js'
import { uploadsRoute } from './routes/uploads.js'

const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3001'

const app = new Hono()
  .use('*', cors({ origin: webOrigin }))
  .get('/', (c) => {
    return c.text('Hello Hono!')
  })
  .get('/health', (c) => {
    return c.json({ status: 'ok' as const })
  })
  .route('/api/chat', chatRoute)
  .route('/api/conversations', conversationsRoute)
  .route('/api/uploads', uploadsRoute)

export type AppType = typeof app

export default app
