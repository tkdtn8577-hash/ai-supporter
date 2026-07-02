'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatInterface from '@/components/ChatInterface'
import UploadModal from '@/components/UploadModal'
import WorkspaceSwitcher, { type Workspace } from '@/components/WorkspaceSwitcher'

export default function Home() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [workspace, setWorkspace] = useState<Workspace>('company')

  function handleWorkspaceChange(ws: Workspace) {
    setWorkspace(ws)
    setConversationId(null)
  }

  function handleNew() {
    setConversationId(null)
  }

  const isYami = workspace === 'yami'

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 데스크탑 사이드바 */}
      <div className="hidden md:flex md:w-64 flex-col">
        <Sidebar
          currentId={conversationId}
          workspace={workspace}
          onSelect={setConversationId}
          onNew={handleNew}
        />
        <button
          onClick={() => setShowUpload(true)}
          className="m-3 py-2 px-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          📁 파일 관리
        </button>
      </div>

      {/* 모바일 사이드바 오버레이 */}
      {showSidebar && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSidebar(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 flex flex-col bg-white shadow-xl">
            <Sidebar
              currentId={conversationId}
              workspace={workspace}
              onSelect={setConversationId}
              onNew={handleNew}
              onClose={() => setShowSidebar(false)}
            />
            <button
              onClick={() => { setShowUpload(true); setShowSidebar(false) }}
              className="m-3 py-2 px-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              📁 파일 관리
            </button>
          </div>
        </div>
      )}

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 헤더 */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden text-gray-500 hover:text-gray-700 text-xl"
            >
              ☰
            </button>
            <h1 className={`font-bold text-lg ${isYami ? 'text-purple-700' : 'text-gray-800'}`}>
              {isYami ? 'YAMI YAMI AI' : 'ARIA'}
            </h1>
            <span className="text-xs text-gray-400 hidden sm:block">
              {isYami ? '개인 사업 AI 비서' : '사내 AI 비서'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <WorkspaceSwitcher workspace={workspace} onChange={handleWorkspaceChange} />
            <button
              onClick={() => setShowUpload(true)}
              className="md:hidden text-sm text-gray-500 hover:text-blue-600 transition-colors ml-1"
            >
              📁
            </button>
          </div>
        </header>

        {/* 채팅 */}
        <div className="flex-1 min-h-0">
          <ChatInterface
            conversationId={conversationId}
            workspace={workspace}
            onConversationCreated={(id) => setConversationId(id)}
            onOpenUpload={() => setShowUpload(true)}
          />
        </div>
      </div>

      {showUpload && (
        <UploadModal
          workspace={workspace}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  )
}
