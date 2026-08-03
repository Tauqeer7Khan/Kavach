import { redirect } from 'next/navigation'

export const metadata = {
  title: 'All Scans | KAVACH',
  description: 'View and manage your security scan history',
}
import Link from 'next/link'
import { PlusCircle, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import ScanTable from '@/components/dashboard/ScanTable'
import { EmptyState } from '@/components/shared/EmptyState'

export default async function ScansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: scans } = await supabase
    .from('scans')
    .select('*, projects(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">All Scans</h1>
          <p className="text-zinc-400 mt-1">
            View and manage your security scan history
          </p>
        </div>
        <Link href="/scans/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Scan
          </Button>
        </Link>
      </div>

      <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-6">
        {(!scans || scans.length === 0) ? (
          <EmptyState
            icon={<Shield className="h-8 w-8 text-zinc-600" />}
            title="No scans yet"
            description="Scan your first project to see security results here"
            actionLabel="Start Your First Scan"
            actionHref="/scans/new"
          />
        ) : (
          <ScanTable scans={scans as never} />
        )}
      </div>
    </div>
  )
}
