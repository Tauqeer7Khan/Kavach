'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useScan } from '@/hooks/useScan'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Upload, Code2, Shield, CheckCircle2 } from 'lucide-react'
import { GithubIcon } from '@/components/shared/GithubIcon'
import { FileUploader } from '@/components/upload/FileUploader'
import { GitHubConnect } from '@/components/upload/GitHubConnect'
import { CodePasteEditor } from '@/components/upload/CodePasteEditor'

export default function NewScanPage() {
  const router = useRouter()
  const { createScan, isCreating } = useScan()
  const { toast } = useToast()

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [r2Key, setR2Key] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)

  // GitHub state  
  const [repoUrl, setRepoUrl] = useState<string>('')
  const [repoValidated, setRepoValidated] = useState<boolean>(false)

  // Paste state
  const [pastedCode, setPastedCode] = useState<string>('')
  const [pasteLanguage, setPasteLanguage] = useState<string>('javascript')

  // Project name
  const [projectName, setProjectName] = useState<string>('My Project')

  // Active tab
  const [activeTab, setActiveTab] = useState<'upload' | 'github' | 'paste'>('paste')

  const handleFileUpload = useCallback(async (files: File[]): Promise<void> => {
    if (files.length === 0) return
    setUploadedFiles(files)
    setIsUploading(true)

    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json() as { error?: string }
        throw new Error(err.error ?? 'Upload failed')
      }

      const data = await res.json() as { r2Key: string; fileCount: number }
      setR2Key(data.r2Key)

      toast({
        title: 'Files uploaded!',
        description: `${data.fileCount} files ready to scan`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      toast({ title: 'Upload failed', description: message, variant: 'destructive' })
      setUploadedFiles([])
    } finally {
      setIsUploading(false)
    }
  }, [toast])

  const handleStartScan = useCallback(async (): Promise<void> => {
    if (!projectName.trim()) {
      toast({ title: 'Project name required', variant: 'destructive' })
      return
    }

    let scanId: string | null = null

    if (activeTab === 'upload' && r2Key) {
      scanId = await createScan({
        sourceType: 'upload',
        projectName: projectName.trim(),
        r2Key,
      })
    } else if (activeTab === 'github' && repoValidated && repoUrl) {
      scanId = await createScan({
        sourceType: 'github',
        projectName: projectName.trim(),
        repoUrl,
      })
    } else if (activeTab === 'paste' && pastedCode.length >= 10) {
      scanId = await createScan({
        sourceType: 'paste',
        projectName: projectName.trim(),
        pastedCode,
        language: pasteLanguage,
      })
    } else {
      toast({
        title: 'Nothing to scan',
        description: 'Please upload files, enter a GitHub URL, or paste code first.',
        variant: 'destructive',
      })
      return
    }

    if (scanId) {
      toast({ title: '🛡️ Scan started!', description: 'Redirecting to your report...' })
      router.push(`/scans/${scanId}`)
    }
  }, [activeTab, r2Key, repoUrl, repoValidated, pastedCode, pasteLanguage, projectName, createScan, router, toast])

  const isStartEnabled: boolean = 
    (activeTab === 'upload' && r2Key !== null && !isUploading) ||
    (activeTab === 'github' && repoValidated) ||
    (activeTab === 'paste' && pastedCode.length >= 10)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-heading font-bold text-3xl md:text-4xl text-zinc-900 dark:text-white tracking-tight">
          New Security Scan
        </h1>
        <p className="font-body text-zinc-600 dark:text-zinc-400 text-base mt-2">
          Upload your AI-generated code to find security vulnerabilities
        </p>
      </div>

      <div className="bg-white dark:bg-[#0f0f10] border border-zinc-200 dark:border-[#27272A] rounded-2xl p-6 md:p-8 unique-card">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'github' | 'paste')} className="flex flex-col w-full">
          <TabsList className="grid grid-cols-3 w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-1 rounded-lg mb-2">
            {/* Upload — Coming Soon */}
            <div
              title="Available soon — currently in development"
              className="relative flex items-center justify-center gap-1 opacity-50 cursor-not-allowed px-3 py-1.5 rounded-md text-sm font-heading font-medium text-zinc-500 dark:text-zinc-400"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Files</span>
              <span className="ml-1 text-[9px] font-bold tracking-wide uppercase bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded px-1 py-px leading-none">
                Soon
              </span>
            </div>

            {/* GitHub — Coming Soon */}
            <div
              title="Available soon — currently in development"
              className="relative flex items-center justify-center gap-1 opacity-50 cursor-not-allowed px-3 py-1.5 rounded-md text-sm font-heading font-medium text-zinc-500 dark:text-zinc-400"
            >
              <GithubIcon className="h-4 w-4" size={16} />
              <span>GitHub Repo</span>
              <span className="ml-1 text-[9px] font-bold tracking-wide uppercase bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded px-1 py-px leading-none">
                Soon
              </span>
            </div>

            {/* Paste Code — Active */}
            <TabsTrigger
              value="paste"
              className="font-heading font-medium data-[state=active]:bg-gradient-to-b data-[state=active]:from-[#8B5CF6] data-[state=active]:to-[#7C3AED] data-[state=active]:text-white data-[state=active]:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
            >
              <Code2 className="h-4 w-4 mr-2" />
              Paste Code
            </TabsTrigger>
          </TabsList>

          <p className="text-xs text-zinc-500 dark:text-zinc-500 font-mono mb-4">
            💡 Currently supporting paste. GitHub &amp; Upload coming in v2!
          </p>

          <TabsContent value="upload" className="mt-0 block w-full">
            {isUploading ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C3AED] mb-4"></div>
                <p className="text-zinc-600 dark:text-zinc-400 font-mono text-sm">Uploading files...</p>
              </div>
            ) : r2Key ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-emerald-900/50 rounded-lg bg-emerald-900/10">
                <CheckCircle2 className="h-12 w-12 text-[#34D399] mb-4" />
                <p className="text-[#34D399] font-mono text-sm">{uploadedFiles.length} files ready</p>
              </div>
            ) : (
              <FileUploader 
                onFilesSelected={handleFileUpload}
                maxFiles={50}
                maxSizeMB={10}
              />
            )}
          </TabsContent>

          <TabsContent value="github" className="mt-0 block w-full">
            <GitHubConnect 
              onRepoValidated={(url) => { setRepoUrl(url); setRepoValidated(true) }}
            />
          </TabsContent>

          <TabsContent value="paste" className="mt-0 block w-full">
            <CodePasteEditor 
              onCodeChange={(code, lang) => { setPastedCode(code); setPasteLanguage(lang) }}
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="bg-white dark:bg-[#0f0f10] border border-zinc-200 dark:border-[#27272A] rounded-2xl p-6 md:p-8 unique-card space-y-6">
        <div>
          <label htmlFor="project-name" className="font-body font-medium text-sm text-zinc-900 dark:text-white block mb-2">
            Project Name
          </label>
          <Input
            id="project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. My Payment Gateway"
            className="bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-600 font-body focus-visible:ring-[#7C3AED] focus-visible:ring-offset-0"
          />
          <p className="font-mono text-xs text-zinc-500 dark:text-zinc-500 mt-2">
            Give your scan a memorable name to find it later
          </p>
        </div>

        <button
          disabled={!isStartEnabled || isCreating}
          className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-heading font-semibold text-base transition-all ${
            isStartEnabled && !isCreating
              ? 'bg-gradient-to-b from-[#8B5CF6] to-[#7C3AED] text-zinc-900 dark:text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:scale-[1.01] hover:shadow-lg hover:shadow-purple-500/25 cursor-pointer'
              : 'bg-zinc-900 text-zinc-600 border border-zinc-200 dark:border-zinc-800 cursor-not-allowed'
          }`}
          onClick={handleStartScan}
        >
          <Shield className="h-5 w-5" />
          {isCreating ? 'Starting Scan...' : isUploading ? 'Uploading...' : 'Start Security Scan'}
        </button>
      </div>
    </div>
  )
}
