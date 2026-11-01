import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase/client'

type Profile = { name: string; memberNo: string | null; status: string }
type State = {
  userId: string; profile: Profile | null; profileReady: boolean;
  profileError: boolean; count: number; countError: boolean;
}
const empty: State = { userId: '', profile: null, profileReady: false, profileError: false, count: 0, countError: false }

// Memory-only, per mounted header. Route changes reuse data; user changes discard it.
export function useHeaderData(userId: string) {
  const [state, setState] = useState<State>(empty)
  const retryRef = useRef<() => void>(() => {})
  useEffect(() => {
    let active = true
    setState({ ...empty, userId })
    if (!userId) { retryRef.current = () => {}; return }
    const controllers = new Set<AbortController>()
    const pending = { profile: false, count: false }
    const queued = { profile: false, count: false }
    const attempted = { profile: 0, count: 0 }
    async function refresh(kind: 'profile' | 'count', force = false) {
      if (!active) return
      if (pending[kind]) { if (force) queued[kind] = true; return }
      const ttl = kind === 'profile' ? 60000 : 30000
      if (!force && Date.now() - attempted[kind] < ttl) return
      attempted[kind] = Date.now()
      pending[kind] = true
      const controller = new AbortController()
      controllers.add(controller)
      const timer = setTimeout(() => controller.abort(), 15000)
      try {
        if (kind === 'profile') {
          const { data, error } = await supabase.from('members').select('full_name, member_no, status').eq('user_id', userId).abortSignal(controller.signal).maybeSingle()
          if (error) throw error
          if (active) setState((old) => ({ ...old, userId, profile: data ? { name: data.full_name, memberNo: data.member_no, status: data.status } : null, profileReady: true, profileError: false }))
        } else {
          const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false).abortSignal(controller.signal)
          if (error) throw error
          if (active) setState((old) => ({ ...old, userId, count: count ?? 0, countError: false }))
        }
      } catch {
        if (active) setState((old) => ({ ...old, ...(kind === 'profile' ? { profileError: true } : { countError: true }) }))
      } finally {
        clearTimeout(timer)
        controllers.delete(controller)
        pending[kind] = false
        if (active && queued[kind]) { queued[kind] = false; void refresh(kind, true) }
      }
    }
    const both = () => { if (!document.hidden) { void refresh('profile'); void refresh('count') } }
    const notifications = () => { void refresh('count', true) }
    const membership = () => { void refresh('profile', true) }
    retryRef.current = () => { void refresh('profile', true); void refresh('count', true) }
    void refresh('profile', true); void refresh('count', true)
    window.addEventListener('focus', both)
    window.addEventListener('online', both)
    document.addEventListener('visibilitychange', both)
    window.addEventListener('jas-notifications-updated', notifications)
    window.addEventListener('jas-membership-updated', membership)
    const interval = setInterval(both, 30000)
    return () => {
      active = false
      controllers.forEach((controller) => controller.abort())
      clearInterval(interval)
      retryRef.current = () => {}
      window.removeEventListener('focus', both)
      window.removeEventListener('online', both)
      document.removeEventListener('visibilitychange', both)
      window.removeEventListener('jas-notifications-updated', notifications)
      window.removeEventListener('jas-membership-updated', membership)
    }
  }, [userId])
  // Do not expose the previous account even for the render before effect cleanup.
  return { ...(state.userId === userId && userId ? state : empty), retry: () => retryRef.current() }
}
