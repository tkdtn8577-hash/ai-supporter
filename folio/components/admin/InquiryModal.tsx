'use client'

import { type Inquiry, type InquiryStatus } from '@/lib/types'

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: '신규',
  checked: '확인',
  done: '완료',
}

interface Props {
  inquiry: Inquiry
  onClose: () => void
  onStatusChange: (id: string, current: InquiryStatus) => void
  onDelete: (id: string) => void
}

export default function InquiryModal({ inquiry, onClose, onStatusChange, onDelete }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">{inquiry.name}</h2>
            <p className="text-zinc-500 text-sm mt-0.5">
              {new Date(inquiry.created_at).toLocaleString('ko-KR')}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <p className="text-zinc-500 mb-1">연락처</p>
            <p className="text-white">{inquiry.phone}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <p className="text-zinc-500 mb-1">이메일</p>
            <p className="text-white">{inquiry.email ?? '-'}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <p className="text-zinc-500 mb-1">예산</p>
            <p className="text-white">{inquiry.budget ?? '미정'}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <p className="text-zinc-500 mb-1">상태</p>
            <p className="text-white">{STATUS_LABELS[inquiry.status]}</p>
          </div>
        </div>

        <div className="bg-zinc-800/50 rounded-xl p-3 text-sm">
          <p className="text-zinc-500 mb-2">문의 내용</p>
          <p className="text-white whitespace-pre-wrap leading-relaxed">{inquiry.message}</p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onStatusChange(inquiry.id, inquiry.status)}
            className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white text-sm transition-colors"
          >
            다음 상태로 변경
          </button>
          <button
            onClick={() => onDelete(inquiry.id)}
            className="px-4 py-2.5 rounded-xl border border-red-900 text-red-400 hover:bg-red-950 text-sm transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
