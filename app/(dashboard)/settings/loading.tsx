import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32 bg-white dark:bg-[#111111]" />
        <Skeleton className="h-4 w-64 bg-white dark:bg-[#111111]" />
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#1f1f1f] rounded-xl p-6 
                      space-y-4">
        <Skeleton className="h-5 w-20 bg-zinc-100 dark:bg-zinc-800" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full bg-zinc-100 dark:bg-zinc-800" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 bg-zinc-100 dark:bg-zinc-800" />
            <Skeleton className="h-4 w-48 bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-5 w-full bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      </div>

      {/* Usage Card */}
      <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#1f1f1f] rounded-xl p-6 
                      space-y-4">
        <Skeleton className="h-5 w-32 bg-zinc-100 dark:bg-zinc-800" />
        <Skeleton className="h-4 w-full bg-zinc-100 dark:bg-zinc-800" />
        <Skeleton className="h-2 w-full bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </div>
  )
}
