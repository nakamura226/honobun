import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

export const providers = ['anthropic', 'openai', 'google'] as const
export type Provider = (typeof providers)[number]

const defaultModelIds: Record<Provider, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o-mini',
  google: 'gemini-2.0-flash',
}

export function resolveModel(provider: Provider, modelId?: string): LanguageModel {
  const id = modelId ?? defaultModelIds[provider]

  switch (provider) {
    case 'anthropic':
      return anthropic(id)
    case 'openai':
      return openai(id)
    case 'google':
      return google(id)
  }
}
