'use client'

import { useState } from 'react'
import { type Inquiry, type InquiryStatus } from '@/lib/types'
import { updateInquiryStatus, deleteInquiry } from '@/app/actions/admin'
import InquiryModal from './InquiryModal'

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: '신규',
  checked: '확인',
  done: '완료',
}

const STATUS_NEXT: Record<InquiryStatus, InquiryStatus> = {
  new: 'checked',
  checked: 'done',
  done: 'new',
}

const STATUS_COLORS: Record<InquiryStatus, string> = {
  new: 'bg-blue-950 text-blue-400 border-blue-800',
  checked: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  done: 'bg-zinc-800 text-zinc-400 border-zinc-700',
}

export default function InquiryTable({ inquiries: initial }: { inquiries: Inquiry[] }) {
  const [inquiries, setInquiries] = useState(initial)
  const [filter, setFilter] = useState<InquiryStatus | 'all'>('all')
  const [selected, setSelected] = useState<Inquiry | null>(null)

  const filtered = filter === 'all' ? inquiries : inquiries.filter(i => i.status === filter)

  async function handleStatusChange(id: string, current: InquiryStatus) {
    const next = STATUS_NEXT[current]
    await updateInquiryStatus(id, next)
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: next } : i))
  }

  async function handleDelete(id: string) {
    if (!confirm('이 문의를 삭제할까요?')) return
    await deleteInquiry(id)
    setInquiries(prev => prev.filter(i => i.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  return (
    <>
      {/* 필터 탭 */}
      <div className="flex gap-2 mb-4">
        {(['all', 'new', 'checked', 'done'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === s
                ? 'bg-white text-black font-medium'
                : 'text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600'
            }`}
          >
            {s === 'all' ? '전체' : STATUS_LABELS[s]}
            <span className="ml-1.5 text-xs opacity-70">
              {s === 'all' ? inquiries.length : inquiries.filter(i => i.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">문의가 없습니다</div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950">
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">접수일</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">이름</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">연락처</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">예산</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">내용 미리보기</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">상태</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((inquiry, i) => (
                <tr
                  key={inquiry.id}
                  onClick={() => setSelected(inquiry)}
                  className={`border-b border-zinc-900 hover:bg-zinc-900 cursor-pointer transition-colors ${
                    i === filtered.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {new Date(inquiry.created_at).toLocaleDateString('ko-KR', {
                      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{inquiry.name}</td>
                  <td className="px-4 py-3 text-zinc-300">{inquiry.phone}</td>
                  <td className="px-4 py-3 text-zinc-400">{inquiry.budget ?? '-'}</td>
                  <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">{inquiry.message}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); handleStatusChange(inquiry.id, inquiry.status) }}
                      className={`px-2.5 py-1 rounded-md text-xs border transition-opacity hover:opacity-70 ${STATUS_COLORS[inquiry.status]}`}
                    >
                      {STATUS_LABELS[inquiry.status]}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(inquiry.id) }}
                      className="text-zinc-600 hover:text-red-400 transition-colors text-xs"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <InquiryModal
          inquiry={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
