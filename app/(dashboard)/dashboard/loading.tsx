import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72 bg-[#111111]" />
          <Skeleton className="h-4 w-96 bg-[#111111]" />
        </div>
        <Skeleton className="h-10 w-32 bg-[#111111]" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[#111111] border border-[#1f1f1f] 
                                  rounded-xl p-6 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24 bg-zinc-800" />
              <Skeleton className="h-10 w-10 rounded-lg bg-zinc-800" />
            </div>
            <Skeleton className="h-8 w-20 bg-zinc-800" />
            <Skeleton className="h-3 w-32 bg-zinc-800" />
          </div>
        ))}
      </div>

      {/* CTA Card */}
      <Skeleton className="h-32 w-full bg-[#111111]" />

      {/* Recent Scans */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40 bg-[#111111]" />
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-14 w-full bg-[#111111]" />
        ))}
      </div>
    </div>
  )
}
