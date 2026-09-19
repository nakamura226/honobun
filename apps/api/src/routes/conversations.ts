import { conversations, db, messages } from '@honobun/db'
import { zValidator } from '@hono/zod-validator'
import { asc, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import { createDownloadUrl } from '../gcs.js'

export const conversationsRoute = new Hono()
  .post('/', zValidator('json', z.object({ title: z.string().min(1).optional() })), async (c) => {
    const { title } = c.req.valid('json')
    const [conversation] = await db
      .insert(conversations)
      .values(title ? { title } : {})
      .returning()

    return c.json(conversation)
  })
  .get('/', async (c) => {
    const rows = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.createdAt))

    return c.json(rows)
  })
  .get('/:id/messages', async (c) => {
    const conversationId = Number(c.req.param('id'))

    const rows = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: asc(messages.createdAt),
      with: { attachments: true },
    })

    const withUrls = await Promise.all(
      rows.map(async (message) => ({
        ...message,
        attachments: await Promise.all(
          message.attachments.map(async (attachment) => ({
            ...attachment,
            url: await createDownloadUrl(attachment.objectKey),
          })),
        ),
      })),
    )

    return c.json(withUrls)
  })
