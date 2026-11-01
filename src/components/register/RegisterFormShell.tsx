import { FreeMembershipNotice } from '../FreeMembershipNotice'
import type { ReactNode } from 'react'
import type { TranslationKey } from '../../lib/i18n'
import type { FormField } from '../../lib/register.validation'

export function MembershipFeeSummary({ t }: { t: (key: TranslationKey) => string }) {
  return <FreeMembershipNotice title={t('membership.freeTitle')} description={t('membership.freeDescription')} />
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="reg-section">
      <div className="reg-section-header">
        <div>
          <h2 className="reg-section-title">{title}</h2>
          <p className="reg-section-desc">{description}</p>
        </div>
      </div>

      <div className="reg-section-body">{children}</div>
    </section>
  )
}

export function Field({
  name,
  label,
  children,
  required,
  hint,
  error,
  className = '',
}: {
  name: FormField
  label: string
  children: ReactNode
  required?: boolean
  hint?: string
  error?: string
  className?: string
}) {
  return (
    <div className={`reg-field ${className}`}>
      <label htmlFor={name} className="reg-label">
        {label}
        {required ? (
          <span className="reg-required" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>

      {hint ? (
        <span id={`${name}-hint`} className="reg-hint">
          {hint}
        </span>
      ) : null}

      {children}

      {error ? (
        <p id={`${name}-error`} className="reg-error-text">
          {error}
        </p>
      ) : null}
    </div>
  )
}
