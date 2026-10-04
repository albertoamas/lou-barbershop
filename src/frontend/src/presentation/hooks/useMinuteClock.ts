import { useEffect, useState } from 'react'

// Re-renders once a minute so "now" based views (current time line, greeting, next
// appointment) keep moving without a reload.
export const useMinuteClock = () => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}
