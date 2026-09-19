import { randomUUID } from 'node:crypto'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { createUploadUrl } from '../gcs.js'

const signUploadSchema = z.object({
  conversationId: z.number().int().positive(),
  fileName: z.string().min(1),
  contentType: z.string().regex(/^image\//, '画像ファイルのみアップロードできます'),
})

export const uploadsRoute = new Hono().post(
  '/sign-upload',
  zValidator('json', signUploadSchema),
  async (c) => {
    const { conversationId, fileName, contentType } = c.req.valid('json')

    const objectKey = `chat-uploads/${conversationId}/${randomUUID()}-${fileName}`
    const uploadUrl = await createUploadUrl(objectKey, contentType)

    return c.json({ uploadUrl, objectKey })
  },
)
