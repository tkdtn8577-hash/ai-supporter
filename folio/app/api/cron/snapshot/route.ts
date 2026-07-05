// folio/app/api/cron/snapshot/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getInfluencerData } from '@/lib/instagram'

// Supabase service role 클라이언트 (RLS 우회용)
// Vercel 환경변수에 SUPABASE_SERVICE_ROLE_KEY 등록 필요
// (Supabase 프로젝트 설정 → API → service_role 키)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  // CRON_SECRET 검증
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let supabase: ReturnType<typeof getServiceClient>
  try {
    supabase = getServiceClient()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Supabase client init failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // 모니터링 계정 목록 조회
  const { data: accounts, error: accErr } = await supabase
    .from('monitored_accounts')
    .select('id, username')

  if (accErr) {
    return NextResponse.json({ error: accErr.message }, { status: 500 })
  }

  const results: { username: string; status: string }[] = []

  for (const account of accounts ?? []) {
    try {
      const data = await getInfluencerData(account.username)
      const media = data.media
      const avgLikes = media.length
        ? media.reduce((s, m) => s + m.likeCount, 0) / media.length
        : 0
      const avgComments = media.length
        ? media.reduce((s, m) => s + m.commentCount, 0) / media.length
        : 0

      await supabase.from('account_snapshots').insert({
        account_id:   account.id,
        followers:    data.followers,
        avg_likes:    Math.round(avgLikes * 100) / 100,
        avg_comments: Math.round(avgComments * 100) / 100,
      })

      results.push({ username: account.username, status: 'ok' })

      // API rate limit 방지
      await new Promise(r => setTimeout(r, 600))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'error'
      results.push({ username: account.username, status: `error: ${msg}` })
    }
  }

  return NextResponse.json({
    captured_at: new Date().toISOString(),
    results,
  })
}
