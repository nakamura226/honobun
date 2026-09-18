import { zValidator } from '@hono/zod-validator'
import { streamText, type CoreMessage } from 'ai'
import { Hono } from 'hono'
import { z } from 'zod'

import { providers, resolveModel } from '../llm.js'

const chatRequestSchema = z.object({
  provider: z.enum(providers),
  model: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      }),
    )
    .min(1),
})

export const chatRoute = new Hono().post(
  '/',
  zValidator('json', chatRequestSchema),
  async (c) => {
    const { provider, model, messages } = c.req.valid('json')

    const result = streamText({
      model: resolveModel(provider, model),
      messages: messages as CoreMessage[],
      onError: ({ error }) => {
        console.error('[chat] streamText error:', error)
      },
    })

    return result.toTextStreamResponse()
  },
)
