import type { InfluencerData, NormalizedMedia } from '@/lib/instagram'

// ── 상수 ──────────────────────────────────────────────────────────────────────

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '뷰티':       ['beauty','makeup','뷰티','화장','메이크업','스킨케어','skincare','파운데이션','립스틱','cosmetic','아이섀도','쿠션'],
  '패션':       ['fashion','style','ootd','패션','스타일','옷','코디','outfit','트렌드','trend','clothing','룩','신발','가방'],
  '음식':       ['food','맛집','먹스타그램','음식','recipe','요리','foodie','카페','restaurant','맛스타그램','먹방','베이킹','디저트'],
  '여행':       ['travel','여행','trip','해외여행','traveler','여행스타그램','wanderlust','explore','vacation','휴가','관광'],
  '피트니스':   ['fitness','workout','gym','운동','헬스','health','diet','다이어트','exercise','muscle','근육','필라테스','요가'],
  '육아':       ['육아','mom','baby','아기','엄마','맘스타그램','parenting','아이','dad','아빠','kid','육아맘','임산부','출산'],
  '라이프스타일':['lifestyle','일상','데일리','daily','life','라이프','vlog','브이로그','힐링'],
  'IT/테크':    ['tech','테크','technology','coding','developer','it','개발','startup','스타트업','ai','인공지능','프로그래밍'],
  '반려동물':   ['pet','강아지','고양이','dog','cat','펫스타그램','반려견','반려묘','puppy','kitten','댕댕이'],
  '인테리어':   ['interior','인테리어','home','홈','decor','집꾸미기','homedecor','홈데코','furniture','가구','셀프인테리어'],
}

export const TIER_BENCHMARK = { nano: 6.0, micro: 3.5, macro: 1.8, mega: 0.8 }
export const TIER_LABEL     = { nano: '나노', micro: '마이크로', macro: '매크로', mega: '메가' }
export const TIER_COLOR     = { nano: 'text-green-400', micro: 'text-blue-400', macro: 'text-purple-400', mega: 'text-yellow-400' }
export const TIER_BG        = { nano: 'bg-green-900/40', micro: 'bg-blue-900/40', macro: 'bg-purple-900/40', mega: 'bg-yellow-900/40' }
export const PALETTE        = ['#ec4899','#a855f7','#f97316','#22c55e','#3b82f6','#eab308','#14b8a6','#f43f5e','#8b5cf6','#06b6d4']

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type Tier = 'nano' | 'micro' | 'macro' | 'mega'

export interface InfluencerResult {
  username: string
  name?: string
  biography?: string
  followers: number
  mediaCount: number
  profilePicture?: string
  website?: string
  tier: Tier
  avgLikes: number
  avgComments: number
  engagementRate: number
  postsPerWeek: number
  erScore: number
  categoryScore: number
  activityScore: number
  followerScore: number
  overallScore: number
  explanation: string
  recentMedia: NormalizedMedia[]
  rank: number
  error?: string
}

// ── 채점 유틸 ─────────────────────────────────────────────────────────────────

export function getTier(n: number): Tier {
  if (n >= 1_000_000) return 'mega'
  if (n >= 100_000)   return 'macro'
  if (n >= 10_000)    return 'micro'
  return 'nano'
}

export function formatNum(n: number): string {
  if (n >= 100_000_000) return (n / 100_000_000).toFixed(1) + '억'
  if (n >= 10_000)      return (n / 10_000).toFixed(1) + '만'
  if (n >= 1_000)       return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

export function calcCategoryScore(text: string, target: string): number {
  let keywords: string[] = []
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat.includes(target) || target.includes(cat)) { keywords = words; break }
  }
  if (!keywords.length) keywords = [target.toLowerCase()]
  let matches = 0
  keywords.forEach(kw => { matches += Math.min((text.match(new RegExp(kw, 'gi')) || []).length, 4) })
  return Math.min(100, Math.round(matches * 7))
}

export function calcPostsPerWeek(media: NormalizedMedia[]): number {
  if (media.length < 2) return 0
  const dates = media.map(m => new Date(m.timestamp).getTime()).sort((a, b) => b - a)
  const days = (dates[0] - dates[dates.length - 1]) / 86_400_000
  return days === 0 ? media.length : (media.length / days) * 7
}

export function calcActivityScore(ppw: number): number {
  if (ppw >= 3 && ppw <= 7) return 100
  if (ppw >= 1 && ppw < 3)  return 72
  if (ppw > 7)               return 60
  if (ppw >= 0.5)            return 38
  return 18
}

export function buildExplanation(
  username: string, followers: number, tier: Tier,
  engagementRate: number, erRatio: number, categoryScore: number,
  postsPerWeek: number, category: string
): string {
  const tl = TIER_LABEL[tier]
  const bm = TIER_BENCHMARK[tier]
  const parts: string[] = []
  parts.push(`@${username}은(는) 팔로워 ${formatNum(followers)}명의 ${tl} 인플루언서입니다.`)

  if (erRatio >= 2)        parts.push(`참여율 ${engagementRate.toFixed(2)}%로 동급 평균(${bm.toFixed(1)}%) 대비 ${erRatio.toFixed(1)}배 높은 뛰어난 팔로워 충성도를 보유하고 있습니다.`)
  else if (erRatio >= 1.2) parts.push(`참여율 ${engagementRate.toFixed(2)}%로 업계 평균을 상회하는 준수한 팬덤 반응을 보유하고 있습니다.`)
  else if (erRatio >= 0.8) parts.push(`참여율 ${engagementRate.toFixed(2)}%로 업계 평균 수준의 안정적인 참여도를 유지하고 있습니다.`)
  else                     parts.push(`참여율 ${engagementRate.toFixed(2)}%로 업계 평균보다 낮아 팔로워 활성도 추가 검토가 필요합니다.`)

  if (categoryScore >= 70)      parts.push(`${category} 카테고리와의 콘텐츠 연관성이 매우 높으며 핵심 키워드가 다수 확인됩니다.`)
  else if (categoryScore >= 35) parts.push(`${category} 관련 콘텐츠를 꾸준히 다루고 있어 타겟 독자와의 접점이 있습니다.`)
  else                          parts.push(`${category} 카테고리와의 직접적 연관성은 낮지만 팔로워층 분석을 통한 추가 검토를 권장합니다.`)

  if (postsPerWeek >= 3)      parts.push(`주 ${postsPerWeek.toFixed(1)}회의 활발한 게시 활동으로 팔로워와 지속적 소통이 이뤄지고 있습니다.`)
  else if (postsPerWeek >= 1) parts.push(`주 ${postsPerWeek.toFixed(1)}회의 꾸준한 게시 빈도를 유지하고 있습니다.`)

  return parts.join(' ')
}

export function scoreInfluencer(data: InfluencerData, category: string): Omit<InfluencerResult, 'rank' | 'error'> {
  const media    = data.media
  const postCount = media.length || 1
  const avgLikes    = media.reduce((s, m) => s + m.likeCount, 0) / postCount
  const avgComments = media.reduce((s, m) => s + m.commentCount, 0) / postCount
  const followers   = data.followers || 1

  const engagementRate = ((avgLikes + avgComments) / followers) * 100
  const tier           = getTier(followers)
  const benchmark      = TIER_BENCHMARK[tier]
  const erRatio        = engagementRate / benchmark
  const erScore        = Math.min(100, Math.round(erRatio * 50 + 25))

  const allText       = [data.biography ?? '', ...media.map(m => m.caption ?? '')].join(' ').toLowerCase()
  const catTarget     = category || '전체'
  const categoryScore = category ? calcCategoryScore(allText, catTarget) : 50
  const postsPerWeek  = calcPostsPerWeek(media)
  const activityScore = calcActivityScore(postsPerWeek)
  const followerScore = ({ nano: 68, micro: 100, macro: 82, mega: 60 } as Record<Tier, number>)[tier]
  const overallScore  = Math.round(erScore * 0.40 + categoryScore * 0.30 + activityScore * 0.15 + followerScore * 0.15)

  return {
    username:       data.username,
    name:           data.name,
    biography:      data.biography,
    followers:      data.followers,
    mediaCount:     data.mediaCount,
    profilePicture: data.profilePicture,
    website:        data.website,
    tier,
    avgLikes:    Math.round(avgLikes),
    avgComments: Math.round(avgComments),
    engagementRate,
    postsPerWeek,
    erScore, categoryScore, activityScore, followerScore, overallScore,
    explanation: buildExplanation(data.username, followers, tier, engagementRate, erRatio, categoryScore, postsPerWeek, catTarget),
    recentMedia: media.slice(0, 6),
  }
}
