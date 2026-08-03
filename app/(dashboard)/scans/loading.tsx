import { Skeleton } from '@/components/ui/skeleton'

export default function ScansLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 bg-[#111111]" />
          <Skeleton className="h-4 w-32 bg-[#111111]" />
        </div>
        <Skeleton className="h-10 w-32 bg-[#111111]" />
      </div>

      <div className="rounded-xl border border-[#1f1f1f] p-4 space-y-3">
        <Skeleton className="h-10 w-full bg-[#111111]" />
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-14 w-full bg-[#111111]" />
        ))}
      </div>
    </div>
  )
}
