import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type Inquiry } from '@/lib/types'
import InquiryTable from '@/components/admin/InquiryTable'

export default async function AdminPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: inquiries, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-red-400">데이터를 불러오지 못했습니다: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-white font-semibold text-lg">문의 관리</h1>
          <p className="text-zinc-500 text-sm mt-0.5">총 {inquiries?.length ?? 0}건</p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/admin/instagram"
            className="text-zinc-400 hover:text-white text-sm transition-colors"
          >
            인스타그램 분석
          </a>
          <a
            href="/admin/trends"
            className="text-zinc-400 hover:text-white text-sm transition-colors"
          >
            트랜드 수집기
          </a>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-zinc-500 hover:text-white text-sm transition-colors"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <main className="px-6 py-6">
        <InquiryTable inquiries={inquiries as Inquiry[]} />
      </main>
    </div>
  )
}
