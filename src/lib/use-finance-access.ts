import { useEffect, useState } from 'react'
import { supabase } from './supabase/client'

type FinanceAccess = { checking: boolean; allowed: boolean; userId: string | null; revision: number }

// This controls presentation only. Database RLS rechecks every operation.
// Clearing the gate unmounts privileged screens, including their in-flight requests.
export function useFinanceAccess() {
  const [access, setAccess] = useState<FinanceAccess>({ checking: true, allowed: false, userId: null, revision: 0 })
  useEffect(() => {
    let alive = true
    let request = 0
    let pending = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const clear = () => {
      request += 1
      if (alive) setAccess((old) => ({ checking: true, allowed: false, userId: null, revision: old.revision + 1 }))
    }
    async function refresh() {
      const current = ++request
      pending += 1
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        const result = user && !error ? await supabase.rpc('current_user_can_manage_finance') : null
        if (alive && current === request) setAccess((old) => ({
          checking: false, allowed: Boolean(user && !error && result && !result.error && result.data === true),
          userId: error ? null : user?.id ?? null, revision: old.revision,
        }))
      } catch {
        if (alive && current === request) setAccess((old) => ({ checking: false, allowed: false, userId: null, revision: old.revision }))
      } finally {
        pending -= 1
      }
    }
    const invalidate = () => {
      clear()
      clearTimeout(timer)
      // Auth callbacks must not await other Supabase auth calls under its lock.
      timer = setTimeout(() => { void refresh() }, 0)
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(invalidate)
    const visibility = () => { clear(); if (!document.hidden) invalidate() }
    window.addEventListener('focus', invalidate)
    document.addEventListener('visibilitychange', visibility)
    const interval = setInterval(() => { if (!document.hidden && pending === 0) void refresh() }, 5000)
    void refresh()
    return () => {
      alive = false
      request += 1
      clearTimeout(timer)
      clearInterval(interval)
      subscription.unsubscribe()
      window.removeEventListener('focus', invalidate)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  return access
}
