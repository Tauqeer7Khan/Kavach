import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, FolderOpen, Upload, Code } from 'lucide-react'
import { GithubIcon } from '@/components/shared/GithubIcon'
import { createClient } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'

interface Project {
  id: string
  name: string
  source_type: string
  primary_language: string | null
  total_scans: number | null
  last_scan_score: number | null
  created_at: string
}

function sourceIcon(type: string) {
  if (type === 'github') return <GithubIcon className="h-4 w-4" size={16} />
  if (type === 'paste') return <Code className="h-4 w-4" />
  return <Upload className="h-4 w-4" />
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-zinc-500'
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {projects?.length ?? 0} projects
          </p>
        </div>
        <Link href="/scans/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Scan
          </Button>
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-8 w-8 text-zinc-600" />}
          title="No projects yet"
          description="Projects are created automatically when you run your first scan"
          actionLabel="Start Your First Scan"
          actionHref="/scans/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(projects as Project[]).map(project => (
            <div
              key={project.id}
              className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5 
                         hover:border-zinc-700 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-zinc-400">
                  {sourceIcon(project.source_type)}
                  <span className="text-xs text-zinc-500 capitalize">
                    {project.source_type}
                  </span>
                </div>
                {project.primary_language && (
                  <Badge className="bg-zinc-800 text-zinc-300 border-0 text-xs">
                    {project.primary_language}
                  </Badge>
                )}
              </div>

              <h3 className="font-semibold text-white mb-1 
                             group-hover:text-indigo-300 transition-colors">
                {project.name}
              </h3>

              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-zinc-500">
                  {project.total_scans ?? 0} scans
                </div>
                {project.last_scan_score !== null && (
                  <span className={`text-sm font-bold ${scoreColor(project.last_scan_score)}`}>
                    {project.last_scan_score}/100
                  </span>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#1f1f1f]">
                <Link href="/scans/new">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-zinc-400 
                               hover:text-white hover:bg-white/5"
                  >
                    Scan Now →
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
