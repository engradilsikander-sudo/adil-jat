import { createFileRoute, Link } from '@tanstack/react-router'
import { AdminShell } from '../../components/admin/AdminShell'
import {
  ArrowLeft,
  BadgeCheck,
  Edit3,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  UserCog,
} from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  areaPermissionModuleOptions,
  areaPermissionScopeOptions,
  currentUserCanManageAreaPermissions,
  describeAreaPermission,
  fetchAreaPermissionsForUser,
  getAreaPermissionModuleLabel,
  getAreaPermissionScopeLabel,
  getPermissionActionText,
  removeAreaPermission,
  saveAreaPermission,
  searchUsersForAreaPermissions,
  type AdminAreaPermission,
  type AreaPermissionModule,
  type AreaPermissionScope,
  type AreaPermissionUser,
} from '../../lib/area-permissions'

import { useAdminManagementCopy } from '../../lib/admin-management-i18n'
import { useI18n } from '../../lib/i18n'
import { adminAccessibilityCopy, fillAdminCopy } from '../../lib/i18n/admin-accessibility-copy'

export const Route = createFileRoute('/admin/area-permissions')({
  component: AdminAreaPermissionsPage,
})

type FormState = {
  id: string | null
  moduleKey: AreaPermissionModule
  scope: AreaPermissionScope
  district: string
  taluka: string
  canView: boolean
  canReview: boolean
  canApprove: boolean
  isActive: boolean
  notes: string
}

const emptyForm: FormState = {
  id: null,
  moduleKey: 'membership',
  scope: 'district',
  district: '',
  taluka: '',
  canView: true,
  canReview: true,
  canApprove: false,
  isActive: true,
  notes: '',
}

function AdminAreaPermissionsPage() {
  const { copy } = useAdminManagementCopy('areaPermissions')
  const { language } = useI18n()
  const text = adminAccessibilityCopy[language].area
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<AreaPermissionUser[]>([])
  const [selectedUser, setSelectedUser] = useState<AreaPermissionUser | null>(null)
  const [permissions, setPermissions] = useState<AdminAreaPermission[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success')

  useEffect(() => {
    void boot()
  }, [])

  async function boot() {
    setLoading(true)
    setMessage('')

    try {
      const canManage = await currentUserCanManageAreaPermissions()
      setAllowed(canManage)

      if (!canManage) {
        setMessageTone('error')
        setMessage(text.denied)
        return
      }

      const initialUsers = await searchUsersForAreaPermissions('')
      setUsers(initialUsers)
    } catch (err) {
      setMessageTone('error')
      setMessage(err instanceof Error ? err.message : text.accessError)
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setSearching(true)
    setMessage('')

    try {
      setUsers(await searchUsersForAreaPermissions(query))
    } catch (err) {
      setMessageTone('error')
      setMessage(err instanceof Error ? err.message : text.searchError)
    } finally {
      setSearching(false)
    }
  }

  async function selectUser(user: AreaPermissionUser) {
    setSelectedUser(user)
    setForm({ ...emptyForm, district: user.district ?? '', taluka: user.taluka ?? '' })
    setMessage('')

    try {
      setPermissions(await fetchAreaPermissionsForUser(user.user_id))
    } catch (err) {
      setMessageTone('error')
      setMessage(err instanceof Error ? err.message : text.loadUserError)
      setPermissions([])
    }
  }

  function editPermission(permission: AdminAreaPermission) {
    setForm({
      id: permission.id,
      moduleKey: permission.module_key,
      scope: permission.scope,
      district: permission.district ?? '',
      taluka: permission.taluka ?? '',
      canView: permission.can_view,
      canReview: permission.can_review,
      canApprove: permission.can_approve,
      isActive: permission.is_active,
      notes: permission.notes ?? '',
    })
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      district: selectedUser?.district ?? '',
      taluka: selectedUser?.taluka ?? '',
    })
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedUser) return

    setSaving(true)
    setMessage('')

    try {
      if (form.scope !== 'all' && !form.district.trim()) {
        throw new Error(text.districtRequired)
      }

      if (form.scope === 'taluka' && !form.taluka.trim()) {
        throw new Error(text.talukaRequired)
      }

      await saveAreaPermission({
        id: form.id,
        userId: selectedUser.user_id,
        moduleKey: form.moduleKey,
        scope: form.scope,
        district: form.district,
        taluka: form.taluka,
        canView: form.canView,
        canReview: form.canReview,
        canApprove: form.canApprove,
        isActive: form.isActive,
        notes: form.notes,
      })

      setPermissions(await fetchAreaPermissionsForUser(selectedUser.user_id))
      resetForm()
      setMessageTone('success')
      setMessage(text.saved)
    } catch (err) {
      setMessageTone('error')
      setMessage(err instanceof Error ? err.message : text.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(permission: AdminAreaPermission) {
    const confirmed = window.confirm(
      fillAdminCopy(text.confirmRemove, {
        module: getAreaPermissionModuleLabel(permission.module_key), area: describeAreaPermission(permission),
      }),
    )

    if (!confirmed || !selectedUser) return

    setMessage('')

    try {
      await removeAreaPermission(permission.id)
      setPermissions(await fetchAreaPermissionsForUser(selectedUser.user_id))
      setMessageTone('success')
      setMessage(text.removed)
    } catch (err) {
      setMessageTone('error')
      setMessage(err instanceof Error ? err.message : text.removeError)
    }
  }

  const activePermissions = useMemo(
    () => permissions.filter((permission) => permission.is_active),
    [permissions],
  )

  if (loading) {
    return (
      <AdminShell title={copy.page.title} subtitle={copy.page.subtitle}>
      <div className="admin-nested-page">
        <div role="status" className="page-wrap rounded-3xl bg-white p-5 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
          {copy.common.loading}
        </div>
      </div>
    </AdminShell>
    )
  }

  return (
    <AdminShell title={copy.page.title} subtitle={copy.page.subtitle}>
      <div className="admin-nested-page">
      <div className="page-wrap space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 no-underline">
          <ArrowLeft size={16} /> {copy.common.backToAdmin}
        </Link>

        <header className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-5 text-white sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">
                  {copy.page.badge}
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">{copy.page.title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/70">
                  {copy.page.subtitle}
                </p>
              </div>
              <button type="button" onClick={() => void boot()} className="secondary-btn bg-white text-slate-900 hover:bg-slate-100">
                <RefreshCw size={16} /> {copy.common.refresh}
              </button>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
            <SummaryCard label={copy.page.usersListed} value={users.length} />
            <SummaryCard label={copy.page.selectedActivePermissions} value={activePermissions.length} />
            <SummaryCard label={copy.common.accessLevel} value={allowed ? copy.common.superAdmin : copy.common.restricted} text />
          </div>
        </header>

        {message ? (
          <div role={messageTone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-2xl p-4 text-sm font-bold ring-1 ${messageTone === 'error' ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-emerald-50 text-emerald-800 ring-emerald-100'}`}>
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}

        {!allowed ? null : (
          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">{text.findUser}</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">{text.usersTitle}</h2>
              </div>

              <form onSubmit={handleSearch} className="mt-4 flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    aria-label={text.searchUsers}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white ps-10 pe-3 text-base sm:text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder={text.searchPlaceholder}
                  />
                </div>
                <button aria-label={text.searchUsers} type="submit" disabled={searching} className="primary-btn px-4 disabled:opacity-60">
                  {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
              </form>

              <div className="mt-4 grid max-h-[720px] gap-3 overflow-y-auto pr-1">
                {users.map((user) => (
                  <button
                    key={user.user_id}
                    type="button"
                    onClick={() => void selectUser(user)}
                    aria-pressed={selectedUser?.user_id === user.user_id}
                    className={`rounded-2xl border p-4 text-start transition ${selectedUser?.user_id === user.user_id ? 'border-emerald-300 bg-emerald-50 ring-4 ring-emerald-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <UserCog size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span dir="auto" className="block truncate text-sm font-black text-slate-950">{user.email ?? text.noEmail}</span>
                        <span dir="auto" className="mt-1 block truncate text-xs font-bold text-slate-500">{user.full_name || text.noMember}</span>
                        <span className="mt-2 flex flex-wrap gap-1">
                          {user.roles.length ? user.roles.map((role) => (
                            <span key={role} className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-black text-slate-600">{role}</span>
                          )) : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.65rem] font-black text-amber-800">{text.noRole}</span>}
                        </span>
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
                      <span>{user.member_no || text.noMemberNumber}</span>
                      <span>{user.district || text.noDistrict}</span>
                    </div>
                  </button>
                ))}
              </div>
              {!searching && users.length === 0 ? <p role="status" className="mt-3 text-sm text-slate-600">{text.noUsers}</p> : null}
            </section>

            <section className="space-y-6">
              <div className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">{text.selectedUser}</p>
                    <h2 dir="auto" className="mt-2 text-2xl font-black text-slate-950">
                      {selectedUser ? selectedUser.email ?? selectedUser.user_id : text.selectUser}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {selectedUser ? selectedUser.full_name || text.noMember : text.chooseUser}
                    </p>
                  </div>

                  {selectedUser ? (
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 ring-1 ring-emerald-100">
                      {fillAdminCopy(text.activeCount, { count: activePermissions.length })}
                    </div>
                  ) : null}
                </div>
              </div>

              {selectedUser ? (
                <>
                  <form onSubmit={handleSave} className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                          {form.id ? copy.page.editPermission : copy.page.newPermission}
                        </p>
                        <h3 className="mt-2 text-xl font-black text-slate-950">{text.accessRule}</h3>
                      </div>
                      <button type="button" onClick={resetForm} className="secondary-btn">
                        <Plus size={16} /> {text.newRule}
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <Field label={text.module}>
                        <select value={form.moduleKey} onChange={(event) => setForm((current) => ({ ...current, moduleKey: event.target.value as AreaPermissionModule }))} className="form-input">
                          {areaPermissionModuleOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                      </Field>

                      <Field label={text.scope}>
                        <select value={form.scope} onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value as AreaPermissionScope }))} className="form-input">
                          {areaPermissionScopeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                      </Field>

                      {form.scope !== 'all' ? (
                        <Field label={text.district}>
                          <input value={form.district} onChange={(event) => setForm((current) => ({ ...current, district: event.target.value }))} className="form-input" placeholder={text.exampleDistrict} />
                        </Field>
                      ) : null}

                      {form.scope === 'taluka' ? (
                        <Field label={text.taluka}>
                          <input value={form.taluka} onChange={(event) => setForm((current) => ({ ...current, taluka: event.target.value }))} className="form-input" placeholder={text.exampleTaluka} />
                        </Field>
                      ) : null}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <CheckBox label={text.canView} checked={form.canView} onChange={(value) => setForm((current) => ({ ...current, canView: value }))} />
                      <CheckBox label={text.canReview} checked={form.canReview} onChange={(value) => setForm((current) => ({ ...current, canReview: value }))} />
                      <CheckBox label={text.canApprove} checked={form.canApprove} onChange={(value) => setForm((current) => ({ ...current, canApprove: value }))} />
                    </div>

                    <div className="mt-4">
                      <CheckBox label={copy.page.permissionActive} checked={form.isActive} onChange={(value) => setForm((current) => ({ ...current, isActive: value }))} />
                    </div>

                    <Field label={text.notes} className="mt-4">
                      <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="form-textarea" placeholder={text.notesPlaceholder} />
                    </Field>

                    <button type="submit" disabled={saving} className="primary-btn mt-5 disabled:opacity-60">
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? copy.common.saving : copy.page.saveAreaPermission}
                    </button>
                  </form>

                  <div className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">{text.currentPermissions}</p>
                      <h3 className="mt-2 text-xl font-black text-slate-950">{text.districtAccess}</h3>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {permissions.map((permission) => (
                        <article key={permission.id} className={`rounded-2xl border p-4 ${permission.is_active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 ring-1 ring-emerald-100">
                                  {getAreaPermissionModuleLabel(permission.module_key)}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                                  {getAreaPermissionScopeLabel(permission.scope)}
                                </span>
                                {!permission.is_active ? <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">{copy.common.inactive}</span> : null}
                              </div>
                              <h4 className="mt-3 text-lg font-black text-slate-950">{describeAreaPermission(permission)}</h4>
                              <p className="mt-1 text-sm font-semibold text-slate-500">{getPermissionActionText(permission)}</p>
                              {permission.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{permission.notes}</p> : null}
                            </div>

                            <div className="flex gap-2">
                              <button type="button" aria-label={fillAdminCopy(text.editFor, { module: getAreaPermissionModuleLabel(permission.module_key), area: describeAreaPermission(permission) })} onClick={() => editPermission(permission)} className="secondary-btn px-4">
                                <Edit3 size={15} /> {text.edit}
                              </button>
                              <button type="button" aria-label={fillAdminCopy(text.removeFor, { module: getAreaPermissionModuleLabel(permission.module_key), area: describeAreaPermission(permission) })} onClick={() => void handleRemove(permission)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-100">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}

                      {permissions.length === 0 ? (
                        <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-100">
                          {text.none}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </div>
    </AdminShell>
  )
}

function SummaryCard({ label, value, text = false }: { label: string; value: string | number; text?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className={text ? 'mt-2 text-base font-black text-slate-950' : 'mt-2 text-3xl font-black text-slate-950'}>{value}</p>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-black text-slate-800">{label}</span>
      {children}
    </label>
  )
}

function CheckBox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="inline-flex items-center gap-2">
        {checked ? <BadgeCheck size={16} className="text-emerald-700" /> : <KeyRound size={16} className="text-slate-400" />}
        {label}
      </span>
    </label>
  )
}
