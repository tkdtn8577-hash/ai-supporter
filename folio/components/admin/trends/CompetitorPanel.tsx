'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { MonitoredAccount } from '@/lib/types'
import type { InfluencerData } from '@/lib/instagram'

interface Props {
  accounts: MonitoredAccount[]
  setAccounts: (a: MonitoredAccount[]) => void
  hasApiKey: boolean
}

interface AccountState {
  data?: InfluencerData
  loading?: boolean
  error?: string
  refreshedAt?: string
}

export default function CompetitorPanel({ accounts, setAccounts, hasApiKey }: Props) {
  const [usernameInput, setUsernameInput] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [accountStates, setAccountStates] = useState<Record<string, AccountState>>({})

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function addAccount() {
    const username = usernameInput.trim().replace(/^@/, '')
    if (!username) return
    if (accounts.length >= 20) { setAddError('최대 20개까지 등록 가능합니다'); return }
    if (accounts.some(a => a.username === username)) { setAddError('이미 등록된 계정입니다'); return }

    setAdding(true); setAddError('')
    const { data, error } = await supabase
      .from('monitored_accounts')
      .insert({ username, label: labelInput.trim() || null })
      .select()
      .single()

    if (error) { setAddError(error.message); setAdding(false); return }
    setAccounts([...accounts, data as MonitoredAccount])
    setUsernameInput(''); setLabelInput('')
    setAdding(false)
  }

  async function deleteAccount(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('monitored_accounts').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setAccounts(accounts.filter(a => a.id !== id))
  }

  async function refreshAccount(username: string) {
    if (!hasApiKey) return
    setAccountStates(s => ({ ...s, [username]: { loading: true } }))
    try {
      const res = await fetch(`/api/instagram/influencer?username=${encodeURIComponent(username)}`)
      const data = await res.json() as InfluencerData & { error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? '조회 실패')
      setAccountStates(s => ({ ...s, [username]: { data, refreshedAt: new Date().toLocaleTimeString() } }))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '오류'
      setAccountStates(s => ({ ...s, [username]: { error: msg } }))
    }
  }

  return (
    <div className="space-y-4">
      {/* 추가 폼 */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">경쟁사 계정 등록 <span className="text-zinc-600 font-normal">({accounts.length}/20)</span></h3>
        <div className="flex gap-2 flex-wrap">
          <input
            value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAccount()}
            placeholder="@username"
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition"
          />
          <input
            value={labelInput} onChange={e => setLabelInput(e.target.value)}
            placeholder="별칭 (선택)"
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition"
          />
          <button
            onClick={addAccount} disabled={adding || !usernameInput.trim()}
            className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {adding ? '추가 중...' : '+ 추가'}
          </button>
        </div>
        {addError && <p className="text-xs text-red-400 mt-2">{addError}</p>}
      </div>

      {/* 계정 목록 */}
      {accounts.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">
          <div className="text-5xl mb-3">📊</div>
          <p>경쟁사 계정을 추가하면 지표를 모니터링합니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {accounts.map(acc => {
            const state = accountStates[acc.username]
            const media = state?.data?.media ?? []
            const avgLikes = media.length ? media.reduce((s, m) => s + m.likeCount, 0) / media.length : 0
            const avgComments = media.length ? media.reduce((s, m) => s + m.commentCount, 0) / media.length : 0
            const er = state?.data ? ((avgLikes + avgComments) / (state.data.followers || 1)) * 100 : null

            return (
              <div key={acc.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <a
                      href={`https://www.instagram.com/${acc.username}`}
                      target="_blank" rel="noreferrer"
                      className="font-bold text-white hover:text-pink-400 transition text-sm"
                    >
                      @{acc.username}
                    </a>
                    {acc.label && <p className="text-xs text-zinc-500 mt-0.5">{acc.label}</p>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => refreshAccount(acc.username)}
                      disabled={state?.loading || !hasApiKey}
                      className="text-xs px-2 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-40 transition"
                    >
                      {state?.loading ? '⟳' : '갱신'}
                    </button>
                    <button
                      onClick={() => deleteAccount(acc.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-red-400 transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {state?.error && (
                  <p className="text-xs text-red-400">{state.error}</p>
                )}

                {state?.data && (
                  <div className="flex gap-4 text-sm flex-wrap">
                    {[
                      { l: '팔로워',     v: state.data.followers.toLocaleString() },
                      { l: '평균 좋아요', v: Math.round(avgLikes).toLocaleString() },
                      { l: '참여율',     v: er != null ? er.toFixed(2) + '%' : '-' },
                    ].map(({ l, v }) => (
                      <div key={l}>
                        <p className="text-xs text-zinc-500">{l}</p>
                        <p className="text-white font-semibold">{v}</p>
                      </div>
                    ))}
                  </div>
                )}

                {state?.refreshedAt && (
                  <p className="text-xs text-zinc-600 mt-2">마지막 갱신: {state.refreshedAt}</p>
                )}

                {!state && (
                  <p className="text-xs text-zinc-600">"갱신" 버튼을 눌러 최신 데이터를 가져오세요</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
