'use client'

import { useState } from 'react'
import { useRef } from 'react'
import AnimateOnScroll from '@/components/ui/AnimateOnScroll'
import { submitInquiry } from '@/app/actions/inquiry'
import { type BudgetOption } from '@/lib/types'

const BUDGET_OPTIONS: BudgetOption[] = [
  '150만원 미만',
  '150~300만원',
  '300~500만원',
  '500만원 이상',
  '미정',
]

export default function Contact() {
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const result = await submitInquiry(formData)

    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error ?? '오류가 발생했습니다.')
    }
    setPending(false)
  }

  return (
    <section id="contact" className="py-32 px-6 bg-black">
      <div className="max-w-2xl mx-auto">
        <AnimateOnScroll>
          <p className="text-zinc-600 text-sm tracking-widest uppercase mb-4">Contact</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            프로젝트를<br />시작해볼까요?
          </h2>
          <p className="text-zinc-500 mb-12">24시간 내 연락드리겠습니다.</p>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.1}>
          {success ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center">
              <div className="text-5xl mb-4">✓</div>
              <p className="text-white text-xl font-medium mb-2">문의가 접수되었습니다.</p>
              <p className="text-zinc-500">24시간 내 연락드리겠습니다.</p>
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-950 border border-red-900 px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 text-xs mb-1.5">이름 *</label>
                  <input
                    name="name"
                    type="text"
                    placeholder="홍길동"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 text-xs mb-1.5">연락처 *</label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="010-0000-0000"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 text-xs mb-1.5">이메일</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="example@email.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 text-xs mb-1.5">예산</label>
                  <select
                    name="budget"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-zinc-600 transition-colors appearance-none"
                  >
                    <option value="">선택 안 함</option>
                    {BUDGET_OPTIONS.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 text-xs mb-1.5">문의 내용 *</label>
                <textarea
                  name="message"
                  rows={5}
                  placeholder="어떤 프로젝트를 원하시나요? 간단히 설명해 주세요."
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="w-full py-4 rounded-xl bg-white text-black font-medium text-sm hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? '전송 중...' : '문의 전송하기'}
              </button>
            </form>
          )}
        </AnimateOnScroll>
      </div>
    </section>
  )
}
