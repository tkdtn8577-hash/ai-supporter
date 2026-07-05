'use server'

import { createClient } from '@/lib/supabase/server'

interface InquiryResult {
  success: boolean
  error?: string
}

export async function submitInquiry(formData: FormData): Promise<InquiryResult> {
  const name = formData.get('name')?.toString().trim()
  const phone = formData.get('phone')?.toString().trim()
  const email = formData.get('email')?.toString().trim() || null
  const budget = formData.get('budget')?.toString() || null
  const message = formData.get('message')?.toString().trim()

  if (!name) return { success: false, error: '이름을 입력해 주세요.' }
  if (!phone) return { success: false, error: '연락처를 입력해 주세요.' }
  if (!/^[0-9\-+\s()]{7,15}$/.test(phone)) return { success: false, error: '올바른 연락처 형식을 입력해 주세요.' }
  if (!message) return { success: false, error: '문의 내용을 입력해 주세요.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('inquiries')
    .insert({ name, phone, email, budget, message })

  if (error) return { success: false, error: '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }

  return { success: true }
}
