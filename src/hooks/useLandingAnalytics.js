import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

function getDevice() {
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

function getUTM(key) {
  try { return new URLSearchParams(window.location.search).get(key) || null }
  catch { return null }
}

export function useLandingAnalytics() {
  const sessionId = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  )
  const startTime  = useRef(Date.now())
  const scrollDepth = useRef(0)
  const ctaClicked  = useRef(false)
  const inserted    = useRef(false)

  useEffect(() => {
    // Insert session record (fire-and-forget)
    supabase.from('landing_analytics').insert({
      session_id:   sessionId.current,
      referrer:     document.referrer || null,
      utm_source:   getUTM('utm_source'),
      utm_medium:   getUTM('utm_medium'),
      utm_campaign: getUTM('utm_campaign'),
      device:       getDevice(),
    }).then(() => { inserted.current = true })

    // Track max scroll depth
    function onScroll() {
      const el  = document.documentElement
      const max = el.scrollHeight - el.clientHeight
      if (max <= 0) return
      const pct = Math.round((el.scrollTop / max) * 100)
      if (pct > scrollDepth.current) scrollDepth.current = Math.min(pct, 100)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // Update session on exit / interval
    function flush() {
      if (!inserted.current) return
      supabase.from('landing_analytics').update({
        duration_ms:  Date.now() - startTime.current,
        scroll_depth: scrollDepth.current,
        cta_clicked:  ctaClicked.current,
        updated_at:   new Date().toISOString(),
      }).eq('session_id', sessionId.current).then(() => {})
    }

    const iv = setInterval(flush, 30_000)
    window.addEventListener('beforeunload', flush)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('beforeunload', flush)
      clearInterval(iv)
      flush()
    }
  }, [])

  // Call this on any CTA click
  function trackCTA() { ctaClicked.current = true }

  return { trackCTA }
}
