'use client'

import { useState } from 'react'

interface Post {
  code: string
  like_count: number
  comment_count: number
  media_type: number
  caption?: { text: string }
  taken_at: number
}

interface Props {
  hasApiKey: boolean
}

export default function TopPostsPanel({ hasApiKey }: Props) {
  const [hashtag, setHashtag] = useState('')
  const [loading, setLoading] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [error, setError] = useState('')

  async function search() {
    const tag = hashtag.trim().replace(/^#/, '')
    if (!tag) return
    setLoading(true); setError(''); setPosts([])

    try {
      const res = await fetch(`/api/instagram/trending?hashtag=${encodeURIComponent(tag)}`)
      const data = await res.json() as { items?: Post[]; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? '조회 실패')
      setPosts(data.items ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '조회 실패')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <p className="text-xs text-zinc-500 mb-3">해시태그 인기 게시물 조회 (HikerAPI 해시태그 엔드포인트 사용)</p>
        <div className="flex gap-2">
          <input
            value={hashtag} onChange={e => setHashtag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="#뷰티 또는 뷰티"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition"
          />
          <button
            onClick={search}
            disabled={loading || !hasApiKey || !hashtag.trim()}
            className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>
        {error && (
          <div className="mt-3 bg-red-950/50 border border-red-900/40 rounded-lg p-3 text-xs text-red-400">
            <p className="font-semibold mb-1">조회 실패</p>
            <p>{error}</p>
            <p className="text-red-500/60 mt-1">HikerAPI 해시태그 엔드포인트가 미지원일 수 있습니다. 경쟁사 탭의 해시태그 수집을 사용해 주세요.</p>
          </div>
        )}
      </div>

      {posts.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">#{hashtag.replace(/^#/, '')} 인기 게시물</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {posts.map(p => (
              <a
                key={p.code}
                href={`https://www.instagram.com/p/${p.code}/`}
                target="_blank" rel="noreferrer"
                className="bg-zinc-800 rounded-lg p-3 hover:bg-zinc-700 transition group"
              >
                <div className="text-2xl mb-2">
                  {p.media_type === 2 ? '🎬' : p.media_type === 8 ? '🖼️' : '📷'}
                </div>
                <div className="flex gap-3 text-xs text-zinc-400 mb-2">
                  <span>❤️ {p.like_count.toLocaleString()}</span>
                  <span>💬 {p.comment_count.toLocaleString()}</span>
                </div>
                {p.caption?.text && (
                  <p className="text-xs text-zinc-500 line-clamp-2">{p.caption.text}</p>
                )}
                <p className="text-xs text-zinc-700 mt-1">{new Date(p.taken_at * 1000).toLocaleDateString('ko-KR')}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {!loading && !posts.length && !error && (
        <div className="text-center py-20 text-zinc-600">
          <div className="text-5xl mb-3">🔍</div>
          <p>해시태그를 입력하고 검색하세요</p>
        </div>
      )}
    </div>
  )
}
