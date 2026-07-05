'use client'

import { useState, useEffect } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js'
import type { InfluencerData } from '@/lib/instagram'
import {
  CATEGORY_KEYWORDS, TIER_BENCHMARK, TIER_LABEL, TIER_COLOR, TIER_BG, PALETTE,
  getTier, formatNum, calcCategoryScore, calcPostsPerWeek, calcActivityScore,
  buildExplanation, scoreInfluencer,
  type Tier, type InfluencerResult
} from '@/lib/scoring'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface Snapshot {
  id: number
  label: string
  timestamp: string
  category: string
  results: InfluencerResult[]
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

export default function InstagramDashboard({ hasApiKey }: { hasApiKey: boolean }) {
  const [category, setCategory]       = useState('')
  const [tier, setTier]               = useState('all')
  const [usernameInput, setUsernameInput] = useState('')
  const [analyzing, setAnalyzing]     = useState(false)
  const [progress, setProgress]       = useState<{ cur: number; total: number; log: string[] }>({ cur: 0, total: 0, log: [] })
  const [analyzeError, setAnalyzeError] = useState('')
  const [results, setResults]         = useState<InfluencerResult[]>([])
  const [snapshots, setSnapshots]     = useState<Snapshot[]>([])
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [expandedCard, setExpandedCard]   = useState<string | null>(null)

  useEffect(() => {
    try { setSnapshots(JSON.parse(localStorage.getItem('ig_snapshots') ?? '[]')) } catch { /* */ }
  }, [])

  async function analyze() {
    const usernames = usernameInput
      .split(/[\n,]+/).map(u => u.trim().replace(/^@/, '')).filter(Boolean).slice(0, 10)
    if (!usernames.length) { setAnalyzeError('분석할 계정명을 입력해 주세요.'); return }

    setAnalyzing(true); setAnalyzeError('')
    setProgress({ cur: 0, total: usernames.length, log: [] })

    const allResults: InfluencerResult[] = []

    for (let i = 0; i < usernames.length; i++) {
      const uname = usernames[i]
      setProgress(p => ({ ...p, log: [...p.log, `@${uname} 분석 중...`] }))

      try {
        const res = await fetch(`/api/instagram/influencer?username=${encodeURIComponent(uname)}`)
        const data = await res.json() as InfluencerData & { error?: string }
        if (!res.ok || data.error) throw new Error(data.error ?? '조회 실패')

        const scored = scoreInfluencer(data, category)
        allResults.push({ ...scored, rank: 0 })
        setProgress(p => ({ ...p, cur: i + 1, log: [...p.log, `✅ @${uname} 완료 (참여율 ${scored.engagementRate.toFixed(2)}%)`] }))
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '오류'
        allResults.push({ username: uname, error: msg } as InfluencerResult)
        setProgress(p => ({ ...p, cur: i + 1, log: [...p.log, `❌ @${uname} 실패: ${msg}`] }))
      }

      if (i < usernames.length - 1) await new Promise(r => setTimeout(r, 600))
    }

    const ok  = allResults.filter(r => !r.error).sort((a, b) => b.overallScore - a.overallScore)
    ok.forEach((r, i) => { r.rank = i + 1 })
    const filtered = tier === 'all' ? ok : ok.filter(r => r.tier === tier)
    setResults([...filtered, ...allResults.filter(r => r.error)])
    setAnalyzing(false)
  }

  function saveSnapshot() {
    const ok = results.filter(r => !r.error)
    if (!ok.length) return
    const label = window.prompt('스냅샷 이름:', new Date().toLocaleString()) || new Date().toLocaleString()
    const snap: Snapshot = { id: Date.now(), label, timestamp: new Date().toISOString(), category: category || '전체', results: ok }
    const list = [snap, ...snapshots].slice(0, 20)
    setSnapshots(list)
    localStorage.setItem('ig_snapshots', JSON.stringify(list))
  }

  function deleteSnapshot(id: number) {
    if (!confirm('삭제하시겠습니까?')) return
    const list = snapshots.filter(s => s.id !== id)
    setSnapshots(list); localStorage.setItem('ig_snapshots', JSON.stringify(list))
  }

  function exportCSV() {
    const ok = results.filter(r => !r.error)
    if (!ok.length) return
    const headers = ['순위','계정명','이름','팔로워','등급','참여율(%)','평균좋아요','평균댓글','주간게시빈도','종합점수','참여율점수','카테고리적합도','활동성점수','팔로워적정성','추천이유','프로필URL']
    const rows = ok.map(r => [
      r.rank, r.username, `"${(r.name ?? '').replace(/"/g,'""')}"`,
      r.followers, TIER_LABEL[r.tier], r.engagementRate.toFixed(2),
      r.avgLikes, r.avgComments, r.postsPerWeek.toFixed(1),
      r.overallScore, r.erScore, r.categoryScore, r.activityScore, r.followerScore,
      `"${r.explanation.replace(/"/g,'""')}"`,
      `https://www.instagram.com/${r.username}`
    ])
    const csv  = '﻿' + [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `instagram_influencer_${new Date().toISOString().slice(0,10)}.csv` })
    a.click(); URL.revokeObjectURL(url)
  }

  const ok     = results.filter(r => !r.error)
  const errors = results.filter(r => r.error)
  const avgER  = ok.length ? ok.reduce((s, r) => s + r.engagementRate, 0) / ok.length : 0
  const topER  = ok.length ? ok.reduce((a, b) => a.engagementRate > b.engagementRate ? a : b) : null
  const topCat = ok.length ? ok.reduce((a, b) => a.categoryScore  > b.categoryScore  ? a : b) : null

  const igGradient = 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-3 sticky top-0 bg-black z-40">
        <a href="/admin" className="text-zinc-500 hover:text-white text-sm transition-colors">← 문의 관리</a>
        <div className="w-px h-4 bg-zinc-800" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: igGradient }}>
            <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <h1 className="text-base font-bold text-white">Instagram 인플루언서 분석기</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-green-400' : 'bg-amber-400'}`} />
          <span className="text-xs text-zinc-400">{hasApiKey ? 'HikerAPI 연결됨' : 'API 키 미설정'}</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {/* API 키 미설정 안내 */}
        {!hasApiKey && (
          <div className="bg-amber-950 border border-amber-800 rounded-xl p-4 text-sm text-amber-300 space-y-2">
            <p className="font-semibold">HikerAPI 키 설정이 필요합니다</p>
            <ol className="list-decimal list-inside space-y-1 text-amber-400 text-xs">
              <li><a href="https://hikerapi.com" target="_blank" rel="noreferrer" className="underline hover:text-amber-200">hikerapi.com</a> 에서 무료 가입 (이메일만, 신용카드 불필요 · 무료 100회 제공)</li>
              <li>대시보드에서 API Key 복사</li>
              <li><code className="bg-amber-900 px-1 rounded">folio/.env.local</code> 에 <code className="bg-amber-900 px-1 rounded">HIKERAPI_KEY=복사한키</code> 추가 후 재시작</li>
            </ol>
          </div>
        )}

        {/* 컨트롤 */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
          <div className="flex flex-wrap gap-4 items-start">
            <div className="flex-1 min-w-56">
              <label className="text-xs text-zinc-400 block mb-1">분석 카테고리 <span className="text-zinc-600">(예: 뷰티, 패션, 음식/맛집)</span></label>
              <input
                value={category} onChange={e => setCategory(e.target.value)}
                placeholder="인플루언서를 찾는 카테고리..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">팔로워 규모</label>
              <select value={tier} onChange={e => setTier(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition">
                <option value="all">전체</option>
                <option value="nano">나노 (1K~10K)</option>
                <option value="micro">마이크로 (10K~100K)</option>
                <option value="macro">매크로 (100K~1M)</option>
                <option value="mega">메가 (1M+)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">
              인플루언서 계정명 <span className="text-zinc-600">(줄바꿈 또는 쉼표 구분 · 최대 10명)</span>
            </label>
            <textarea
              value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
              rows={4}
              placeholder={'예:\nbeautyblogger_kr\nfashion_seoul, foodlover_jeju'}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition resize-none font-mono"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={analyze} disabled={analyzing || !hasApiKey}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition flex items-center gap-1.5"
              style={{ background: igGradient }}>
              {analyzing ? '⟳ 분석 중...' : '▶ 분석 시작'}
            </button>
            {ok.length > 0 && <>
              <button onClick={saveSnapshot} className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">스냅샷 저장</button>
              <button onClick={() => setShowSnapshots(v => !v)} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">스냅샷 목록</button>
              <button onClick={exportCSV} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">CSV 내보내기</button>
            </>}
          </div>
          {analyzeError && <p className="text-xs text-red-400">{analyzeError}</p>}
        </div>

        {/* 진행률 */}
        {analyzing && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-300">분석 진행 중...</span>
              <span className="text-xs text-zinc-500">{progress.cur} / {progress.total}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-3">
              <div className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress.total ? (progress.cur / progress.total) * 100 : 0}%`, background: igGradient }} />
            </div>
            <div className="space-y-1 text-xs text-zinc-500 max-h-28 overflow-y-auto">
              {progress.log.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          </div>
        )}

        {/* 스냅샷 목록 */}
        {showSnapshots && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-zinc-200">저장된 스냅샷</h3>
              <button onClick={() => setShowSnapshots(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">✕ 닫기</button>
            </div>
            {!snapshots.length
              ? <p className="text-zinc-500 text-sm text-center py-6">저장된 스냅샷이 없습니다.</p>
              : <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {snapshots.map(s => (
                    <div key={s.id} className="flex items-center gap-3 bg-zinc-800 rounded-lg p-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{s.label}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{s.results.length}명 · {s.category} · {new Date(s.timestamp).toLocaleString()}</p>
                      </div>
                      <button onClick={() => deleteSnapshot(s.id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-900/30 hover:bg-red-900/50 transition shrink-0">삭제</button>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* 통계 카드 */}
        {ok.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: '분석 완료', value: String(ok.length), sub: '인플루언서', cls: 'text-white text-2xl font-bold' },
              { label: '평균 참여율', value: avgER.toFixed(2) + '%', sub: 'Engagement Rate', cls: 'text-pink-400 text-2xl font-bold' },
              { label: '참여율 1위', value: topER ? '@' + topER.username : '-', sub: topER ? topER.engagementRate.toFixed(2) + '%' : '-', cls: 'text-purple-400 text-sm font-bold truncate mt-1' },
              { label: '카테고리 최적', value: topCat ? '@' + topCat.username : '-', sub: topCat ? `적합도 ${topCat.categoryScore}점` : '-', cls: 'text-orange-400 text-sm font-bold truncate mt-1' },
            ].map(({ label, value, sub, cls }) => (
              <div key={label} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <p className="text-xs text-zinc-400 mb-1">{label}</p>
                <p className={cls}>{value}</p>
                <p className="text-xs text-zinc-600 mt-1">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* 차트 */}
        {ok.length > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <h3 className="text-sm font-semibold mb-3 text-zinc-300">인플루언서별 참여율 비교</h3>
              <Bar data={{
                labels: ok.map(r => '@' + r.username),
                datasets: [{ label: '참여율 (%)', data: ok.map(r => +r.engagementRate.toFixed(2)),
                  backgroundColor: ok.map((_, i) => PALETTE[i % PALETTE.length] + 'B3'),
                  borderColor: ok.map((_, i) => PALETTE[i % PALETTE.length]), borderWidth: 1, borderRadius: 4 }]
              }} options={{ responsive: true, plugins: { legend: { display: false } },
                scales: { x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { display: false } },
                  y: { ticks: { color: '#9ca3af', callback: v => v + '%' }, grid: { color: '#374151' } } } }} />
            </div>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <h3 className="text-sm font-semibold mb-3 text-zinc-300">종합 점수 순위</h3>
              <Bar data={{
                labels: [...ok].sort((a,b) => b.overallScore - a.overallScore).map(r => '@' + r.username),
                datasets: [{ label: '종합 점수',
                  data: [...ok].sort((a,b) => b.overallScore - a.overallScore).map(r => r.overallScore),
                  backgroundColor: ok.map((_, i) => PALETTE[i % PALETTE.length] + 'B3'),
                  borderColor: ok.map((_, i) => PALETTE[i % PALETTE.length]), borderWidth: 1, borderRadius: 4 }]
              }} options={{ indexAxis: 'y' as const, responsive: true, plugins: { legend: { display: false } },
                scales: { x: { max: 100, ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                  y: { ticks: { color: '#d1d5db', font: { size: 11 } }, grid: { display: false } } } }} />
            </div>
          </div>
        )}

        {/* 인플루언서 카드 */}
        {ok.map((inf, idx) => {
          const RANK_ICON = ['🥇','🥈','🥉']
          const rankIcon  = idx < 3 ? RANK_ICON[idx] : `#${inf.rank}`
          const ringColor = inf.overallScore >= 70 ? 'border-pink-500' : inf.overallScore >= 50 ? 'border-purple-500' : 'border-zinc-600'

          return (
            <div key={inf.username} className="bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors p-5">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-full overflow-hidden" style={{ background: igGradient, padding: '2px' }}>
                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                      {inf.profilePicture
                        ? <img src={inf.profilePicture} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                        : <span className="text-2xl">👤</span>}
                    </div>
                  </div>
                  <span className="absolute -top-1 -left-1 text-lg leading-none">{rankIcon}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <a href={`https://www.instagram.com/${inf.username}`} target="_blank" rel="noreferrer"
                      className="font-bold text-white hover:text-pink-400 transition">@{inf.username}</a>
                    {inf.name && <span className="text-zinc-500 text-sm">{inf.name}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_BG[inf.tier]} ${TIER_COLOR[inf.tier]}`}>{TIER_LABEL[inf.tier]}</span>
                  </div>
                  {inf.biography && <p className="text-zinc-400 text-xs line-clamp-2 mb-2">{inf.biography}</p>}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    {[
                      { l: '팔로워',     v: formatNum(inf.followers),              c: 'text-white' },
                      { l: '참여율',     v: inf.engagementRate.toFixed(2) + '%',   c: 'text-pink-400' },
                      { l: '평균 좋아요', v: formatNum(inf.avgLikes),              c: 'text-purple-400' },
                      { l: '평균 댓글',  v: formatNum(inf.avgComments),            c: 'text-blue-400' },
                      { l: '주 게시 빈도', v: inf.postsPerWeek.toFixed(1) + '회', c: 'text-green-400' },
                    ].map(({ l, v, c }) => (
                      <div key={l}><p className="text-zinc-500 text-xs">{l}</p><p className={`font-semibold ${c}`}>{v}</p></div>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 text-center">
                  <div className={`w-16 h-16 rounded-full border-4 ${ringColor} flex items-center justify-center`}>
                    <div><p className="text-xl font-bold text-white leading-none">{inf.overallScore}</p><p className="text-xs text-zinc-500">점</p></div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">종합점수</p>
                </div>
              </div>

              {/* 점수 세부 */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: '참여율 (40%)',      score: inf.erScore,       color: 'bg-pink-500' },
                  { label: '카테고리 (30%)',    score: inf.categoryScore, color: 'bg-purple-500' },
                  { label: '활동성 (15%)',      score: inf.activityScore, color: 'bg-blue-500' },
                  { label: '팔로워 적정성 (15%)', score: inf.followerScore, color: 'bg-green-500' },
                ].map(({ label, score, color }) => (
                  <div key={label}>
                    <p className="text-xs text-zinc-500 mb-1">{label}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
                      </div>
                      <span className="text-xs text-zinc-400 w-7 text-right">{score}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 추천 이유 */}
              <div className="mt-4 bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/50">
                <p className="text-xs font-semibold text-pink-400 mb-1.5">왜 이 인플루언서인가?</p>
                <p className="text-xs text-zinc-300 leading-relaxed">{inf.explanation}</p>
              </div>

              {/* 최근 게시물 */}
              {inf.recentMedia.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-zinc-500 mb-2">최근 게시물</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {inf.recentMedia.map((m, j) => (
                      <a key={j} href={m.permalink} target="_blank" rel="noreferrer"
                        title={(m.caption ?? '').slice(0, 60)}
                        className="shrink-0 w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center text-2xl hover:bg-zinc-700 transition relative group overflow-hidden">
                        {m.mediaType === 'VIDEO' ? '🎬' : m.mediaType === 'CAROUSEL_ALBUM' ? '🖼️' : '📷'}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <span className="text-white text-xs font-medium">보기</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="mt-4 flex gap-2 flex-wrap">
                <a href={`https://www.instagram.com/${inf.username}`} target="_blank" rel="noreferrer"
                  className="text-white text-xs px-3 py-1.5 rounded-lg hover:opacity-90 transition font-medium" style={{ background: igGradient }}>
                  프로필 방문
                </a>
                <a href={`https://www.instagram.com/${inf.username}/reels/`} target="_blank" rel="noreferrer"
                  className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-3 py-1.5 rounded-lg transition">릴스 보기</a>
                {inf.website && (
                  <a href={inf.website} target="_blank" rel="noreferrer"
                    className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-3 py-1.5 rounded-lg transition">웹사이트</a>
                )}
              </div>
            </div>
          )
        })}

        {/* 실패 계정 */}
        {errors.length > 0 && (
          <div className="bg-zinc-900 rounded-xl border border-red-900/40 p-4">
            <p className="text-sm font-medium text-red-400 mb-2">분석 실패 계정</p>
            {errors.map(e => (
              <div key={e.username} className="flex items-start gap-2 text-xs py-1">
                <span className="text-red-400">❌</span>
                <div><span className="text-zinc-300">@{e.username}</span><span className="text-zinc-600 ml-2">— {e.error}</span></div>
              </div>
            ))}
            <p className="text-xs text-zinc-600 mt-2">* 비공개 계정 또는 존재하지 않는 계정은 조회가 제한됩니다.</p>
          </div>
        )}

        {/* 빈 상태 */}
        {!analyzing && results.length === 0 && (
          <div className="text-center py-28 text-zinc-600">
            <div className="text-6xl mb-4">📱</div>
            <p className="text-base">인플루언서 계정명을 입력하고 분석을 시작하세요</p>
            <p className="text-sm mt-2 text-zinc-700">최대 10명 동시 분석 · 순위 및 추천 이유 자동 도출</p>
          </div>
        )}
      </main>
    </div>
  )
}
