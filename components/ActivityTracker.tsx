'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function ActivityTracker() {
  const pathname = usePathname()
  const activeSeconds = useRef(0)

  useEffect(() => {
    // Only track if user is logged in
    const token = typeof window !== 'undefined' ? localStorage.getItem('sv_token') : ''
    if (!token) return

    let intervalId: NodeJS.Timeout

    const handlePing = async () => {
      try {
        const token = localStorage.getItem('sv_token')
        if (!token) return

        const res = await fetch('/api/study-sessions/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            subjectId: null,
            topicId: null
          })
        })

        if (res.ok) {
          window.dispatchEvent(new CustomEvent('study-session-tick'))
        }
      } catch (err) {
        console.error('Failed to send activity heartbeat:', err)
      }
    }

    const checkActivity = () => {
      // Only increment if tab is active and page is visible
      if (document.visibilityState === 'visible') {
        activeSeconds.current += 1

        // Every 60 active seconds, ping the server to log 1 minute
        if (activeSeconds.current >= 60) {
          activeSeconds.current = 0
          handlePing()
        }
      }
    }

    // Set up a 1-second checker tick
    intervalId = setInterval(checkActivity, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [pathname])

  return null
}
