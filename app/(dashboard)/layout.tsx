"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, Search, FolderOpen, Settings, LogOut, Menu } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { KavachLogo } from '@/components/shared/KavachLogo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import ThemeToggle from '@/components/shared/ThemeToggle';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Close sheet on navigation
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  async function handleSignout() {
    await fetch('/api/auth/signout', { method: 'POST' });
    window.location.href = '/login';
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/scans/new', label: 'New Scan', icon: PlusCircle },
    { href: '/scans', label: 'My Scans', icon: Search },
    { href: '/projects', label: 'Projects', icon: FolderOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/scans/new') return pathname === '/scans/new';
    if (href === '/scans') return (pathname === '/scans' || pathname.startsWith('/scans/')) && pathname !== '/scans/new';
    if (href === '/projects') return pathname === '/projects';
    if (href === '/settings') return pathname === '/settings';
    return false;
  };

  const SidebarContent = () => (
    <>
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <KavachLogo size={28} />
          <span className="font-heading font-bold text-xl tracking-tight text-zinc-900 dark:text-white">KAVACH</span>
          <span className="font-mono text-[10px] bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 mt-1">
            BETA
          </span>
        </Link>
        <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 mt-1">AI Code Security</p>
      </div>

      <nav className="mt-8 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                active
                  ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-l-2 border-[#7C3AED] shadow-[inset_0_0_20px_rgba(124,58,237,0.1)]'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-body font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-6 border-t border-[#27272A]">
        <div className="bg-zinc-100 dark:bg-[#111111] rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-center mb-3">
            <span className="font-mono text-[10px] bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded uppercase tracking-wider">
              {user?.plan?.toUpperCase() || 'FREE'} PLAN
            </span>
            <Link
                href="/settings"
                className="font-mono text-[10px] text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 cursor-pointer"
              >
                Upgrade
              </Link>
          </div>

          <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400 mb-2">Scans this month</p>
          <div className="h-1.5 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, ((user?.scans_used_this_month || 0) / (user?.scans_limit || 15)) * 100)}%` }}
            />
          </div>
          
          <div className="mt-2 flex justify-between">
            <span className="font-mono text-xs text-zinc-900 dark:text-white">
              {user?.scans_used_this_month || 0} of {user?.scans_limit || 15}
            </span>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {Math.round(((user?.scans_used_this_month || 0) / (user?.scans_limit || 15)) * 100)}%
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
            {loading ? (
              <Skeleton className="w-full h-full bg-zinc-700" />
            ) : user?.avatar_url ? (
              <Image src={user.avatar_url} alt={user.name ?? 'Avatar'} width={32} height={32} className="w-full h-full object-cover" unoptimized />
            ) : (
              <span className="font-heading text-sm text-zinc-900 dark:text-white">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            {loading ? (
              <>
                <Skeleton className="h-4 w-24 bg-zinc-700 mb-1" />
                <Skeleton className="h-3 w-32 bg-zinc-700" />
              </>
            ) : (
              <>
                <p className="font-body font-medium text-sm text-zinc-900 dark:text-white truncate">
                  {user?.name || 'User'}
                </p>
                <p className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  {user?.email || ''}
                </p>
              </>
            )}
          </div>

          <ThemeToggle />
          <button 
            onClick={handleSignout} 
            className="text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition-colors p-1"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#0a0a0a] text-zinc-900 dark:text-white transition-colors duration-300">
      {/* Mobile Hamburger Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-[#0f0f10] border-b border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-4">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger className="p-2 rounded-lg bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0 bg-white dark:bg-[#0f0f10] border-r border-zinc-200 dark:border-zinc-800 flex flex-col [&>button]:hidden">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <KavachLogo size={24} />
          <span className="font-heading font-bold text-lg tracking-tight text-zinc-900 dark:text-white">KAVACH</span>
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex fixed left-0 top-0 h-screen w-60 z-40 bg-white dark:bg-[#0f0f10] border-r border-zinc-200 dark:border-zinc-800 flex-col">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <main className="md:pl-60 min-h-screen">
        <div className="p-4 pt-20 md:p-8 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
