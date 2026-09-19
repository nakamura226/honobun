import { attachments, db, messages } from '@honobun/db'
import { zValidator } from '@hono/zod-validator'
import { streamText, type CoreMessage } from 'ai'
import { asc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import { providers, resolveModel } from '../llm.js'

const chatRequestSchema = z.object({
  conversationId: z.number().int().positive(),
  provider: z.enum(providers),
  model: z.string().optional(),
  content: z.string().min(1),
  attachmentKeys: z.array(z.string()).default([]),
})

export const chatRoute = new Hono().post(
  '/',
  zValidator('json', chatRequestSchema),
  async (c) => {
    const { conversationId, provider, model, content, attachmentKeys } = c.req.valid('json')

    const history = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: asc(messages.createdAt),
    })

    const [userMessage] = await db
      .insert(messages)
      .values({ conversationId, role: 'user', content })
      .returning()

    if (!userMessage) {
      throw new Error('Failed to insert user message')
    }

    if (attachmentKeys.length > 0) {
      await db.insert(attachments).values(
        attachmentKeys.map((objectKey) => ({
          messageId: userMessage.id,
          objectKey,
        })),
      )
    }

    // 画像添付はLLMへの入力(マルチモーダル)としては渡さず、保存・表示のみに利用する
    const coreMessages: CoreMessage[] = [
      ...history.map(
        (m): CoreMessage => ({ role: m.role, content: m.content }),
      ),
      { role: 'user', content },
    ]

    const result = streamText({
      model: resolveModel(provider, model),
      messages: coreMessages,
      onError: ({ error }) => {
        console.error('[chat] streamText error:', error)
      },
      onFinish: async ({ text }) => {
        await db.insert(messages).values({
          conversationId,
          role: 'assistant',
          provider,
          content: text,
        })
      },
    })

    return result.toTextStreamResponse()
  },
)
