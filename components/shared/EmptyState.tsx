"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref
}: EmptyStateProps) {
  const buttonContent = actionLabel && (
    <button
      onClick={onAction}
      className="bg-gradient-to-b from-[#8B5CF6] to-[#7C3AED] text-white px-6 py-2.5 rounded-lg font-heading font-semibold text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/25 transition-all"
    >
      {actionLabel}
    </button>
  );

  return (
    <div className="flex flex-col items-center justify-center p-8 h-full min-h-[400px]">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-[#27272A] flex items-center justify-center mb-6">
        <Icon className="h-8 w-8 text-zinc-600" />
      </div>
      <h3 className="font-heading font-semibold text-xl text-white mb-2">{title}</h3>
      <p className="font-body text-sm text-zinc-400 mb-6 max-w-md text-center">{description}</p>
      
      {actionLabel && (
        actionHref ? (
          <Link href={actionHref}>
            {buttonContent}
          </Link>
        ) : (
          buttonContent
        )
      )}
    </div>
  );
}
