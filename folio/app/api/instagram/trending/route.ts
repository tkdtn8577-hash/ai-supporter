// folio/app/api/instagram/trending/route.ts
import { NextRequest, NextResponse } from 'next/server'

const HIKER_URL = 'https://api.hikerapi.com/v1'

export async function GET(req: NextRequest) {
  const hashtag = req.nextUrl.searchParams.get('hashtag')?.trim().replace(/^#/, '')
  if (!hashtag) {
    return NextResponse.json({ error: '해시태그를 입력해 주세요' }, { status: 400 })
  }
  if (!process.env.HIKERAPI_KEY) {
    return NextResponse.json({ error: 'HIKERAPI_KEY 환경 변수가 설정되지 않았습니다' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `${HIKER_URL}/hashtag/medias/top?name=${encodeURIComponent(hashtag)}&count=12`,
      {
        headers: { 'x-access-key': process.env.HIKERAPI_KEY, 'accept': 'application/json' },
        cache: 'no-store',
      }
    )
    const data = await res.json() as { response?: { items?: unknown[] }; detail?: string }
    if (!res.ok || data.detail) {
      throw new Error(data.detail ?? '해시태그 조회 실패 (HikerAPI 미지원일 수 있습니다)')
    }
    return NextResponse.json({ items: data.response?.items ?? [] })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '조회 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
