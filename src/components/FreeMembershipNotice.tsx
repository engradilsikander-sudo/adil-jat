import { BadgeCheck } from 'lucide-react'
import { useI18n } from '../lib/i18n'

export function FreeMembershipNotice({ title, description }: { title?: string; description?: string }) {
  const { t, direction } = useI18n()
  return (
    <section dir={direction} className="my-5 flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-start text-sm text-teal-950">
      <BadgeCheck size={22} className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" />
      <div>
        <p className="font-bold">{title ?? t('membership.freeTitle')}</p>
        <p className="mt-1 leading-7">{description ?? t('membership.freeDescription')}</p>
      </div>
    </section>
  )
}
