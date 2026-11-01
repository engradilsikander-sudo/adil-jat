import { createFileRoute, Link } from '@tanstack/react-router'
import { AdminShell } from '../../components/admin/AdminShell'
import { ArrowLeft, Edit3, Plus, RefreshCw, ShieldAlert } from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  createDesignation,
  currentUserCanManageCommittees,
  designationScopeOptions,
  fetchDesignations,
  updateDesignation,
  type DesignationRecord,
  type DesignationScope,
} from '../../lib/committees'

import { useAdminManagementCopy } from '../../lib/admin-management-i18n'

export const Route = createFileRoute('/admin/designations')({
  component: AdminDesignationsPage,
})

type FormState = {
  id: string | null
  scope: DesignationScope
  title: string
  sortOrder: string
  isActive: boolean
}

const emptyForm: FormState = {
  id: null,
  scope: 'central',
  title: '',
  sortOrder: '1',
  isActive: true,
}

const inputClass = 'h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'

function AdminDesignationsPage() {
  const { copy } = useAdminManagementCopy('designations')
  const [designations, setDesignations] = useState<DesignationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [scopeFilter, setScopeFilter] = useState<'all' | DesignationScope>('all')
  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    void loadDesignations()
  }, [])

  async function loadDesignations() {
    setLoading(true)
    setMessage('')

    try {
      const allowed = await currentUserCanManageCommittees()
      if (!allowed) {
        setMessage('Only admin or super admin can manage committee designations.')
        setDesignations([])
        return
      }

      setDesignations(await fetchDesignations())
    } catch (err) {
      setMessage(getErrorMessage(err, 'Failed to load designations. Please confirm the committee migration has been applied.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      if (!form.title.trim()) throw new Error('Designation title is required.')

      const input = {
        scope: form.scope,
        title: form.title.trim(),
        sort_order: Number(form.sortOrder) || 1,
        is_active: form.isActive,
      }

      if (form.id) {
        await updateDesignation(form.id, input)
        setMessage('Designation updated successfully.')
      } else {
        await createDesignation(input)
        setMessage('Designation created successfully.')
      }

      setForm(emptyForm)
      await loadDesignations()
    } catch (err) {
      setMessage(getErrorMessage(err, 'Failed to save designation.'))
    } finally {
      setSaving(false)
    }
  }

  function editDesignation(designation: DesignationRecord) {
    setForm({
      id: designation.id,
      scope: designation.scope,
      title: designation.title,
      sortOrder: String(designation.sort_order),
      isActive: designation.is_active,
    })
  }

  const filteredDesignations = useMemo(() => {
    return designations.filter((designation) => scopeFilter === 'all' || designation.scope === scopeFilter)
  }, [designations, scopeFilter])

  return (
    <AdminShell title="Designations" subtitle="Manage office bearer designations and display order.">
      <div className="admin-nested-page">
      <div className="page-wrap space-y-6">
        <Link to="/admin/committees" className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 no-underline">
          <ArrowLeft size={16} /> {copy.common.backToCommittees}
        </Link>

        <header className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">{copy.page.badge}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{copy.page.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {copy.page.subtitle}
              </p>
            </div>
            <button type="button" onClick={() => void loadDesignations()} className="secondary-btn"><RefreshCw size={16} /> {copy.common.refresh}</button>
          </div>
        </header>

        {message ? <StateCard message={message} tone={message.toLowerCase().includes('failed') || message.toLowerCase().includes('required') || message.toLowerCase().includes('only') ? 'error' : 'default'} /> : null}

        <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                {form.id ? <Edit3 size={22} /> : <Plus size={22} />}
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-950">{form.id ? copy.page.editDesignation : copy.page.createDesignation}</h2>
                <p className="text-sm text-slate-500">{copy.page.reusableText}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Field label={copy.page.scope}>
                <select value={form.scope} onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value as DesignationScope }))} className={inputClass}>
                  {designationScopeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>

              <Field label={copy.page.titleField}>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} placeholder="General Secretary" />
              </Field>

              <Field label={copy.page.sortOrder}>
                <input type="number" min="1" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} className={inputClass} />
              </Field>

              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
                {copy.page.activeDesignation}
              </label>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <button type="submit" disabled={saving} className="primary-btn disabled:cursor-not-allowed disabled:opacity-60">{saving ? copy.common.saving : form.id ? copy.page.updateDesignation : copy.page.createDesignation}</button>
                {form.id ? <button type="button" onClick={() => setForm(emptyForm)} className="secondary-btn">{copy.page.cancelEdit}</button> : null}
              </div>
            </div>
          </form>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">{copy.page.designationList}</h2>
                <p className="mt-1 text-sm text-slate-500">Showing {filteredDesignations.length} of {designations.length} designations.</p>
              </div>

              <select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value as 'all' | DesignationScope)} className={inputClass}>
                <option value="all">{copy.page.allScopes}</option>
                {designationScopeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>

            {loading ? <StateCard message={copy.page.loading} /> : null}

            {!loading && filteredDesignations.length === 0 ? <StateCard message={copy.page.empty} /> : null}

            <div className="grid gap-3 md:grid-cols-2">
              {filteredDesignations.map((designation) => (
                <article key={designation.id} className="rounded-[1.3rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-emerald-700">{designation.scope}</p>
                      <h3 className="mt-1 text-lg font-black text-slate-950">{designation.title}</h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">Sort order: {designation.sort_order}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${designation.is_active ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                      {designation.is_active ? copy.common.active : copy.common.inactive}
                    </span>
                  </div>

                  <button type="button" onClick={() => editDesignation(designation)} className="secondary-btn mt-4 w-full">
                    <Edit3 size={15} /> Edit
                  </button>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
    </AdminShell>
  )
}


function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message

  if (typeof err === 'object' && err !== null) {
    const maybeError = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    const parts = [maybeError.message, maybeError.details, maybeError.hint, maybeError.code]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)

    if (parts.length > 0) return parts.join(' — ')
  }

  return fallback
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-slate-800">{label}</span>{children}</label>
}

function StateCard({ message, tone = 'default' }: { message: string; tone?: 'default' | 'error' }) {
  return <div className={`rounded-2xl p-5 text-sm font-bold ring-1 ${tone === 'error' ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>{tone === 'error' ? <ShieldAlert className="mr-2 inline h-4 w-4" /> : null}{message}</div>
}
