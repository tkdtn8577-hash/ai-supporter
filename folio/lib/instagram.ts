const HIKER_URL = 'https://api.hikerapi.com/v1'

export interface HikerProfile {
  pk: string
  username: string
  full_name?: string
  biography?: string
  follower_count: number
  following_count?: number
  media_count: number
  profile_pic_url?: string
  external_url?: string
  is_private?: boolean
}

export interface HikerMedia {
  pk: string
  code: string
  like_count: number
  comment_count: number
  taken_at: number
  media_type: number
  caption?: { text: string }
}

export interface NormalizedMedia {
  likeCount: number
  commentCount: number
  timestamp: string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  permalink: string
  caption?: string
}

export interface InfluencerData {
  username: string
  name?: string
  biography?: string
  followers: number
  mediaCount: number
  profilePicture?: string
  website?: string
  media: NormalizedMedia[]
}

function hikerHeaders(): Record<string, string> {
  const key = process.env.HIKERAPI_KEY
  if (!key) throw new Error('HIKERAPI_KEY 환경 변수가 설정되지 않았습니다')
  return { 'x-access-key': key, 'accept': 'application/json' }
}

function normalizeMediaType(type: number): 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' {
  if (type === 2) return 'VIDEO'
  if (type === 8) return 'CAROUSEL_ALBUM'
  return 'IMAGE'
}

export async function getProfile(username: string): Promise<HikerProfile> {
  const res = await fetch(
    `${HIKER_URL}/user/by/username?username=${encodeURIComponent(username)}`,
    { headers: hikerHeaders(), cache: 'no-store' }
  )
  const data = await res.json() as HikerProfile & { detail?: string }
  if (!res.ok || data.detail) throw new Error(data.detail ?? `@${username} 프로필 조회 실패`)
  if (!data.pk) throw new Error('비공개 계정이거나 존재하지 않는 계정입니다')
  return data
}

export async function getRecentMedia(userId: string, count = 12): Promise<HikerMedia[]> {
  const res = await fetch(
    `${HIKER_URL}/user/medias/chunk?user_id=${userId}&count=${count}`,
    { headers: hikerHeaders(), cache: 'no-store' }
  )
  const data = await res.json() as { response?: { items?: HikerMedia[] }; detail?: string }
  if (!res.ok || data.detail) throw new Error(data.detail ?? '게시물 조회 실패')
  return data.response?.items ?? []
}

export async function getInfluencerData(username: string): Promise<InfluencerData> {
  const profile = await getProfile(username)
  const rawMedia = await getRecentMedia(profile.pk)

  const media: NormalizedMedia[] = rawMedia.map(m => ({
    likeCount:    m.like_count ?? 0,
    commentCount: m.comment_count ?? 0,
    timestamp:    new Date(m.taken_at * 1000).toISOString(),
    mediaType:    normalizeMediaType(m.media_type),
    permalink:    `https://www.instagram.com/p/${m.code}/`,
    caption:      m.caption?.text,
  }))

  return {
    username:       profile.username,
    name:           profile.full_name,
    biography:      profile.biography,
    followers:      profile.follower_count,
    mediaCount:     profile.media_count,
    profilePicture: profile.profile_pic_url,
    website:        profile.external_url,
    media,
  }
}
