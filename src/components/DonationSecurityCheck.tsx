import { useEffect, useRef } from 'react'

type Turnstile = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void }

export function DonationSecurityCheck({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const sitekey = import.meta.env.VITE_DONATION_TURNSTILE_SITE_KEY
  useEffect(() => {
    if (!sitekey) return
    let widget: string | undefined
    const api = () => (window as unknown as { turnstile?: Turnstile }).turnstile
    const render = () => {
      if (widget === undefined && container.current && api()) widget = api()!.render(container.current, {
        sitekey, action: 'donation', callback: onToken,
        'expired-callback': () => onToken(''), 'error-callback': () => onToken(''),
      })
    }
    let script = document.querySelector<HTMLScriptElement>('script[data-donation-turnstile]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.dataset.donationTurnstile = 'true'
      document.head.appendChild(script)
    }
    script.addEventListener('load', render)
    render()
    return () => { script.removeEventListener('load', render); if (widget !== undefined) api()?.remove(widget) }
  }, [sitekey, onToken])
  return <div ref={container} aria-label="Donation security check" className="max-w-full overflow-hidden" />
}
