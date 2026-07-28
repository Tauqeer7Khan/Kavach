'use client'

import { useUser } from '@/hooks/useUser'
import { signOut } from '@/lib/auth'

export default function DashboardPage() {
  const { user, loading } = useUser()

  if (loading) {
    return <div className="p-8 min-h-screen bg-[#0a0a0a] text-white">Loading...</div>
  }

  return (
    <div className="p-8 min-h-screen bg-[#0a0a0a] text-white">
      <h1 className="text-2xl font-bold mb-4">Welcome to KAVACH Dashboard</h1>
      
      {user && (
        <p className="mb-6 text-gray-400">
          Logged in as: {user.email}
        </p>
      )}
      
      <button 
        onClick={signOut}
        className="bg-white text-black hover:bg-gray-200 transition-colors px-4 py-2 rounded-md font-medium"
      >
        Sign Out
      </button>
    </div>
  )
}
