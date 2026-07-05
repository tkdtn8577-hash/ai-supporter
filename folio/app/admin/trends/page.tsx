import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { MonitoredAccount, AccountSnapshot } from '@/lib/types'
import TrendsDashboard from '@/components/admin/trends/TrendsDashboard'

export default async function TrendsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const [{ data: accounts }, { data: snapshots }] = await Promise.all([
    supabase.from('monitored_accounts').select('*').order('created_at', { ascending: true }),
    supabase.from('account_snapshots').select('*').order('captured_at', { ascending: true }),
  ])

  const hasApiKey = !!process.env.HIKERAPI_KEY

  return (
    <TrendsDashboard
      hasApiKey={hasApiKey}
      initialAccounts={(accounts ?? []) as MonitoredAccount[]}
      initialSnapshots={(snapshots ?? []) as AccountSnapshot[]}
    />
  )
}
