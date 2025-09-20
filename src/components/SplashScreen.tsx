import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onComplete?: () => void
  onPhaseChange?: (phase: 'letters' | 'glow' | 'fade') => void
}

export default function SplashScreen({ onComplete, onPhaseChange }: SplashScreenProps) {
  const [animationPhase, setAnimationPhase] = useState<'letters' | 'glow' | 'fade'>('letters')

  useEffect(() => {
    // Letters come in (3s), then glow (approx 3s), then fade (2s) before completing
    const timer1 = setTimeout(() => {
      setAnimationPhase('glow')
    }, 3000)

    const timer2 = setTimeout(() => {
      setAnimationPhase('fade')
    }, 6000)

    const timer3 = setTimeout(() => {
      onComplete?.()
    }, 8000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [onComplete])

  useEffect(() => {
    // Notify parent of phase changes so it can crossfade the underlying content
    onPhaseChange?.(animationPhase)
  }, [animationPhase, onPhaseChange])

  return (
    <div className="h-screen w-full bg-background flex items-center justify-center overflow-hidden">
      <div className="relative">
        <div className={`letters-container ${animationPhase === 'letters' ? 'animate-letters-come-together' : ''} 
                        ${animationPhase === 'glow' ? 'animate-glow-pulse' : ''}
                        ${animationPhase === 'fade' ? 'animate-fade-out' : ''}`}>
          
          <span className="letter letter-n text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight">N</span>
          <span className="letter letter-x text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight">X</span>
          <span className="letter letter-g text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight">G</span>
          <span className="letter letter-n2 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight">N</span>
          <span className="letter letter-dot text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight">.</span>
        </div>
      </div>
    </div>
  )
}