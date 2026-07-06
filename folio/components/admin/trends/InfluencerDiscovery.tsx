'use client'

import { useState } from 'react'
import type { InfluencerData } from '@/lib/instagram'
import { scoreInfluencer, TIER_LABEL, TIER_COLOR, TIER_BG, CATEGORY_KEYWORDS, formatNum, type InfluencerResult } from '@/lib/scoring'

interface Props {
  hasApiKey: boolean
}

const CATEGORY_HASHTAG_HINTS: Record<string, string[]> = {
  '뷰티':       ['#뷰티', '#메이크업', '#스킨케어', '#makeup', '#beauty'],
  '패션':       ['#ootd', '#패션', '#데일리룩', '#fashion', '#스타일'],
  '음식':       ['#맛집', '#먹스타그램', '#foodie', '#카페', '#요리'],
  '피트니스':   ['#헬스', '#운동', '#다이어트', '#workout', '#fitness'],
  '여행':       ['#여행', '#여행스타그램', '#travel', '#해외여행', '#trip'],
  '육아':       ['#육아', '#맘스타그램', '#아기', '#mom', '#parenting'],
  '라이프스타일':['#일상', '#데일리', '#브이로그', '#lifestyle', '#vlog'],
  '반려동물':   ['#강아지', '#고양이', '#펫스타그램', '#dog', '#cat'],
  'IT/테크':    ['#테크', '#개발자', '#스타트업', '#coding', '#tech'],
  '인테리어':   ['#인테리어', '#홈데코', '#집꾸미기', '#interior', '#home'],
}

export default function InfluencerDiscovery({ hasApiKey }: Props) {
  const [category, setCategory] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState<InfluencerResult[]>([])
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  async function analyze() {
    const usernames = usernameInput
      .split(/[\n,]+/)
      .map(u => u.trim().replace(/^@/, ''))
      .filter(Boolean)
      .slice(0, 10)

    if (!usernames.length) { setError('분석할 계정명을 입력해 주세요'); return }
    setAnalyzing(true); setError(''); setResults([])

    const all: InfluencerResult[] = []
    for (let i = 0; i < usernames.length; i++) {
      try {
        const res = await fetch(`/api/instagram/influencer?username=${encodeURIComponent(usernames[i])}`)
        const data = await res.json() as InfluencerData & { error?: string }
        if (!res.ok || data.error) throw new Error(data.error ?? '조회 실패')
        all.push({ ...scoreInfluencer(data, category), rank: 0 })
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
    const headers = ['순위', '계정명', '팔로워', '등급', '참여율(%)', '평균좋아요', '평균댓글', '주게시횟수', '종합점수', '추천이유']
    const rows = ok.map(r => [
      r.rank, r.username, r.followers, TIER_LABEL[r.tier],
      r.engagementRate.toFixed(2), r.avgLikes, r.avgComments,
      r.postsPerWeek.toFixed(1), r.overallScore,
      `"${r.explanation.replace(/"/g, '""')}"`
    ])
    const csv = '﻿' + [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `influencer_${new Date().toISOString().slice(0, 10)}.csv`
    })
    a.click()
  }

  const ok = results.filter(r => !r.error)
  const errors = results.filter(r => r.error)
  const hints = category ? CATEGORY_HASHTAG_HINTS[category] : null

  return (
    <div className="space-y-4">

      {/* 발굴 가이드 */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">인플루언서 찾는 법</p>
        <div className="flex gap-2 text-xs text-zinc-500 flex-wrap">
          <span className="bg-zinc-800 px-3 py-1.5 rounded-lg">1️⃣ 아래 카테고리 선택</span>
          <span className="text-zinc-700">→</span>
          <span className="bg-zinc-800 px-3 py-1.5 rounded-lg">2️⃣ 힌트 해시태그로 인스타 검색</span>
          <span className="text-zinc-700">→</span>
          <span className="bg-zinc-800 px-3 py-1.5 rounded-lg">3️⃣ 계정명 복사해서 아래에 붙여넣기</span>
          <span className="text-zinc-700">→</span>
          <span className="bg-zinc-800 px-3 py-1.5 rounded-lg">4️⃣ 분석 시작</span>
        </div>
        {hints && (
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="text-xs text-zinc-500 self-center">검색 힌트:</span>
            {hints.map(h => (
              <a
                key={h}
                href={`https://www.instagram.com/explore/tags/${h.replace('#', '')}/`}
                target="_blank" rel="noreferrer"
                className="text-xs bg-pink-900/30 text-pink-400 px-2 py-1 rounded-lg hover:bg-pink-900/50 transition"
              >
                {h}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* 입력 */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-40">
            <label className="text-xs text-zinc-400 block mb-1">카테고리 (선택)</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition"
            >
              <option value="">-- 카테고리 선택 --</option>
              {Object.keys(CATEGORY_KEYWORDS).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">
            계정명 <span className="text-zinc-600">(줄바꿈 또는 쉼표 구분 · 최대 10명)</span>
          </label>
          <textarea
            value={usernameInput}
            onChange={e => setUsernameInput(e.target.value)}
            rows={4}
            placeholder={'@username1\nusername2, username3'}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition resize-none font-mono"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={analyze}
            disabled={analyzing || !hasApiKey || !usernameInput.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
            style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
          >
            {analyzing ? '⟳ 분석 중...' : '▶ 분석 시작'}
          </button>
          {ok.length > 0 && (
            <button onClick={exportCSV} className="bg-green-800 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              CSV 내보내기
            </button>
          )}
          {!hasApiKey && (
            <span className="text-xs text-amber-500 self-center">HikerAPI 키가 설정되지 않았습니다</span>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* 결과 테이블 */}
      {ok.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-300">{ok.length}명 분석 완료</span>
            {category && <span className="text-xs text-zinc-500">카테고리: {category}</span>}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                <th className="px-4 py-3 text-left">순위</th>
                <th className="px-4 py-3 text-left">계정</th>
                <th className="px-4 py-3 text-left">등급</th>
                <th className="px-4 py-3 text-right">팔로워</th>
                <th className="px-4 py-3 text-right">참여율</th>
                <th className="px-4 py-3 text-right">주 게시</th>
                <th className="px-4 py-3 text-right">종합점수</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {ok.map(r => (
                <>
                  <tr
                    key={r.username}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition cursor-pointer"
                    onClick={() => setExpanded(expanded === r.username ? null : r.username)}
                  >
                    <td className="px-4 py-3 text-zinc-500">
                      {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {r.profilePicture && (
                          <img src={r.profilePicture} alt="" className="w-7 h-7 rounded-full object-cover bg-zinc-700" />
                        )}
                        <div>
                          <a
                            href={`https://www.instagram.com/${r.username}`}
                            target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-white hover:text-pink-400 transition font-medium"
                          >
                            @{r.username}
                          </a>
                          {r.biography && (
                            <p className="text-xs text-zinc-600 max-w-xs truncate">{r.biography}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_BG[r.tier]} ${TIER_COLOR[r.tier]}`}>
                        {TIER_LABEL[r.tier]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">{formatNum(r.followers)}</td>
                    <td className="px-4 py-3 text-right text-pink-400">{r.engagementRate.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right text-zinc-400">{r.postsPerWeek.toFixed(1)}회</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${r.overallScore >= 70 ? 'text-green-400' : r.overallScore >= 50 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                        {r.overallScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 text-xs">
                      {expanded === r.username ? '▲' : '▼'}
                    </td>
                  </tr>
                  {expanded === r.username && (
                    <tr key={`${r.username}-detail`} className="bg-zinc-800/20">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                          {[
                            { l: '평균 좋아요', v: formatNum(r.avgLikes) },
                            { l: '평균 댓글', v: formatNum(r.avgComments) },
                            { l: '총 게시물', v: r.mediaCount.toLocaleString() + '개' },
                            { l: '카테고리 적합도', v: r.categoryScore + '점' },
                          ].map(({ l, v }) => (
                            <div key={l} className="bg-zinc-800 rounded-lg p-3">
                              <p className="text-xs text-zinc-500 mb-0.5">{l}</p>
                              <p className="font-semibold text-white">{v}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-800 rounded-lg p-3">
                          {r.explanation}
                        </p>
                        {r.recentMedia.length > 0 && (
                          <div className="mt-3 flex gap-2 flex-wrap">
                            {r.recentMedia.slice(0, 5).map((m, i) => (
                              <a
                                key={i}
                                href={m.permalink}
                                target="_blank" rel="noreferrer"
                                className="bg-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-pink-400 transition"
                              >
                                ❤️ {m.likeCount.toLocaleString()} · 💬 {m.commentCount.toLocaleString()}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 조회 실패 목록 */}
      {errors.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-red-900/40 p-3">
          <p className="text-xs font-medium text-red-400 mb-2">조회 실패</p>
          {errors.map(e => (
            <div key={e.username} className="text-xs text-zinc-500">@{e.username} — {e.error}</div>
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {!analyzing && !results.length && (
        <div className="text-center py-16 text-zinc-600">
          <div className="text-5xl mb-3">🎯</div>
          <p className="font-medium">카테고리 선택 후 계정명을 붙여넣고 분석을 시작하세요</p>
          <p className="text-sm mt-2 text-zinc-700">참여율·활동성·카테고리 적합도 기반으로 자동 우선순위 정렬</p>
        </div>
      )}
    </div>
  )
}
