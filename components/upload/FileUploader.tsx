'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileCode } from 'lucide-react'

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  maxSizeMB?: number
}

const ACCEPTED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.php', '.java', '.go',
  '.rb', '.rs', '.c', '.cpp', '.cs', '.html', '.css', '.json',
  '.yaml', '.yml', '.env', '.sql', '.sh'
]

export function FileUploader({ 
  onFilesSelected, 
  maxFiles = 50, 
  maxSizeMB = 10 
}: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)

    if (rejectedFiles.length > 0) {
      setError(`${rejectedFiles.length} file(s) rejected. Check size and type.`)
    }

    const totalSize = [...files, ...acceptedFiles].reduce((sum, f) => sum + f.size, 0)
    const maxBytes = maxSizeMB * 1024 * 1024

    if (totalSize > maxBytes) {
      setError(`Total size exceeds ${maxSizeMB}MB limit`)
      return
    }

    if (files.length + acceptedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`)
      return
    }

    const newFiles = [...files, ...acceptedFiles]
    setFiles(newFiles)
    onFilesSelected(newFiles)
  }, [files, maxFiles, maxSizeMB, onFilesSelected])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/*': ACCEPTED_EXTENSIONS,
    },
    maxSize: maxSizeMB * 1024 * 1024,
  })

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onFilesSelected(newFiles)
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2)

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-[#7C3AED] bg-[#7C3AED]/5'
            : 'border-zinc-800 hover:border-[#7C3AED]/50 hover:bg-zinc-900/30'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragActive ? 'text-[#7C3AED]' : 'text-zinc-600'}`} />
        <p className="font-heading font-semibold text-white text-lg mb-2">
          {isDragActive ? 'Drop your files here' : 'Drop your project files here'}
        </p>
        <p className="font-body text-sm text-zinc-400 mb-1">
          or click to browse
        </p>
        <p className="font-mono text-xs text-zinc-500 mt-4">
          Max {maxFiles} files · {maxSizeMB}MB total · Code files only
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="font-body text-sm text-red-400">{error}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="font-mono text-xs text-zinc-500 uppercase tracking-wider">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </p>
            <p className="font-mono text-xs text-zinc-500">
              {totalSizeMB} MB
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2"
              >
                <FileCode className="h-4 w-4 text-[#8B5CF6] flex-shrink-0" />
                <span className="flex-1 font-mono text-sm text-zinc-300 truncate">
                  {file.name}
                </span>
                <span className="font-mono text-xs text-zinc-500">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
