'use client'

import { useState } from 'react'
import type { InfluencerData } from '@/lib/instagram'
import { scoreInfluencer, TIER_LABEL, TIER_COLOR, TIER_BG, formatNum, type InfluencerResult } from '@/lib/scoring'

interface Props {
  hasApiKey: boolean
}

export default function InfluencerDiscovery({ hasApiKey }: Props) {
  const [keyword, setKeyword] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState<InfluencerResult[]>([])
  const [error, setError] = useState('')

  async function analyze() {
    const usernames = usernameInput
      .split(/[\n,]+/).map(u => u.trim().replace(/^@/, '')).filter(Boolean).slice(0, 10)
    if (!usernames.length) { setError('분석할 계정명을 입력해 주세요'); return }
    setAnalyzing(true); setError(''); setResults([])

    const all: InfluencerResult[] = []
    for (let i = 0; i < usernames.length; i++) {
      try {
        const res = await fetch(`/api/instagram/influencer?username=${encodeURIComponent(usernames[i])}`)
        const data = await res.json() as InfluencerData & { error?: string }
        if (!res.ok || data.error) throw new Error(data.error ?? '조회 실패')
        all.push({ ...scoreInfluencer(data, keyword), rank: 0 })
      } catch (e: unknown) {
        all.push({ username: usernames[i], error: e instanceof Error ? e.message : '오류' } as InfluencerResult)
      }
      if (i < usernames.length - 1) await new Promise(r => setTimeout(r, 600))
    }

    const ok = all.filter(r => !r.error).sort((a, b) => b.overallScore - a.overallScore)
    ok.forEach((r, i) => { r.rank = i + 1 })
    setResults([...ok, ...all.filter(r => r.error)])
    setAnalyzing(false)
  }

  function exportCSV() {
    const ok = results.filter(r => !r.error)
    if (!ok.length) return
    const headers = ['순위', '계정명', '팔로워', '등급', '참여율(%)', '종합점수', '추천이유']
    const rows = ok.map(r => [
      r.rank, r.username, r.followers, TIER_LABEL[r.tier],
      r.engagementRate.toFixed(2), r.overallScore,
      `"${r.explanation.replace(/"/g, '""')}"`
    ])
    const csv = '﻿' + [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `influencer_discovery_${new Date().toISOString().slice(0, 10)}.csv`
    })
    a.click(); URL.revokeObjectURL(url)
  }

  const ok = results.filter(r => !r.error)
  const errors = results.filter(r => r.error)

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48">
            <label className="text-xs text-zinc-400 block mb-1">키워드 / 카테고리</label>
            <input
              value={keyword} onChange={e => setKeyword(e.target.value)}
              placeholder="예: 뷰티, 패션, 음식"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">
            분석할 계정명 <span className="text-zinc-600">(줄바꿈 또는 쉼표 · 최대 10명)</span>
          </label>
          <textarea
            value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
            rows={4}
            placeholder={'beautyblogger_kr\nfashion_seoul, foodlover_jeju'}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition resize-none font-mono"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={analyze} disabled={analyzing || !hasApiKey}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
            style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
          >
            {analyzing ? '⟳ 분석 중...' : '▶ 발굴 시작'}
          </button>
          {ok.length > 0 && (
            <button onClick={exportCSV} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              CSV 내보내기
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {ok.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                <th className="px-4 py-3 text-left">순위</th>
                <th className="px-4 py-3 text-left">계정</th>
                <th className="px-4 py-3 text-left">등급</th>
                <th className="px-4 py-3 text-right">팔로워</th>
                <th className="px-4 py-3 text-right">참여율</th>
                <th className="px-4 py-3 text-right">종합점수</th>
              </tr>
            </thead>
            <tbody>
              {ok.map(r => (
                <tr key={r.username} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition">
                  <td className="px-4 py-3 text-zinc-500">
                    {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://www.instagram.com/${r.username}`}
                      target="_blank" rel="noreferrer"
                      className="text-white hover:text-pink-400 transition font-medium"
                    >
                      @{r.username}
                    </a>
                    {r.biography && (
                      <p className="text-xs text-zinc-600 mt-0.5 max-w-xs truncate">{r.biography}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_BG[r.tier]} ${TIER_COLOR[r.tier]}`}>
                      {TIER_LABEL[r.tier]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">{formatNum(r.followers)}</td>
                  <td className="px-4 py-3 text-right text-pink-400">{r.engagementRate.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${r.overallScore >= 70 ? 'text-green-400' : r.overallScore >= 50 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                      {r.overallScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-red-900/40 p-3">
          <p className="text-xs font-medium text-red-400 mb-2">조회 실패</p>
          {errors.map(e => (
            <div key={e.username} className="text-xs text-zinc-500">@{e.username} — {e.error}</div>
          ))}
        </div>
      )}

      {!analyzing && !results.length && (
        <div className="text-center py-20 text-zinc-600">
          <div className="text-5xl mb-3">🎯</div>
          <p>키워드와 계정명을 입력하고 발굴 시작</p>
          <p className="text-sm mt-1 text-zinc-700">종합 점수 기준으로 자동 우선순위 정렬</p>
        </div>
      )}
    </div>
  )
}
