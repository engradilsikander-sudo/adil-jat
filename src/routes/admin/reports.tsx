// src/routes/admin/reports.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AdminShell } from '../../components/admin/AdminShell'
import {
  ArrowLeft,
  BadgeIndianRupee,
  BriefcaseBusiness,
  Download,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  currentUserCanViewReports,
  downloadReportCsv,
  formatCurrency,
  formatReportDate,
  loadReportsCenterData,
  type ReportsCenterData,
} from '../../lib/reports'

import { useAdminManagementCopy } from '../../lib/admin-management-i18n'

export const Route = createFileRoute('/admin/reports')({
  component: AdminReportsPage,
})

function AdminReportsPage() {
  const { copy } = useAdminManagementCopy('reports')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<ReportsCenterData | null>(null)

  const loadData = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false

      if (silent) setRefreshing(true)
      else setLoading(true)

      setError('')

      try {
        const canViewReports = await currentUserCanViewReports()

        if (!canViewReports) {
          await navigate({ to: '/admin' })
          return
        }

        const reports = await loadReportsCenterData()
        setData(reports)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [navigate],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  const totals = useMemo(() => {
    if (!data) {
      return {
        totalDonations: 0,
        totalExpenses: 0,
        balance: 0,
      }
    }

    const totalDonations = data.financeByPurpose.reduce(
      (total, item) => total + item.approvedDonations,
      0,
    )
    const totalExpenses = data.financeByPurpose.reduce(
      (total, item) => total + item.paidExpenses,
      0,
    )

    return {
      totalDonations,
      totalExpenses,
      balance: totalDonations - totalExpenses,
    }
  }, [data])

  if (loading) {
    return (
      <AdminShell title="Reports" subtitle="View organization summaries, exports and review reports.">
      <div className="admin-nested-page">
        <div className="page-wrap rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            Loading reports center...
          </div>
        </div>
      </div>
    </AdminShell>
    )
  }

  return (
    <AdminShell title="Reports" subtitle="View organization summaries, exports and review reports.">
      <div className="admin-nested-page">
      <div className="page-wrap space-y-6">
        <header className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 no-underline hover:text-emerald-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {copy.common.backToAdmin}
                </Link>

                <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                  {copy.page.badge}
                </p>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {copy.page.title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {copy.page.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadData({ silent: true })}
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {copy.common.refresh}
              </button>
            </div>
          </div>

          {data ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {data.metrics.map((metric) => (
                <MetricCard key={metric.label} metric={metric} />
              ))}
            </div>
          ) : null}
        </header>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-800 ring-1 ring-red-100">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {!data ? null : (
          <>
            <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
              <Panel
                title="Program Applications"
                subtitle="Application workflow summary by program"
                action={
                  <ExportButton
                    onClick={() =>
                      downloadReportCsv(
                        `jas-program-summary-${today()}.csv`,
                        [
                          'Program',
                          copy.page.total,
                          'Pending',
                          'Under Review',
                          'Approved',
                          'Rejected',
                          'Completed',
                          'Approved Amount',
                        ],
                        data.programSummaries.map((item) => [
                          item.label,
                          item.total,
                          item.pending,
                          item.underReview,
                          item.approved,
                          item.rejected,
                          item.completed,
                          item.approvedAmount,
                        ]),
                      )
                    }
                  />
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.programSummaries.map((item) => (
                    <ProgramCard key={item.programKey} item={item} />
                  ))}
                </div>
              </Panel>

              <Panel
                title={copy.page.financeSnapshot}
                subtitle="Approved donations, paid expenses and available balance"
                action={
                  <ExportButton
                    onClick={() =>
                      downloadReportCsv(
                        `jas-finance-purpose-${today()}.csv`,
                        [
                          'Purpose',
                          'Approved Donations',
                          'Donation Count',
                          'Paid Expenses',
                          'Expense Count',
                          'Balance',
                        ],
                        data.financeByPurpose.map((item) => [
                          item.purpose,
                          item.approvedDonations,
                          item.donationCount,
                          item.paidExpenses,
                          item.expenseCount,
                          item.balance,
                        ]),
                      )
                    }
                  />
                }
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <FinanceTile
                    label="Donations"
                    value={formatCurrency(totals.totalDonations)}
                    tone="emerald"
                  />
                  <FinanceTile
                    label="Expenses"
                    value={formatCurrency(totals.totalExpenses)}
                    tone="amber"
                  />
                  <FinanceTile
                    label="Balance"
                    value={formatCurrency(totals.balance)}
                    tone="slate"
                  />
                </div>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Purpose</th>
                        <th className="px-4 py-3">Donations</th>
                        <th className="px-4 py-3">Expenses</th>
                        <th className="px-4 py-3">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.financeByPurpose.map((item) => (
                        <tr key={item.purpose} className="bg-white">
                          <td className="px-4 py-3 font-bold text-slate-950">
                            {item.purpose}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatCurrency(item.approvedDonations)}
                            <span className="ml-1 text-xs text-slate-400">
                              ({item.donationCount})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatCurrency(item.paidExpenses)}
                            <span className="ml-1 text-xs text-slate-400">
                              ({item.expenseCount})
                            </span>
                          </td>
                          <td className="px-4 py-3 font-black text-emerald-800">
                            {formatCurrency(item.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel
                title="District Activity"
                subtitle="Top districts by membership and program activity"
                action={
                  <ExportButton
                    onClick={() =>
                      downloadReportCsv(
                        `jas-district-summary-${today()}.csv`,
                        [
                          'District',
                          'Members',
                          'Approved Members',
                          'Program Applications',
                          'Approved Donations',
                          'Paid Expenses',
                        ],
                        data.districtSummaries.map((item) => [
                          item.district,
                          item.members,
                          item.approvedMembers,
                          item.programApplications,
                          item.approvedDonations,
                          item.paidExpenses,
                        ]),
                      )
                    }
                  />
                }
              >
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">District</th>
                        <th className="px-4 py-3">Members</th>
                        <th className="px-4 py-3">Approved</th>
                        <th className="px-4 py-3">Applications</th>
                        <th className="px-4 py-3">Donations</th>
                        <th className="px-4 py-3">Expenses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.districtSummaries.map((item) => (
                        <tr key={item.district} className="bg-white">
                          <td className="px-4 py-3 font-black text-slate-950">
                            <span className="inline-flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-emerald-700" />
                              {item.district}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{item.members}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {item.approvedMembers}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {item.programApplications}
                          </td>
                          <td className="px-4 py-3 text-emerald-800">
                            {formatCurrency(item.approvedDonations)}
                          </td>
                          <td className="px-4 py-3 text-amber-800">
                            {formatCurrency(item.paidExpenses)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel title="Monthly Activity" subtitle="Last 6 months overview">
                <div className="space-y-3">
                  {data.monthlySummaries.map((item) => (
                    <div
                      key={item.month}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-slate-950">{item.month}</p>
                        <p className="text-xs font-bold text-slate-500">
                          {item.members} members · {item.applications} applications
                        </p>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                        <span className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                          Donations: {formatCurrency(item.donations)}
                        </span>
                        <span className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                          Expenses: {formatCurrency(item.expenses)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>

            <Panel title="Recent Activity" subtitle="Latest members, applications, donations and expenses">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.recentActivity.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <ActivityIcon type={item.type} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-black text-slate-950">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {formatReportDate(item.date)}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide text-slate-600">
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
    </AdminShell>
  )
}

function MetricCard({
  metric,
}: {
  metric: { label: string; value: number | string; helper: string }
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {metric.label}
      </p>
      <p className="mt-3 text-2xl font-black text-slate-950">{metric.value}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        {metric.helper}
      </p>
    </article>
  )
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function ProgramCard({
  item,
}: {
  item: {
    label: string
    total: number
    pending: number
    underReview: number
    approved: number
    rejected: number
    completed: number
    approvedAmount: number
  }
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-slate-950">{item.label}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {item.total} total applications
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800 ring-1 ring-emerald-100">
          {item.approved} approved
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-600">
        <MiniStat label="Pending" value={item.pending} />
        <MiniStat label="Review" value={item.underReview} />
        <MiniStat label="Rejected" value={item.rejected} />
      </div>

      <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-100">
        Completed: {item.completed} · Approved amount:{' '}
        <span className="text-emerald-800">{formatCurrency(item.approvedAmount)}</span>
      </div>
    </article>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white px-2 py-2 ring-1 ring-slate-100">
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  )
}

function FinanceTile({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'emerald' | 'amber' | 'slate'
}) {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-900 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-900 ring-amber-100',
    slate: 'bg-slate-50 text-slate-950 ring-slate-200',
  }[tone]

  return (
    <article className={`rounded-2xl p-4 ring-1 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </article>
  )
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  )
}

function ActivityIcon({ type }: { type: 'member' | 'program' | 'donation' | 'expense' }) {
  const config = {
    member: {
      icon: Users,
      className: 'bg-emerald-50 text-emerald-800',
    },
    program: {
      icon: BriefcaseBusiness,
      className: 'bg-sky-50 text-sky-800',
    },
    donation: {
      icon: BadgeIndianRupee,
      className: 'bg-amber-50 text-amber-800',
    },
    expense: {
      icon: FileText,
      className: 'bg-violet-50 text-violet-800',
    },
  }[type]

  const Icon = config.icon

  return (
    <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${config.className}`}>
      <Icon className="h-5 w-5" />
    </span>
  )
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
