'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: 'tkdtn8577@gmail.com',
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=/admin`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white mb-1">어드민 로그인</h1>
          <p className="text-zinc-500 text-sm">tkdtn8577@gmail.com 으로 로그인 링크를 발송합니다</p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
            <div className="text-4xl mb-3">📬</div>
            <p className="text-white font-medium mb-1">메일을 확인해 주세요</p>
            <p className="text-zinc-500 text-sm">받은편지함에서 로그인 링크를 클릭하면 어드민으로 이동합니다</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white text-black font-medium py-3 text-sm hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '발송 중...' : '로그인 링크 받기'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
