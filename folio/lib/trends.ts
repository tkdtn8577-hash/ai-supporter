// folio/lib/trends.ts
import type { InfluencerData } from '@/lib/instagram'

/**
 * 게시물 캡션 배열에서 해시태그 빈도 맵 추출
 * 반환: { '#뷰티': 12, '#화장품': 8 }
 */
export function extractHashtags(captions: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const caption of captions) {
    const tags = caption.match(/#[\w가-힣]+/g) ?? []
    for (const tag of tags) {
      const lower = tag.toLowerCase()
      map[lower] = (map[lower] ?? 0) + 1
    }
  }
  return map
}

/**
 * 여러 계정의 InfluencerData에서 해시태그를 집계하여 빈도 맵 반환
 * 상위 50개 해시태그만 반환 (빈도 내림차순)
 */
export function collectHashtagTrends(
  results: InfluencerData[]
): Record<string, number> {
  const allCaptions = results.flatMap(r => r.media.map(m => m.caption ?? ''))
  const raw = extractHashtags(allCaptions)

  return Object.fromEntries(
    Object.entries(raw)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50)
  )
}
