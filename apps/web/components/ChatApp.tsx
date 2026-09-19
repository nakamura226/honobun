'use client'

import { useEffect, useRef, useState } from 'react'

import { apiClient } from '@/lib/api-client'

type Provider = 'anthropic' | 'openai' | 'google'

type Conversation = {
  id: number
  title: string
  createdAt: string
}

type Attachment = {
  id: number
  objectKey: string
  contentType: string | null
  fileName: string | null
  url: string
}

type Message = {
  id: number
  role: 'system' | 'user' | 'assistant'
  provider: string | null
  content: string
  attachments: Attachment[]
}

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Gemini' },
]

export function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [provider, setProvider] = useState<Provider>('anthropic')
  const [input, setInput] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadConversations()
  }, [])

  async function loadConversations() {
    const res = await apiClient.api.conversations.$get()
    const data = (await res.json()) as Conversation[]
    setConversations(data)
  }

  async function loadMessages(id: number) {
    const res = await apiClient.api.conversations[':id'].messages.$get({
      param: { id: String(id) },
    })
    const data = (await res.json()) as Message[]
    setMessages(data)
  }

  async function selectConversation(id: number) {
    setConversationId(id)
    await loadMessages(id)
  }

  async function createConversation() {
    const res = await apiClient.api.conversations.$post({ json: {} })
    const conversation = (await res.json()) as Conversation
    setConversations((prev) => [conversation, ...prev])
    setConversationId(conversation.id)
    setMessages([])
    return conversation.id
  }

  async function uploadAttachment(targetConversationId: number, targetFile: File): Promise<string> {
    const signRes = await apiClient.api.uploads['sign-upload'].$post({
      json: {
        conversationId: targetConversationId,
        fileName: targetFile.name,
        contentType: targetFile.type,
      },
    })

    if (!signRes.ok) {
      throw new Error('画像のアップロード準備に失敗しました')
    }

    const { uploadUrl, objectKey } = (await signRes.json()) as {
      uploadUrl: string
      objectKey: string
    }

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': targetFile.type },
      body: targetFile,
    })

    if (!putRes.ok) {
      throw new Error('画像のアップロードに失敗しました')
    }

    return objectKey
  }

  async function handleSend() {
    const content = input.trim()
    if (!content || isSending) return

    setIsSending(true)
    setError(null)

    try {
      const targetConversationId = conversationId ?? (await createConversation())

      const attachmentKeys: string[] = []
      if (file) {
        attachmentKeys.push(await uploadAttachment(targetConversationId, file))
      }

      setInput('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: targetConversationId,
          provider,
          content,
          attachmentKeys,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error('チャットの送信に失敗しました')
      }

      // ストリーミング応答を読みつつ、末尾に仮のassistantメッセージとして表示する
      const assistantDraftId = -Date.now()
      setMessages((prev) => [
        ...prev,
        { id: assistantDraftId, role: 'assistant', provider, content: '', attachments: [] },
      ])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantDraftId ? { ...m, content: m.content + chunk } : m,
          ),
        )
      }

      // 確定した履歴(添付の署名付きURL含む)に同期する
      await loadMessages(targetConversationId)
      await loadConversations()
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex h-dvh bg-zinc-50 font-sans dark:bg-black">
      <aside className="flex w-56 shrink-0 flex-col border-r border-black/[.08] p-3 dark:border-white/[.145]">
        <button
          type="button"
          onClick={() => void createConversation()}
          className="mb-3 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          新しい会話
        </button>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void selectConversation(c.id)}
              className={`truncate rounded-lg px-3 py-2 text-left text-sm ${
                c.id === conversationId
                  ? 'bg-black/[.06] dark:bg-white/[.08]'
                  : 'hover:bg-black/[.04] dark:hover:bg-white/[.06]'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500">
              左のメニューから会話を選ぶか、新しい会話を始めてください。
            </p>
          )}
          <div className="flex flex-col gap-4">
            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'self-end' : 'self-start'}>
                <div
                  className={`max-w-xl whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-foreground text-background'
                      : 'bg-black/[.06] text-black dark:bg-white/[.08] dark:text-zinc-50'
                  }`}
                >
                  {m.content || (m.role === 'assistant' ? '…' : '')}
                </div>
                {m.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.attachments.map((a) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={a.id}
                        src={a.url}
                        alt={a.fileName ?? '添付画像'}
                        className="h-32 w-32 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="px-4 text-sm text-red-600">{error}</p>}

        <div className="border-t border-black/[.08] p-3 dark:border-white/[.145]">
          <div className="mb-2 flex items-center gap-2">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="rounded-lg border border-black/[.08] bg-transparent px-2 py-1 text-sm dark:border-white/[.145]"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            {file && <span className="text-xs text-zinc-500">{file.name}</span>}
          </div>
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              rows={2}
              placeholder="メッセージを入力 (Shift+Enterで改行)"
              className="flex-1 resize-none rounded-lg border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isSending || !input.trim()}
              className="rounded-full bg-foreground px-5 text-sm font-medium text-background disabled:opacity-50"
            >
              送信
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
