'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type InquiryStatus } from '@/lib/types'

export async function updateInquiryStatus(id: string, status: InquiryStatus) {
  const supabase = createClient()
  await supabase.from('inquiries').update({ status }).eq('id', id)
  revalidatePath('/admin')
}

export async function deleteInquiry(id: string) {
  const supabase = createClient()
  await supabase.from('inquiries').delete().eq('id', id)
  revalidatePath('/admin')
}
