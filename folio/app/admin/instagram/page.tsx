import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InstagramDashboard from '@/components/admin/instagram/Dashboard'

export default async function InstagramPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const hasApiKey = !!process.env.HIKERAPI_KEY

  return <InstagramDashboard hasApiKey={hasApiKey} />
}
