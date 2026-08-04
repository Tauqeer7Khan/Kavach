import { Skeleton } from '@/components/ui/skeleton'

export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 bg-white dark:bg-[#111111]" />
          <Skeleton className="h-4 w-24 bg-white dark:bg-[#111111]" />
        </div>
        <Skeleton className="h-10 w-32 bg-white dark:bg-[#111111]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#1f1f1f] 
                                  rounded-xl p-5 space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20 bg-zinc-100 dark:bg-zinc-800" />
              <Skeleton className="h-5 w-16 bg-zinc-100 dark:bg-zinc-800" />
            </div>
            <Skeleton className="h-6 w-32 bg-zinc-100 dark:bg-zinc-800" />
            <div className="flex justify-between pt-4">
              <Skeleton className="h-4 w-16 bg-zinc-100 dark:bg-zinc-800" />
              <Skeleton className="h-6 w-14 bg-zinc-100 dark:bg-zinc-800" />
            </div>
            <Skeleton className="h-8 w-full bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  )
}
