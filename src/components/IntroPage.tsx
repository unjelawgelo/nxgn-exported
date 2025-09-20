import { useEffect, useState } from 'react'

interface IntroPageProps {
  onComplete: () => void
}

export default function IntroPage({ onComplete }: IntroPageProps) {
  const [letterStage, setLetterStage] = useState(0)
  const letters = ['N', 'X', 'G', 'N', '.']

  useEffect(() => {
    // Start letter assembly animation
    const letterInterval = setInterval(() => {
      setLetterStage(prev => {
        if (prev >= letters.length) {
          clearInterval(letterInterval)
          // Hold the complete logo for a moment then transition
          setTimeout(onComplete, 800)
          return prev
        }
        return prev + 1
      })
    }, 200)

    return () => clearInterval(letterInterval)
  }, [onComplete, letters.length])

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent animate-pulse" />
      
      {/* Letter assembly */}
      <div className="flex items-center justify-center space-x-1">
        {letters.map((letter, index) => (
          <div
            key={index}
            className={`
              text-6xl font-bold text-primary transition-all duration-500 transform
              ${index < letterStage 
                ? 'opacity-100 scale-100 animate-glow translate-y-0' 
                : 'opacity-0 scale-50 translate-y-8'
              }
            `}
            style={{
              transitionDelay: `${index * 100}ms`,
              textShadow: '0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor'
            }}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}