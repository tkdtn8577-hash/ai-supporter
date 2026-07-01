'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: Date
}

const QUICK_QUESTIONS = [
  '이번 달 미수금 현황 알려줘',
  'VIP 거래처 목록 보여줘',
  '이번 달 주요 일정은?',
  '오늘 액션 아이템 정리해줘',
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

function formatTime(date?: Date) {
  if (!date) return ''
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  conversationId: string | null
  onConversationCreated: (id: string) => void
  onOpenUpload?: () => void
}

export default function ChatInterface({ conversationId, onConversationCreated, onOpenUpload }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [docCount, setDocCount] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (conversationId) loadMessages(conversationId)
    else setMessages([])
  }, [conversationId])

  useEffect(() => {
    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setDocCount(count ?? 0))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isWaiting])

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    if (data) {
      setMessages(data.map((m: any) => ({ ...m, createdAt: new Date(m.created_at) })) as Message[])
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return
    setInput('')
    setIsStreaming(true)
    setIsWaiting(true)

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

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, createdAt: new Date() }
    setMessages((prev) => [...prev, userMsg])

    if (convId) {
      await supabase.from('messages').insert({ conversation_id: convId, role: 'user', content: text })
    }

    const currentMessages = [...messages.filter((m) => m.content.trim()), userMsg]

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: text, history: currentMessages }),
    })

    setIsWaiting(false)

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      const errMsg = errData.error || `오류가 발생했습니다 (${res.status})`
      const errMsgObj: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: `⚠️ ${errMsg}`, createdAt: new Date() }
      setMessages((prev) => [...prev, errMsgObj])
      setIsStreaming(false)
      return
    }

    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', createdAt: new Date() }
    setMessages((prev) => [...prev, assistantMsg])

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      fullText += decoder.decode(value)
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { ...assistantMsg, content: fullText },
      ])
    }

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
    <div className="flex flex-col h-full bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">A</div>
        <div>
          <p className="text-sm font-semibold text-gray-800">ARIA</p>
          <p className="text-xs text-green-500">● 온라인</p>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !isWaiting && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">A</div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">안녕하세요! ARIA입니다</p>
              <p className="text-sm text-gray-500 mt-1">테크솔루션즈 사내 AI 비서예요. 무엇이든 물어보세요!</p>
            </div>

            {docCount === 0 && (
              <div className="w-full max-w-lg bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-sm font-medium text-amber-800">📂 등록된 문서가 없습니다</p>
                <p className="text-xs text-amber-600 mt-1 mb-3">
                  매출현황, 거래처목록 등 회사 데이터를 업로드하면 ARIA가 답변할 수 있어요
                </p>
                {onOpenUpload && (
                  <button
                    onClick={onOpenUpload}
                    className="bg-amber-500 text-white text-xs px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    파일 업로드하기
                  </button>
                )}
              </div>
            )}

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
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* 아바타 */}
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">A</div>
            )}

            <div className={`flex flex-col gap-0.5 max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {/* 발신자 이름 */}
              <span className="text-xs text-gray-400 px-1">
                {msg.role === 'assistant' ? 'ARIA' : '나'}
              </span>

              {/* 말풍선 */}
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
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

              {/* 시간 */}
              {msg.createdAt && (
                <span className="text-xs text-gray-300 px-1">{formatTime(msg.createdAt)}</span>
              )}
            </div>
          </div>
        ))}

        {/* 타이핑 인디케이터 */}
        {isWaiting && (
          <div className="flex gap-2 flex-row">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">A</div>
            <div className="flex flex-col gap-0.5 items-start">
              <span className="text-xs text-gray-400 px-1">ARIA</span>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm px-4 py-2">
                <TypingDots />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="border-t border-gray-200 p-3 bg-white">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (Enter로 전송)"
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 max-h-32"
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
            className="bg-blue-600 text-white rounded-2xl px-4 py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {isStreaming ? '⏳' : '전송'}
          </button>
        </div>
      </div>
    </div>
  )
}
