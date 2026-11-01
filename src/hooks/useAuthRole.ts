import { useCallback, useEffect, useRef, useState } from 'react'
import { adminRoleNames } from '../config/navigation'
import { supabase } from '../lib/supabase/client'

type AuthUser = {
  id: string
  email?: string | null
}

export function useAuthRole() {
  const generation = useRef(0)
  const mounted = useRef(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [accountUserId, setAccountUserId] = useState('')
  const [accountEmail, setAccountEmail] = useState('')

  const checkAdmin = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', adminRoleNames)
      .limit(1)

    if (error) {
      console.error('Admin role check failed:', error.message)
      return false
    }

    return Boolean(data?.length)
  }, [])

  const syncAuthState = useCallback(
    async (user?: AuthUser | null) => {
      const request = ++generation.current
      const userId = user?.id ?? ''
      setAuthLoading(true)
      setIsAdmin(false)
      setAccountUserId(userId)
      setIsLoggedIn(Boolean(userId))
      setAccountEmail(user?.email ?? '')
      try {
        const admin = userId ? await checkAdmin(userId) : false
        if (mounted.current && generation.current === request) setIsAdmin(admin)
      } catch (error) {
        console.error('Role lookup failed:', error)
      } finally {
        if (mounted.current && generation.current === request) setAuthLoading(false)
      }
    },
    [checkAdmin],
  )

  useEffect(() => {
    mounted.current = true
    const initialGeneration = generation.current
    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!mounted.current || generation.current !== initialGeneration) return
        if (error) throw error
        await syncAuthState(data.session?.user ?? null)
      } catch (error) {
        if (!mounted.current || generation.current !== initialGeneration) return
        console.error('Session load failed:', error)
        await syncAuthState(null)
      }
    }
    void loadSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer database calls until the auth callback has released its lock.
      const eventGeneration = ++generation.current
      setIsAdmin(false)
      setAuthLoading(true)
      setTimeout(() => {
        if (mounted.current && generation.current === eventGeneration) void syncAuthState(session?.user ?? null)
      }, 0)
    })
    return () => {
      mounted.current = false
      ++generation.current
      subscription.unsubscribe()
    }
  }, [syncAuthState])

  const accountInitial = (
    accountEmail.split('@')[0]?.trim().charAt(0) || 'U'
  ).toUpperCase()

  async function logout() {
    setLogoutLoading(true)

    ++generation.current
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Logout failed:', error)
      if (mounted.current) { setLogoutLoading(false); setAuthLoading(false) }
      return false
    }
    ++generation.current
    if (!mounted.current) return true
    setAuthLoading(false)
    setIsLoggedIn(false)
    setIsAdmin(false)
    setAccountEmail('')
    setAccountUserId('')
    setLogoutLoading(false)
    return true
  }

  return {
    authLoading,
    logoutLoading,
    isLoggedIn,
    isAdmin,
    accountUserId,
    accountEmail,
    accountInitial,
    logout,
  }
}
