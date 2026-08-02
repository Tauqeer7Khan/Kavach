'use client'

import { useId } from 'react'

interface KavachLogoProps {
  className?: string
  size?: number
}

export function KavachLogo({ className = '', size = 32 }: KavachLogoProps) {
  const reactId = useId()
  // Sanitize the id since useId returns strings with ":" that are 
  // invalid in SVG url() references in some browsers
  const gradientId = `kavach-gradient-${reactId.replace(/:/g, '')}`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 2L4 8V16C4 22.6274 9.37258 28 16 30C22.6274 28 28 22.6274 28 16V8L16 2Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M11 15L14.5 18.5L21 12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id={gradientId}
          x1="4"
          y1="2"
          x2="28"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
    </svg>
  )
}
