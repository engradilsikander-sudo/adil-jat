import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { deleteJasCacheStorage } from '../../lib/pwa-cache-reset'
import {
  getDeviceLabel,
  normalizeNotificationPreferences,
  supportsWebPush,
  urlBase64ToUint8Array,
} from '../../lib/web-push'

type BeforeInstallPromptEvent = Event & {
  platforms?: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

type PushSubscriptionJson = {
  endpoint?: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  | string
  | undefined

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  )
}

const DEV_SW_RELOAD_FLAG = 'jas-pwa-dev-sw-unregistered'

async function unregisterDevServiceWorkers() {
  if (!('serviceWorker' in navigator)) return

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()

    if (registrations.length === 0) {
      sessionStorage.removeItem(DEV_SW_RELOAD_FLAG)
      return
    }

    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    )

    await deleteJasCacheStorage()

    const alreadyReloaded = sessionStorage.getItem(DEV_SW_RELOAD_FLAG) === '1'

    if (navigator.serviceWorker.controller && !alreadyReloaded) {
      sessionStorage.setItem(DEV_SW_RELOAD_FLAG, '1')
      window.location.reload()
    }
  } catch (error) {
    console.warn('JAS dev service worker cleanup failed:', error)
  }
}

export function PwaBootstrap() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const updateRegistration = useRef<ServiceWorkerRegistration | null>(null)
  const updateAccepted = useRef(false)
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dismissedInstall, setDismissedInstall] = useState(false)
  const [dismissedPush, setDismissedPush] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>('default')
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushPreferenceEnabled, setPushPreferenceEnabled] = useState(true)
  const [pushPreferenceLoaded, setPushPreferenceLoaded] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushMessage, setPushMessage] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()

      if (isStandaloneDisplay()) return

      setInstallPrompt(event as BeforeInstallPromptEvent)
      setCanInstall(true)
      setDismissedInstall(false)
    }

    const handleAppInstalled = () => {
      setCanInstall(false)
      setInstallPrompt(null)
      setDismissedInstall(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      )
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true

    async function syncAuthState() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!mounted) return
      setIsLoggedIn(Boolean(user))
    }

    void syncAuthState()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setIsLoggedIn(Boolean(session?.user))
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true
    const isSupported = supportsWebPush()
    setPushSupported(isSupported)
    setPushPreferenceLoaded(false)

    async function syncPushState() {
      if (!isLoggedIn) {
        if (!mounted) return
        setPushSubscribed(false)
        setPushPreferenceEnabled(true)
        setPushPreferenceLoaded(true)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !mounted) return

      const { data: preferenceRow } = await supabase
        .from('notification_preferences')
        .select('web_push_enabled')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!mounted) return
      setPushPreferenceEnabled(
        normalizeNotificationPreferences(preferenceRow).web_push_enabled,
      )
      setPushPreferenceLoaded(true)

      if (!isSupported) return
      setPushPermission(Notification.permission)

      if (import.meta.env.DEV || !VAPID_PUBLIC_KEY) return

      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (mounted) setPushSubscribed(Boolean(subscription))
      } catch (error) {
        console.warn('JAS push subscription check failed:', error)
      }
    }

    const handlePreferencesUpdated = () => {
      void syncPushState()
    }

    void syncPushState()
    window.addEventListener(
      'jas-web-push-preferences-updated',
      handlePreferencesUpdated,
    )

    return () => {
      mounted = false
      window.removeEventListener(
        'jas-web-push-preferences-updated',
        handlePreferencesUpdated,
      )
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    if (import.meta.env.DEV) {
      void unregisterDevServiceWorkers()
      return
    }

    let activeRegistration: ServiceWorkerRegistration | null = null
    let hadController = Boolean(navigator.serviceWorker.controller)
    let refreshTriggered = false
    let disposed = false
    const cleanups: Array<() => void> = []

    const reloadWithLatestController = () => {
      if (refreshTriggered) return

      refreshTriggered = true
      setIsRefreshing(true)
      window.location.reload()
    }

    const offerUpdate = () => { if (!disposed) setUpdateAvailable(true) }
    const watchRegistration = (registration: ServiceWorkerRegistration) => {
      activeRegistration = registration
      updateRegistration.current = registration
      if (registration.waiting && navigator.serviceWorker.controller) offerUpdate()
      const watchInstalling = () => {
        const worker = registration.installing
        if (!worker) return
        const changed = () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate()
        }
        worker.addEventListener('statechange', changed)
        cleanups.push(() => worker.removeEventListener('statechange', changed))
        changed()
      }
      registration.addEventListener('updatefound', watchInstalling)
      cleanups.push(() => registration.removeEventListener('updatefound', watchInstalling))
      watchInstalling()
    }

    const registerServiceWorker = () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          if (disposed) return
          watchRegistration(registration)
          return registration.update()
        })
        .catch((error) => {
          console.warn('JAS service worker registration/update failed:', error)
        })
    }

    const handleControllerChange = () => {
      if (!hadController) { hadController = true; return }
      // Another tab may activate the update; this tab reloads only on consent.
      if (updateAccepted.current) reloadWithLatestController()
      else if (navigator.serviceWorker.controller) offerUpdate()
    }

    const checkForUpdates = () => {
      if (!activeRegistration || document.hidden) return

      activeRegistration.update().catch((error) => {
        console.warn('JAS service worker update check failed:', error)
      })
    }

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    )
    document.addEventListener('visibilitychange', checkForUpdates)
    window.addEventListener('online', checkForUpdates)
    window.addEventListener('focus', checkForUpdates)

    if (document.readyState === 'complete') {
      registerServiceWorker()
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true })
    }

    const updateInterval = window.setInterval(checkForUpdates, 30 * 60 * 1000)

    return () => {
      window.removeEventListener('load', registerServiceWorker)
      window.removeEventListener('online', checkForUpdates)
      window.removeEventListener('focus', checkForUpdates)
      document.removeEventListener('visibilitychange', checkForUpdates)
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      )
      if (updateTimer.current) clearTimeout(updateTimer.current)
      disposed = true
      cleanups.forEach((cleanup) => cleanup())
      updateRegistration.current = null
      window.clearInterval(updateInterval)
    }
  }, [])

  async function handleUpdateClick() {
    // Explicit confirmation protects unsaved registration/admin form changes.
    if (!window.confirm('Update JAS now? Save any unfinished form first. This will reload the page.')) return
    updateAccepted.current = true
    setIsRefreshing(true)
    setUpdateError('')
    const worker = updateRegistration.current?.waiting
    if (!worker) { window.location.reload(); return }
    try {
      worker.postMessage({ type: 'SKIP_WAITING' })
      updateTimer.current = setTimeout(() => {
        updateAccepted.current = false
        setIsRefreshing(false)
        setUpdateError('Update did not finish. Please try again when connected.')
      }, 15000)
    } catch {
      updateAccepted.current = false
      setIsRefreshing(false)
      setUpdateError('Could not start the update. Please try again.')
    }
  }

  async function handleInstallClick() {
    if (!installPrompt) return

    setIsInstalling(true)

    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice

      if (choice.outcome === 'accepted') {
        setCanInstall(false)
        setInstallPrompt(null)
        setDismissedInstall(false)
      }
    } finally {
      setIsInstalling(false)
    }
  }

  async function handleEnablePushClick() {
    if (!VAPID_PUBLIC_KEY) {
      setPushMessage('Push notifications are not configured yet.')
      return
    }

    if (!supportsWebPush()) {
      setPushMessage('This browser does not support web push notifications.')
      return
    }

    if (!isLoggedIn) {
      setPushMessage('Please login first to enable member notifications.')
      return
    }

    setPushLoading(true)
    setPushMessage('')

    try {
      const permission = await Notification.requestPermission()
      setPushPermission(permission)

      if (permission !== 'granted') {
        setPushMessage('Notification permission was not allowed.')
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setPushMessage('Please login again to enable notifications.')
        return
      }

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      const subscriptionJson = subscription.toJSON() as PushSubscriptionJson
      const endpoint = subscription.endpoint || subscriptionJson.endpoint
      const p256dh = subscriptionJson.keys?.p256dh
      const auth = subscriptionJson.keys?.auth

      if (!endpoint || !p256dh || !auth) {
        setPushMessage('Browser did not return a complete push subscription.')
        return
      }

      const now = new Date().toISOString()
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
          device_label: getDeviceLabel(navigator.userAgent),
          enabled: true,
          failure_count: 0,
          last_seen_at: now,
          disabled_at: null,
          disabled_reason: null,
        },
        { onConflict: 'user_id,endpoint' },
      )

      if (error) {
        setPushMessage(error.message)
        return
      }

      const { error: preferenceError } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            web_push_enabled: true,
          },
          { onConflict: 'user_id' },
        )

      if (preferenceError) {
        setPushMessage(preferenceError.message)
        return
      }

      setPushSubscribed(true)
      setPushPreferenceEnabled(true)
      setDismissedPush(false)
      setPushMessage('Browser notifications enabled.')
      window.dispatchEvent(
        new CustomEvent('jas-web-push-preferences-updated'),
      )
    } catch (error) {
      setPushMessage(
        error instanceof Error
          ? error.message
          : 'Unable to enable browser notifications.',
      )
    } finally {
      setPushLoading(false)
    }
  }

  const shouldShowUpdate = (updateAvailable && !updateDismissed) || isRefreshing
  const shouldShowInstall =
    !shouldShowUpdate &&
    !dismissedInstall &&
    !isStandaloneDisplay() &&
    canInstall &&
    Boolean(installPrompt)
  const shouldShowPush =
    !shouldShowUpdate &&
    !shouldShowInstall &&
    !dismissedPush &&
    isLoggedIn &&
    pushPreferenceLoaded &&
    pushPreferenceEnabled &&
    pushSupported &&
    !pushSubscribed &&
    pushPermission !== 'denied' &&
    !import.meta.env.DEV &&
    Boolean(VAPID_PUBLIC_KEY)

  if (!shouldShowUpdate && !shouldShowInstall && !shouldShowPush) return null

  return (
    <div className="pwa-toast-stack" role="status" aria-live="polite">
      <style>{pwaStyles}</style>

      {shouldShowUpdate ? (
        <section className="pwa-toast pwa-toast--update">
          <div className="pwa-toast__icon" aria-hidden="true">
            ↻
          </div>
          <div className="pwa-toast__body">
            <p className="pwa-toast__eyebrow">JAS app update</p>
            <h2 className="pwa-toast__title">{isRefreshing ? 'Updating…' : 'New version available'}</h2>
            <p className="pwa-toast__text">
              Save any unfinished work, then choose Update now. You can keep using this version by choosing Later.
            </p>
          </div>
          <div className="pwa-toast__actions">
            <button type="button" className="pwa-toast__button pwa-toast__button--primary" disabled={isRefreshing} onClick={() => void handleUpdateClick()}>{isRefreshing ? 'Updating…' : 'Update now'}</button>
            <button type="button" className="pwa-toast__button pwa-toast__button--ghost" disabled={isRefreshing} onClick={() => setUpdateDismissed(true)}>Later</button>
          </div>
          {updateError ? <p role="alert">{updateError}</p> : null}
        </section>
      ) : null}

      {shouldShowInstall ? (
        <section className="pwa-toast pwa-toast--install">
          <div className="pwa-toast__icon" aria-hidden="true">
            ⬇
          </div>
          <div className="pwa-toast__body">
            <p className="pwa-toast__eyebrow">Install JAS App</p>
            <h2 className="pwa-toast__title">Install JAS App</h2>
            <p className="pwa-toast__text">
              Install the JAS member portal for faster access to membership,
              digital cards, updates and admin tools.
            </p>
          </div>
          <div className="pwa-toast__actions">
            <button
              type="button"
              className="pwa-toast__button pwa-toast__button--primary"
              onClick={handleInstallClick}
              disabled={isInstalling}
            >
              {isInstalling ? 'Opening…' : 'Install JAS App'}
            </button>
            <button
              type="button"
              className="pwa-toast__button pwa-toast__button--ghost"
              onClick={() => setDismissedInstall(true)}
            >
              Not now
            </button>
          </div>
        </section>
      ) : null}

      {shouldShowPush ? (
        <section className="pwa-toast pwa-toast--push">
          <div className="pwa-toast__icon" aria-hidden="true">
            🔔
          </div>
          <div className="pwa-toast__body">
            <p className="pwa-toast__eyebrow">JAS notifications</p>
            <h2 className="pwa-toast__title">Enable browser notifications</h2>
            <p className="pwa-toast__text">
              Get membership approval, payment and important update alerts even
              when the JAS app is installed or running in the background.
            </p>
            {pushMessage ? (
              <p className="pwa-toast__note">{pushMessage}</p>
            ) : null}
          </div>
          <div className="pwa-toast__actions">
            <button
              type="button"
              className="pwa-toast__button pwa-toast__button--primary"
              onClick={handleEnablePushClick}
              disabled={pushLoading}
            >
              {pushLoading ? 'Enabling…' : 'Enable notifications'}
            </button>
            <button
              type="button"
              className="pwa-toast__button pwa-toast__button--ghost"
              onClick={() => setDismissedPush(true)}
            >
              Not now
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}

const pwaStyles = `
  .pwa-toast-stack {
    position: fixed;
    right: max(1rem, env(safe-area-inset-right));
    bottom: max(1rem, env(safe-area-inset-bottom));
    z-index: 9999;
    width: min(27rem, calc(100vw - 2rem));
    pointer-events: none;
  }

  .pwa-toast {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.85rem;
    border: 1px solid rgba(27, 94, 59, 0.18);
    border-radius: 1.25rem;
    background: rgba(255, 253, 249, 0.96);
    box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
    padding: 1rem;
    color: #101827;
    pointer-events: auto;
    backdrop-filter: blur(18px);
  }

  .pwa-toast--update {
    border-color: rgba(176, 138, 62, 0.32);
  }

  .pwa-toast__icon {
    display: grid;
    width: 2.45rem;
    height: 2.45rem;
    place-items: center;
    border-radius: 999px;
    background: #142d4e;
    color: #fff8e6;
    font-size: 1.15rem;
    font-weight: 900;
  }

  .pwa-toast__body {
    min-width: 0;
  }

  .pwa-toast__eyebrow {
    margin: 0 0 0.18rem;
    color: #1b5e3b;
    font-size: 0.68rem;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .pwa-toast__title {
    margin: 0;
    color: #0f172a;
    font-size: 1rem;
    font-weight: 900;
    line-height: 1.25;
  }

  .pwa-toast__text {
    margin: 0.3rem 0 0;
    color: #526078;
    font-size: 0.84rem;
    font-weight: 600;
    line-height: 1.45;
  }

  .pwa-toast__note {
    margin: 0.45rem 0 0;
    color: #1b5e3b;
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1.4;
  }

  .pwa-toast__actions {
    display: flex;
    grid-column: 1 / -1;
    gap: 0.55rem;
    justify-content: flex-end;
  }

  .pwa-toast__button {
    min-height: 2.35rem;
    border-radius: 0.85rem;
    border: 1px solid transparent;
    padding: 0.45rem 0.9rem;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 900;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  }

  .pwa-toast__button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .pwa-toast__button:disabled {
    cursor: progress;
    opacity: 0.68;
  }

  .pwa-toast__button--primary {
    background: #1b5e3b;
    color: #ffffff;
    box-shadow: 0 8px 20px rgba(27, 94, 59, 0.18);
  }

  .pwa-toast__button--ghost {
    background: #ffffff;
    border-color: #e5e7eb;
    color: #334155;
  }

  @media (max-width: 640px) {
    .pwa-toast-stack {
      left: 1rem;
      right: 1rem;
      bottom: max(0.75rem, env(safe-area-inset-bottom));
      width: auto;
    }

    .pwa-toast {
      border-radius: 1rem;
    }
  }
`
