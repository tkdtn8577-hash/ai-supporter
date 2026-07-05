import { NextRequest, NextResponse } from 'next/server'
import { getInfluencerData } from '@/lib/instagram'

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.trim().replace(/^@/, '')
  if (!username) {
    return NextResponse.json({ error: '계정명을 입력해 주세요' }, { status: 400 })
  }
  if (!process.env.HIKERAPI_KEY) {
    return NextResponse.json({ error: 'HIKERAPI_KEY 환경 변수가 설정되지 않았습니다' }, { status: 500 })
  }

  try {
    const data = await getInfluencerData(username)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '조회 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
