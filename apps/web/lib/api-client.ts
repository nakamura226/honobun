import { hc } from 'hono/client'
import type { AppType } from '@honobun/api'

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const apiClient = hc<AppType>(apiUrl)
