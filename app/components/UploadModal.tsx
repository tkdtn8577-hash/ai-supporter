'use client'

import { useEffect, useRef, useState } from 'react'
import type { Workspace } from './WorkspaceSwitcher'

interface DocItem {
  id: string
  filename: string
  created_at: string
}

interface Props {
  workspace: Workspace
  onClose: () => void
}

const WORKSPACE_LABEL: Record<Workspace, string> = {
  company: '🏢 회사 AI',
  yami: '🌸 YAMI YAMI',
}

export default function UploadModal({ workspace, onClose }: Props) {
  const [docs, setDocs] = useState<DocItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocs()
  }, [workspace])

  async function loadDocs() {
    const res = await fetch(`/api/documents?workspace=${workspace}`)
    const data = await res.json()
    if (Array.isArray(data)) setDocs(data)
  }

  async function uploadFile(file: File) {
    setUploading(true)
    setStatus(`"${file.name}" 처리 중...`)
    const form = new FormData()
    form.append('file', file)
    form.append('workspace', workspace)
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (data.success) {
      setStatus(`완료: ${data.chunks}개 청크로 저장됨`)
      loadDocs()
    } else {
      setStatus(`오류: ${data.error}`)
    }
    setUploading(false)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  async function deleteDoc(id: string) {
    await fetch('/api/documents', { method: 'DELETE', body: JSON.stringify({ id }), headers: { 'Content-Type': 'application/json' } })
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  const accentColor = workspace === 'yami' ? 'border-purple-400 bg-purple-50' : 'border-blue-400 bg-blue-50'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-800">파일 관리</h2>
            <p className="text-xs text-gray-400 mt-0.5">{WORKSPACE_LABEL[workspace]} 전용 문서</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className={`m-4 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:${accentColor} transition-colors`}
        >
          <p className="text-2xl mb-2">📁</p>
          <p className="text-sm text-gray-600">클릭하거나 파일을 드래그하세요</p>
          <p className="text-xs text-gray-400 mt-1">txt, csv, pdf, docx, xlsx (최대 10MB)</p>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".txt,.csv,.pdf,.docx,.xlsx"
            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
          />
        </div>

        {status && (
          <p className={`mx-4 mb-3 text-sm text-center ${status.startsWith('오류') ? 'text-red-500' : 'text-blue-600'}`}>
            {uploading && '⏳ '}{status}
          </p>
        )}

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {docs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">등록된 파일이 없습니다</p>
          ) : (
            <ul className="space-y-2">
              {docs.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{doc.filename}</p>
                    <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <button onClick={() => deleteDoc(doc.id)} className="text-gray-300 hover:text-red-500 transition-colors ml-3">🗑️</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
