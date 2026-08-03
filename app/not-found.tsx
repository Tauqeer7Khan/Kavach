import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center 
                    px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Big 404 with Shield */}
        <div className="relative inline-block">
          <div className="text-8xl font-bold text-transparent bg-clip-text 
                          bg-gradient-to-b from-indigo-500 to-purple-600">
            404
          </div>
          <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 
                             -translate-y-1/2 h-16 w-16 text-white/5" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Page not found
          </h1>
          <p className="text-zinc-400">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/dashboard">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white 
                               w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/">
            <Button
              variant="outline"
              className="border-[#1f1f1f] text-zinc-300 hover:bg-white/5 
                         bg-transparent w-full sm:w-auto"
            >
              Landing Page
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
