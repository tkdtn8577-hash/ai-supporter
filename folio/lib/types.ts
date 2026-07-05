export type InquiryStatus = 'new' | 'checked' | 'done'

export interface Inquiry {
  id: string
  name: string
  phone: string
  email: string | null
  budget: string | null
  message: string
  status: InquiryStatus
  created_at: string
}

export type BudgetOption =
  | '150만원 미만'
  | '150~300만원'
  | '300~500만원'
  | '500만원 이상'
  | '미정'

export interface Work {
  id: string
  title: string
  category: '웹사이트' | '랜딩페이지' | '쇼핑몰'
  thumbnail: string
  url?: string
}

export interface TrendKeyword {
  id: string
  keyword: string
  category: string | null
  is_active: boolean
  created_at: string
}

export interface TrendSnapshot {
  id: string
  keyword_id: string
  frequency: number
  captured_at: string
}

export interface MonitoredAccount {
  id: string
  username: string
  label: string | null
  created_at: string
}

export interface AccountSnapshot {
  id: string
  account_id: string
  followers: number
  avg_likes: number
  avg_comments: number
  captured_at: string
}
