'use client'

import { useState, useEffect } from 'react'
import MarketingNavbar from './MarketingNavbar'

export default function ClientMarketingNavbar() {
    const [isDark, setIsDark] = useState<boolean>(true)

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme')
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDark(true)
            document.documentElement.classList.add('dark')
        } else if (savedTheme === 'light') {
            setIsDark(false)
            document.documentElement.classList.remove('dark')
        } else {
            setIsDark(true)
            document.documentElement.classList.add('dark')
        }
    }, [])

    const toggleTheme = (): void => {
        const nextTheme = !isDark
        setIsDark(nextTheme)
        if (nextTheme) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }

    return <MarketingNavbar isDark={isDark} toggleTheme={toggleTheme} />
}
