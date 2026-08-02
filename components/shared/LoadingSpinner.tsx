import { Loader2 } from 'lucide-react';
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullscreen?: boolean;
}

export function LoadingSpinner({ size = 'md', text, fullscreen = false }: LoadingSpinnerProps) {
  const sizeClass = {
    sm: 'w-4 h-4', // 16px
    md: 'w-6 h-6', // 24px
    lg: 'w-10 h-10' // 40px
  }[size];

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`animate-spin text-[#7C3AED] ${sizeClass}`} />
      {text && (
        <p className="font-mono text-sm text-zinc-400">{text}</p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090B]/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}
