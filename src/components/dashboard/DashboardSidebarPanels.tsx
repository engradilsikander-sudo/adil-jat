import { Link } from '@tanstack/react-router'
import {
  BadgeIndianRupee,
  CreditCard,
  IdCard,
  Trophy,
} from 'lucide-react'
import { formatDonationMoney, getDonationPurposeLabel } from '../../lib/donations'
import {
  getNotificationTone,
  getProgramStatusLabel,
  type UserNotification,
} from '../../lib/notifications'

type MemberActionStatus = 'pending' | 'approved' | 'rejected'

type MemberForQuickActions = {
  status: MemberActionStatus
}

type FinanceDonationSummary = {
  donation_no: string | null
  amount: number
  purpose: string
  status: string
  approved_at: string | null
  created_at: string
}

export function QuickActions({ member }: { member: MemberForQuickActions }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
        Quick Actions
      </p>
      <h2 className="mt-2 text-xl font-black text-slate-950">Next steps</h2>
      <div className="mt-5 grid gap-3">
        {member.status === 'approved' ? (
          <>
            <Link to="/card" className="primary-btn w-full">
              <CreditCard className="h-4 w-4" />
              Open Digital Card
            </Link>
          </>
        ) : (
          <Link to="/register" className="primary-btn w-full">
            <IdCard className="h-4 w-4" />
            Open Membership Form
          </Link>
        )}
        <Link to="/donate" className="secondary-btn w-full">
          <BadgeIndianRupee className="h-4 w-4" />
          Submit Donation
        </Link>
        <Link to="/donors" className="secondary-btn w-full">
          <Trophy className="h-4 w-4" />
          View Donors
        </Link>
      </div>
    </section>
  )
}

export function DonationPanel({
  totalDonated,
  donationCount,
  donorRank,
  latestDonation,
}: {
  totalDonated: number
  donationCount: number
  donorRank: number | null
  latestDonation?: FinanceDonationSummary
}) {
  return (
    <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
        My Donations
      </p>
      <p className="mt-2 text-3xl font-black text-slate-950">
        {formatDonationMoney(totalDonated)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
            Approved
          </p>
          <p className="mt-1 text-xl font-black text-slate-950">
            {donationCount}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
            Rank
          </p>
          <p className="mt-1 text-xl font-black text-slate-950">
            {donorRank ? `#${donorRank}` : '-'}
          </p>
        </div>
      </div>
      {latestDonation ? (
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
          Latest: {latestDonation.donation_no || 'Donation'} ·{' '}
          {getDonationPurposeLabel(latestDonation.purpose)} ·{' '}
          {getProgramStatusLabel(latestDonation.status)}
        </p>
      ) : (
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
          Approved donation ke baad leaderboard rank yahan show hoga.
        </p>
      )}
    </section>
  )
}

export function NotificationsPreview({
  notifications,
}: {
  notifications: UserNotification[]
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Recent Updates
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            Notifications
          </h2>
        </div>
        <Link to="/notifications" className="text-sm font-black text-emerald-800">
          View all
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {notifications.slice(0, 4).map((item) => (
          <article
            key={item.id}
            className={`rounded-2xl border p-3 ${getNotificationTone(
              item.category,
            )}`}
          >
            <p className="text-sm font-black">{item.title}</p>
            <p className="mt-1 text-xs font-semibold leading-5 opacity-80">
              {item.message}
            </p>
          </article>
        ))}
        {!notifications.length ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            Abhi koi notification nahi hai. Status change hone par updates yahan
            show honge.
          </p>
        ) : null}
      </div>
    </section>
  )
}

