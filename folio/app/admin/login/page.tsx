'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'request' | 'verify'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('request')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')

  const EMAIL = 'tkdtn8577@gmail.com'

  async function handleRequest() {
    setLoading(true)
    setError('')

    const supabase = createClient()
    // emailRedirectTo 없이 호출 → 6자리 OTP 코드를 이메일로 발송
    const { error } = await supabase.auth.signInWithOtp({
      email: EMAIL,
      options: { shouldCreateUser: false },
    })

    if (error) {
      setError(error.message)
    } else {
      setStep('verify')
    }
    setLoading(false)
  }

  async function handleVerify() {
    if (code.length !== 6) return setError('6자리 코드를 입력해주세요')
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email: EMAIL,
      token: code.trim(),
      type: 'email',
    })

    if (error) {
      setError('코드가 올바르지 않거나 만료되었습니다')
    } else {
      router.push('/admin')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white mb-1">어드민 로그인</h1>
          <p className="text-zinc-500 text-sm">{EMAIL}</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {step === 'request' ? (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm text-center">
              버튼을 누르면 Gmail로 <strong className="text-white">6자리 인증 코드</strong>를 발송합니다
            </p>
            <button
              onClick={handleRequest}
              disabled={loading}
              className="w-full rounded-xl bg-white text-black font-medium py-3 text-sm hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '발송 중...' : '인증 코드 받기'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-center">
              <div className="text-3xl mb-2">📬</div>
              <p className="text-white font-medium mb-1">Gmail을 확인해 주세요</p>
              <p className="text-zinc-500 text-sm">받은편지함의 <strong className="text-zinc-300">6자리 코드</strong>를 아래에 입력하세요</p>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-700 text-white text-center text-2xl font-mono tracking-widest py-4 outline-none focus:border-zinc-400 transition-colors"
            />

            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full rounded-xl bg-white text-black font-medium py-3 text-sm hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '확인 중...' : '로그인'}
            </button>

            <button
              onClick={() => { setStep('request'); setCode(''); setError(''); }}
              className="w-full text-zinc-500 text-sm hover:text-zinc-300 transition-colors py-1"
            >
              코드 재발송
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
