'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Conversation {
  id: string
  title: string | null
  created_at: string
}

interface Props {
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onClose?: () => void
}

export default function Sidebar({ currentId, onSelect, onNew, onClose }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
    if (data) setConversations(data)
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await supabase.from('conversations').delete().eq('id', id)
    setConversations((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => { onNew(); onClose?.() }}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 새 대화
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="p-4 text-sm text-gray-400 text-center">대화 기록이 없습니다</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => { onSelect(conv.id); onClose?.() }}
              className={`group flex items-center justify-between p-3 mx-2 my-1 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors ${
                currentId === conv.id ? 'bg-blue-100 hover:bg-blue-100' : ''
              }`}
            >
              <span className="text-sm text-gray-700 truncate flex-1">
                {conv.title || '새 대화'}
              </span>
              <button
                onClick={(e) => deleteConversation(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 ml-2 text-gray-400 hover:text-red-500 text-xs transition-opacity"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
