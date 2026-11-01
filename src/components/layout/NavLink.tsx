import { Link } from '@tanstack/react-router'

export function NavLink({
  to,
  label,
  active,
  delayClass,
}: {
  to: string
  label: string
  active: boolean
  delayClass: string
}) {
  return (
    <Link
      to={to}
      className={`nav-link animate-fade-up ${delayClass} ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  )
}
