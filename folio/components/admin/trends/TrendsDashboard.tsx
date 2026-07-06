'use client'

import { useState } from 'react'
import type { MonitoredAccount, AccountSnapshot } from '@/lib/types'
import CompetitorPanel from './CompetitorPanel'
import HashtagPanel from './HashtagPanel'
import HistoryChart from './HistoryChart'
import InfluencerDiscovery from './InfluencerDiscovery'

type Tab = 'competitor' | 'hashtag' | 'history' | 'discovery'

const TABS: { id: Tab; label: string }[] = [
  { id: 'competitor', label: '경쟁사 모니터링' },
  { id: 'hashtag',    label: '해시태그 분석' },
  { id: 'history',    label: '히스토리' },
  { id: 'discovery',  label: '인플루언서 분석' },
]

interface Props {
  hasApiKey: boolean
  initialAccounts: MonitoredAccount[]
  initialSnapshots: AccountSnapshot[]
}

export default function TrendsDashboard({ hasApiKey, initialAccounts, initialSnapshots }: Props) {
  const [tab, setTab] = useState<Tab>('competitor')
  const [accounts, setAccounts] = useState<MonitoredAccount[]>(initialAccounts)

  const igGradient = 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-3 sticky top-0 bg-black z-40">
        <a href="/admin" className="text-zinc-500 hover:text-white text-sm transition-colors">← 문의 관리</a>
        <div className="w-px h-4 bg-zinc-800" />
        <a href="/admin/instagram" className="text-zinc-500 hover:text-white text-sm transition-colors">인플루언서 분석</a>
        <div className="w-px h-4 bg-zinc-800" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: igGradient }}>
            <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <h1 className="text-base font-bold text-white">트랜드 수집기</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-green-400' : 'bg-amber-400'}`} />
          <span className="text-xs text-zinc-400">{hasApiKey ? 'HikerAPI 연결됨' : 'API 키 미설정'}</span>
        </div>
      </header>

      {/* 탭 네비 */}
      <div className="border-b border-zinc-800 px-6 flex gap-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-3 text-sm transition-colors ${
              tab === t.id
                ? 'text-white border-b-2 border-pink-500 font-medium'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="max-w-7xl mx-auto px-4 py-5">
        {tab === 'competitor'  && <CompetitorPanel accounts={accounts} setAccounts={setAccounts} hasApiKey={hasApiKey} />}
        {tab === 'hashtag'     && <HashtagPanel accounts={accounts} hasApiKey={hasApiKey} />}
        {tab === 'history'     && <HistoryChart accounts={accounts} initialSnapshots={initialSnapshots} />}
        {tab === 'discovery'   && <InfluencerDiscovery hasApiKey={hasApiKey} />}
      </main>
    </div>
  )
}
