'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const QUICK_QUESTIONS = [
  '이번 달 미수금 현황 알려줘',
  'VIP 거래처 목록 보여줘',
  '이번 달 주요 일정은?',
  '오늘 액션 아이템 정리해줘',
]

interface Props {
  conversationId: string | null
  onConversationCreated: (id: string) => void
}

export default function ChatInterface({ conversationId, onConversationCreated }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (conversationId) loadMessages(conversationId)
    else setMessages([])
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from('messages')
      .select('id, role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data as Message[])
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return
    setInput('')
    setIsStreaming(true)

    // 대화 생성 (없으면)
    let convId = conversationId
    if (!convId) {
      const { data } = await supabase
        .from('conversations')
        .insert({ title: text.slice(0, 20) })
        .select()
        .single()
      if (data) {
        convId = data.id
        onConversationCreated(data.id)
      }
    }

    // 유저 메시지 저장 + 표시
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])

    if (convId) {
      await supabase.from('messages').insert({ conversation_id: convId, role: 'user', content: text })
    }

    // AI 응답 스트리밍
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }
    setMessages((prev) => [...prev, assistantMsg])

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: text }),
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      fullText += chunk
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { ...assistantMsg, content: fullText },
      ])
    }

    // AI 메시지 저장
    if (convId) {
      await supabase.from('messages').insert({ conversation_id: convId, role: 'assistant', content: fullText })
    }

    setIsStreaming(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="text-center mb-4">
              <p className="text-2xl font-bold text-gray-800">ARIA</p>
              <p className="text-sm text-gray-500 mt-1">무엇이든 물어보세요</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left p-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-table:text-xs">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content || '▋'}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="질문을 입력하세요... (Enter로 전송)"
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 max-h-32"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 128) + 'px'
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            className="bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {isStreaming ? '⏳' : '전송'}
          </button>
        </div>
      </div>
    </div>
  )
}
