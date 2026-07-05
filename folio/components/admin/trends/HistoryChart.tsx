'use client'

import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend
} from 'chart.js'
import type { MonitoredAccount, AccountSnapshot } from '@/lib/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface Props {
  accounts: MonitoredAccount[]
  initialSnapshots: AccountSnapshot[]
}

export default function HistoryChart({ accounts, initialSnapshots }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? '')
  const [metric, setMetric] = useState<'followers' | 'er'>('followers')

  const snapshots = initialSnapshots
    .filter(s => s.account_id === selectedAccountId)
    .sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime())

  const labels = snapshots.map(s =>
    new Date(s.captured_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  )

  const dataValues = metric === 'followers'
    ? snapshots.map(s => s.followers)
    : snapshots.map(s => s.followers > 0 ? ((s.avg_likes + s.avg_comments) / s.followers) * 100 : 0)

  if (!accounts.length) {
    return (
      <div className="text-center py-20 text-zinc-600">
        <div className="text-5xl mb-3">📈</div>
        <p>경쟁사 계정을 등록하고 갱신하면 히스토리가 쌓입니다</p>
        <p className="text-sm mt-1 text-zinc-700">Vercel Cron이 매일 09:00 KST에 자동 수집합니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-wrap gap-3 items-center">
        <select
          value={selectedAccountId}
          onChange={e => setSelectedAccountId(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition"
        >
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.label ?? a.username}</option>
          ))}
        </select>

        <div className="flex rounded-lg overflow-hidden border border-zinc-700">
          {(['followers', 'er'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                metric === m ? 'bg-pink-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {m === 'followers' ? '팔로워' : '참여율'}
            </button>
          ))}
        </div>
      </div>

      {snapshots.length < 2 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-10 text-center text-zinc-600">
          <p>히스토리 데이터가 2개 이상 있어야 차트를 표시합니다</p>
          <p className="text-sm mt-1 text-zinc-700">Cron이 매일 스냅샷을 저장합니다</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">
            {accounts.find(a => a.id === selectedAccountId)?.label ?? selectedAccountId} —{' '}
            {metric === 'followers' ? '팔로워 추이' : '참여율 추이'}
          </h3>
          <Line
            data={{
              labels,
              datasets: [{
                label: metric === 'followers' ? '팔로워' : '참여율 (%)',
                data: dataValues,
                borderColor: '#ec4899',
                backgroundColor: '#ec489920',
                tension: 0.3,
                pointRadius: 3,
              }]
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { color: '#27272a' } },
                y: {
                  ticks: {
                    color: '#9ca3af',
                    callback: v => metric === 'followers' ? Number(v).toLocaleString() : v + '%'
                  },
                  grid: { color: '#27272a' }
                }
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
