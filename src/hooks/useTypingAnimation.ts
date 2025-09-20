import { useState, useEffect, useRef } from 'react'

export function useTypingAnimation(
  phrases: string[],
  typingSpeed = 80,
  pauseTime = 1500,
  deleteSpeed = 40
) {
  const [displayText, setDisplayText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  // Refs to keep mutable state inside the animation loop without causing re-renders
  const phraseIndexRef = useRef(0)
  const charIndexRef = useRef(0)
  const isDeletingRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!phrases || phrases.length === 0) return

    const tick = () => {
      if (!mountedRef.current) return

      const current = phrases[phraseIndexRef.current]

      if (isDeletingRef.current) {
        if (charIndexRef.current > 0) {
          charIndexRef.current -= 1
          setDisplayText(current.slice(0, charIndexRef.current))
          setIsTyping(true)
          timeoutRef.current = window.setTimeout(tick, deleteSpeed)
        } else {
          // Finished deleting
          isDeletingRef.current = false
          phraseIndexRef.current = (phraseIndexRef.current + 1) % phrases.length
          timeoutRef.current = window.setTimeout(tick, 200)
        }
      } else {
        if (charIndexRef.current < current.length) {
          charIndexRef.current += 1
          setDisplayText(current.slice(0, charIndexRef.current))
          setIsTyping(true)
          timeoutRef.current = window.setTimeout(tick, typingSpeed)
        } else {
          // Finished typing - pause then start deleting
          setIsTyping(false)
          timeoutRef.current = window.setTimeout(() => {
            isDeletingRef.current = true
            setIsTyping(true)
            timeoutRef.current = window.setTimeout(tick, deleteSpeed)
          }, pauseTime)
        }
      }
    }

    // Reset indices and start
    phraseIndexRef.current = 0
    charIndexRef.current = 0
    isDeletingRef.current = false
    setDisplayText('')
    setIsTyping(true)

    timeoutRef.current = window.setTimeout(tick, 500)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [phrases, typingSpeed, pauseTime, deleteSpeed])

  return { displayText, isTyping }
}
