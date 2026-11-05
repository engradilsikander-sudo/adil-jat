import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AdminShell } from '../../components/admin/AdminShell'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Clock3,
  Database,
  Download,
  Eye,
  FileClock,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  auditModuleOptions,
  auditTableOptions,
  downloadAuditCsv,
  fetchAuditLogs,
  formatAuditDate,
  getAuditActionClass,
  getAuditModuleLabel,
  getAuditTableLabel,
  type AuditLogRow,
} from '../../lib/audit-logs'
import { supabase } from '../../lib/supabase/client'

import { useAdminManagementCopy } from '../../lib/admin-management-i18n'
import { useI18n } from '../../lib/i18n'
import { adminAccessibilityCopy, fillAdminCopy } from '../../lib/i18n/admin-accessibility-copy'

export const Route = createFileRoute('/admin/audit-logs')({
  component: AdminAuditLogsPage,
})

function AdminAuditLogsPage() {
  const { copy } = useAdminManagementCopy('auditLogs')
  const { language } = useI18n()
  const text = adminAccessibilityCopy[language].audit
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [search, setSearch] = useState('')
  const [moduleKey, setModuleKey] = useState('')
  const [entityTable, setEntityTable] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    void loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = useMemo(() => {
    const updates = logs.filter((item) => item.action === 'update').length
    const inserts = logs.filter((item) => item.action === 'insert').length
    const deletes = logs.filter((item) => item.action === 'delete').length
    const sensitive = logs.filter((item) =>
      ['roles', 'area_permissions', 'finance', 'committees'].includes(item.module_key),
    ).length

    return { updates, inserts, deletes, sensitive }
  }, [logs])

  async function loadLogs(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false
    if (silent) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        await navigate({ to: '/login', replace: true })
        return
      }

      const rows = await fetchAuditLogs({
        moduleKey,
        entityTable,
        query: search,
        limit: 150,
      })

      setLogs(rows)
    } catch (err) {
      const message = err instanceof Error ? err.message : text.loadError
      setError(message)
      setLogs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function resetFilters() {
    setSearch('')
    setModuleKey('')
    setEntityTable('')
  }

  return (
    <AdminShell title={copy.page.title} subtitle={copy.page.subtitle}>
      <div className="admin-nested-page">
      <div className="page-wrap space-y-6">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 no-underline hover:text-emerald-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.common.backToAdmin}
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-6 text-white md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-200">
                  <ShieldCheck className="h-4 w-4" />
                  {copy.page.badge}
                </div>

                <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">
                  {copy.page.title}
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70 md:text-base">
                  {copy.page.subtitle}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <button
                  type="button"
                  onClick={() => downloadAuditCsv(logs)}
                  disabled={!logs.length}
                  className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {copy.common.exportCsv}
                </button>

                <button
                  type="button"
                  onClick={() => void loadLogs({ silent: true })}
                  disabled={refreshing}
                  className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {copy.common.refresh}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
            <MetricCard
              label={copy.page.logsLoaded}
              value={logs.length}
              icon={<FileClock className="h-5 w-5" />}
              tone="slate"
            />
            <MetricCard
              label={copy.page.updates}
              value={stats.updates}
              icon={<Activity className="h-5 w-5" />}
              tone="amber"
            />
            <MetricCard
              label={copy.page.created}
              value={stats.inserts}
              icon={<Database className="h-5 w-5" />}
              tone="emerald"
            />
            <MetricCard
              label={copy.page.sensitiveModules}
              value={stats.sensitive}
              icon={<ShieldAlert className="h-5 w-5" />}
              tone="red"
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto_auto] lg:items-center">
            <label className="relative block">
              <Search aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label={text.search}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void loadLogs({ silent: true })
                }}
                className="min-h-[3.25rem] w-full rounded-2xl border border-slate-200 bg-white ps-12 pe-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:text-sm"
                placeholder={copy.page.searchPlaceholder}
              />
            </label>

            <select
              aria-label={text.moduleFilter}
              value={moduleKey}
              onChange={(event) => setModuleKey(event.target.value)}
              className="min-h-[3.25rem] rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:text-sm"
            >
              {auditModuleOptions.map((item) => (
                <option key={item.value || 'all'} value={item.value}>
                  {item.value ? item.label : text.allModules}
                </option>
              ))}
            </select>

            <select
              aria-label={text.tableFilter}
              value={entityTable}
              onChange={(event) => setEntityTable(event.target.value)}
              className="min-h-[3.25rem] rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:text-sm"
            >
              {auditTableOptions.map((item) => (
                <option key={item.value || 'all'} value={item.value}>
                  {item.value ? item.label : text.allTables}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void loadLogs({ silent: true })}
              className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-900"
            >
              <Filter className="h-4 w-4" />
              {text.apply}
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-[3.25rem] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              {text.reset}
            </button>
          </div>
        </section>

        {error ? (
          <div role="alert" className="rounded-[2rem] border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">{text.unable}</p>
                <p className="mt-1 text-sm font-semibold leading-6">{error}</p>
              </div>
            </div>
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                {text.activityTrail}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {text.latestChanges}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {text.limitedNotice}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-800">
              <UserRoundCheck className="h-4 w-4" />
              {text.superOnly}
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
            {loading ? (
              <div role="status" className="flex items-center gap-3 p-6 text-sm font-bold text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                {text.loading}
              </div>
            ) : logs.length ? (
              <div className="divide-y divide-slate-100">
                {logs.map((row) => (
                  <AuditLogItem
                    key={row.id}
                    row={row}
                    expanded={expandedId === row.id}
                    onToggle={() =>
                      setExpandedId((current) => (current === row.id ? null : row.id))
                    }
                    labels={text}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Clock3 className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-3 text-xl font-black text-slate-950">
                  {text.none}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {text.noneDetail}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
    </AdminShell>
  )
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string | number
  icon: ReactNode
  tone: 'slate' | 'emerald' | 'amber' | 'red'
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-800'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-800'
        : tone === 'red'
          ? 'bg-red-50 text-red-800'
          : 'bg-slate-50 text-slate-800'

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>
        {icon}
      </div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </article>
  )
}

function AuditLogItem({
  row,
  expanded,
  onToggle,
  labels,
}: {
  row: AuditLogRow
  expanded: boolean
  onToggle: () => void
  labels: typeof adminAccessibilityCopy.en.audit
}) {
  return (
    <article className="bg-white p-4 transition hover:bg-slate-50 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${getAuditActionClass(row.action)}`}>
              {row.action === 'insert' ? labels.created : row.action === 'update' ? labels.updated : row.action === 'delete' ? labels.deleted : labels.changedAction}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
              {getAuditModuleLabel(row.module_key)}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">
              {getAuditTableLabel(row.entity_table)}
            </span>
          </div>

          <h3 dir="auto" className="mt-3 break-words text-lg font-black text-slate-950">
            {row.action_label}
          </h3>

          <p dir="auto" className="mt-1 break-words text-sm font-semibold leading-6 text-slate-600">
            {row.record_label || row.entity_id || labels.record}
          </p>

          <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-2 xl:grid-cols-3">
            <span>{labels.actor}: <bdi dir="auto">{row.actor_email || row.actor_user_id || labels.system}</bdi></span>
            <span>{labels.time}: {formatAuditDate(row.created_at)}</span>
            <span>{labels.recordId}: <bdi dir="ltr">{row.entity_id || '—'}</bdi></span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`jas-audit-details-${row.id}`}
          aria-label={fillAdminCopy(expanded ? labels.hideFor : labels.showFor, { id: row.record_label || row.entity_id || row.id })}
          className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-100"
        >
          <Eye className="h-4 w-4" />
          {expanded ? labels.hide : labels.show}
        </button>
      </div>

      {expanded ? (
        <div id={`jas-audit-details-${row.id}`} className="mt-4 grid gap-4 lg:grid-cols-2">
          <JsonPanel title={labels.changed} value={row.changed_data} />
          <JsonPanel title={labels.snapshot} value={row.new_data} />
        </div>
      ) : null}
    </article>
  )
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">
        {title}
      </p>
      <pre dir="ltr" className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-200">
        {JSON.stringify(value || {}, null, 2)}
      </pre>
    </div>
  )
}
