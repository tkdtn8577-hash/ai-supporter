'use client'

import { useState } from 'react'
import type { MonitoredAccount } from '@/lib/types'
import type { InfluencerData } from '@/lib/instagram'
import { collectHashtagTrends } from '@/lib/trends'

interface Props {
  accounts: MonitoredAccount[]
  hasApiKey: boolean
}

export default function HashtagPanel({ accounts, hasApiKey }: Props) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [trends, setTrends] = useState<Record<string, number>>({})

  async function collect() {
    if (!accounts.length) return
    setLoading(true); setTrends({})
    const results: InfluencerData[] = []

    for (const acc of accounts) {
      setProgress(`@${acc.username} 수집 중...`)
      try {
        const res = await fetch(`/api/instagram/influencer?username=${encodeURIComponent(acc.username)}`)
        const data = await res.json() as InfluencerData & { error?: string }
        if (res.ok && !data.error) results.push(data)
        await new Promise(r => setTimeout(r, 600))
      } catch { /* skip */ }
    }

    setTrends(collectHashtagTrends(results))
    setProgress('')
    setLoading(false)
  }

  const sorted = Object.entries(trends).sort(([, a], [, b]) => b - a).slice(0, 30)
  const maxFreq = sorted[0]?.[1] ?? 1

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm text-zinc-300 font-medium">경쟁사 게시물 기반 해시태그 트랜드</p>
          <p className="text-xs text-zinc-600 mt-0.5">등록된 {accounts.length}개 경쟁사 계정의 최근 게시물 캡션에서 해시태그를 수집합니다</p>
        </div>
        <button
          onClick={collect}
          disabled={loading || !hasApiKey || !accounts.length}
          className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition shrink-0"
        >
          {loading ? '수집 중...' : '해시태그 수집'}
        </button>
      </div>

      {progress && <p className="text-xs text-zinc-500 px-1">{progress}</p>}

      {!sorted.length && !loading && (
        <div className="text-center py-20 text-zinc-600">
          <div className="text-5xl mb-3">#️⃣</div>
          <p>경쟁사 계정을 등록하고 "해시태그 수집" 버튼을 눌러주세요</p>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">인기 해시태그 TOP {sorted.length}</h3>
          <div className="space-y-2">
            {sorted.map(([tag, freq], i) => (
              <div key={tag} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-5 text-right shrink-0">{i + 1}</span>
                <span className="text-sm text-pink-400 font-medium w-32 truncate shrink-0">{tag}</span>
                <div className="flex-1 bg-zinc-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                    style={{ width: `${(freq / maxFreq) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400 w-6 text-right shrink-0">{freq}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
