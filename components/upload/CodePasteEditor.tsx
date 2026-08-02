'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 bg-zinc-900 border border-zinc-800 rounded-lg animate-pulse flex items-center justify-center">
        <p className="font-mono text-sm text-zinc-500">Loading editor...</p>
      </div>
    ),
  }
)

interface CodePasteEditorProps {
  onCodeChange: (code: string, language: string) => void
}

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'php', label: 'PHP' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'rust', label: 'Rust' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
]

export function CodePasteEditor({ onCodeChange }: CodePasteEditorProps) {
  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState('')

  const handleChange = (value: string | undefined) => {
    const newCode = value || ''
    setCode(newCode)
    onCodeChange(newCode, language)
  }

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang)
    onCodeChange(code, newLang)
  }

  const lineCount = code.split('\n').length
  const charCount = code.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label htmlFor="lang-select" className="font-body font-medium text-sm text-white block mb-2">
            Language
          </label>
          <select
            id="lang-select"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <MonacoEditor
          height="400px"
          language={language}
          value={code}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            lineNumbers: 'on',
            renderLineHighlight: 'none',
            wordWrap: 'on',
          }}
        />
      </div>

      <div className="flex justify-between items-center">
        <p className="font-mono text-xs text-zinc-500">
          {lineCount} lines · {charCount} characters
        </p>
        {charCount > 0 && charCount < 10 && (
          <p className="font-mono text-xs text-amber-400">
            Minimum 10 characters required
          </p>
        )}
      </div>
    </div>
  )
}
