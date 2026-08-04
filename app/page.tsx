'use client'

import { useState, useEffect } from 'react'
import MarketingNavbar from '@/components/marketing/MarketingNavbar'
import HeroSection from '@/components/marketing/HeroSection'
import AutoDemoSection from '@/components/marketing/AutoDemoSection'
import StatsSectionMarketing from '@/components/marketing/StatsSectionMarketing'
import HowItWorksSection from '@/components/marketing/HowItWorksSection'
import FeaturesSection from '@/components/marketing/FeaturesSection'
import FAQSection from '@/components/marketing/FAQSection'

import FooterMarketing from '@/components/marketing/FooterMarketing'

export default function LandingPage() {
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -1000, y: -1000 })
    const [showCursor, setShowCursor] = useState<boolean>(false)

    useEffect(() => {
        const checkCursorVisibility = (): void => {
            const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
            const isDesktop = window.innerWidth >= 1024
            setShowCursor(isDesktop && !isTouch)
        }
        checkCursorVisibility()
        window.addEventListener('resize', checkCursorVisibility)
        return () => window.removeEventListener('resize', checkCursorVisibility)
    }, [])

    useEffect(() => {
        if (!showCursor) return
        const handleMouseMove = (e: MouseEvent): void => setMousePos({ x: e.clientX, y: e.clientY })
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [showCursor])

    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#09090B] text-[#18181B] dark:text-[#FAFAF9] transition-colors duration-300 font-body selection:bg-[#7C3AED]/30">
            {showCursor && (
                <div
                    className="cursor-glow hidden lg:block"
                    style={{ left: mousePos.x, top: mousePos.y }}
                />
            )}

            <MarketingNavbar />

            <main>
                <HeroSection />
                <AutoDemoSection />
                <StatsSectionMarketing />
                <HowItWorksSection />
                <FeaturesSection />
                <FAQSection />

            </main>

            <FooterMarketing />
        </div>
    )
}