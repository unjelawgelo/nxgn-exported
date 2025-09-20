import { useState, useEffect, useRef } from 'react'

export function useHumanTypingAnimation(input: string | string[]) {
  const [displayText, setDisplayText] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const timeoutRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    const texts = Array.isArray(input) ? input : [input]
    if (!texts || texts.length === 0 || !mountedRef.current) return

    // Reset state
    setDisplayText('')
    setIsVisible(true)

    let seqIndex = 0
    let charIndex = 0
    let phase: 'typing' | 'paused' | 'deleting' | 'done' = 'typing'

    const clearTimers = () => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }

    const startBlinking = () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = window.setInterval(() => {
        if (!mountedRef.current) return
        setIsVisible(prev => !prev)
      }, 530)
    }

    const typeStep = () => {
      if (!mountedRef.current) return

      const currentText = texts[seqIndex]

      if (phase === 'typing') {
        if (charIndex < currentText.length) {
          charIndex++
          setDisplayText(currentText.slice(0, charIndex))

          // human-like variable typing speed
          let delay = 80 + Math.random() * 120 // 80-200ms
          const currentChar = currentText.charAt(charIndex - 1)
          if (currentChar === '!' || currentChar === '.' || currentChar === '?') delay += 200 + Math.random() * 150
          if (currentChar === ' ') delay += 30 + Math.random() * 40
          if (Math.random() < 0.12) delay += 80 + Math.random() * 120 // occasional hesitation

          timeoutRef.current = window.setTimeout(typeStep, delay)
        } else {
          // Finished typing current text
          phase = 'paused'
          // brief pause before deleting or ending
          const pauseDuration = 700 + Math.random() * 700 // 700-1400ms
          timeoutRef.current = window.setTimeout(() => {
            if (!mountedRef.current) return
            // If there is another text in sequence, delete current then type next
            if (seqIndex < texts.length - 1) {
              phase = 'deleting'
              timeoutRef.current = window.setTimeout(typeStep, 180 + Math.random() * 80)
            } else {
              phase = 'done'
              startBlinking()
            }
          }, pauseDuration)
        }
      } else if (phase === 'deleting') {
        if (charIndex > 0) {
          charIndex--
          setDisplayText(currentText.slice(0, charIndex))

          // deletion usually faster
          let delay = 40 + Math.random() * 60 // 40-100ms
          if (Math.random() < 0.08) delay += 80 // occasional pause
          timeoutRef.current = window.setTimeout(typeStep, delay)
        } else {
          // move to next text
          seqIndex++
          if (seqIndex < texts.length) {
            phase = 'typing'
            charIndex = 0
            timeoutRef.current = window.setTimeout(typeStep, 220 + Math.random() * 120)
          } else {
            phase = 'done'
            startBlinking()
          }
        }
      }
    }

    // kick off the sequence
    timeoutRef.current = window.setTimeout(typeStep, 300)

    return () => {
      clearTimers()
    }
  }, [input])

  return { displayText, isVisible }
}
