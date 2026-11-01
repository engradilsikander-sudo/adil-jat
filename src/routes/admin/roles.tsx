// src/routes/admin/roles.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { AdminShell } from '../../components/admin/AdminShell'
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
} from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  assignUserRole,
  currentUserIsSuperAdmin,
  getRoleDescription,
  getRoleLabel,
  removeUserRole,
  roleOptions,
  searchRoleUsers,
  type AppRole,
  type RoleUser,
} from '../../lib/roles'

import { useAdminManagementCopy } from '../../lib/admin-management-i18n'

export const Route = createFileRoute('/admin/roles')({
  component: AdminRolesPage,
})

type RoleAction = {
  userId: string
  role: AppRole
  mode: 'assign' | 'remove'
}

function AdminRolesPage() {
  const { copy } = useAdminManagementCopy('roles')
  const [allowed, setAllowed] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<RoleUser[]>([])
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [action, setAction] = useState<RoleAction | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<Record<string, AppRole>>({})

  useEffect(() => {
    void initialize()
  }, [])

  async function initialize() {
    setCheckingAccess(true)
    setMessage('')

    try {
      const isSuperAdmin = await currentUserIsSuperAdmin()
      setAllowed(isSuperAdmin)

      if (!isSuperAdmin) {
        setMessage('Only super admin can manage user roles and permissions.')
        return
      }

      await loadUsers('')
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Failed to verify role management access.',
      )
    } finally {
      setCheckingAccess(false)
    }
  }

  async function loadUsers(searchText = query) {
    setLoading(true)
    setMessage('')

    try {
      const results = await searchRoleUsers(searchText)
      setUsers(results)

      setSelectedRoles((current) => {
        const next = { ...current }

        for (const user of results) {
          if (!next[user.userId]) {
            next[user.userId] = getDefaultRoleForUser(user)
          }
        }

        return next
      })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await loadUsers(query)
  }

  async function handleAssign(user: RoleUser) {
    const role = selectedRoles[user.userId]
    if (!role) return

    setAction({ userId: user.userId, role, mode: 'assign' })
    setMessage('')

    try {
      await assignUserRole(user.userId, role)
      await loadUsers(query)
      setMessage(`${getRoleLabel(role)} assigned to ${user.email}.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to assign role.')
    } finally {
      setAction(null)
    }
  }

  async function handleRemove(user: RoleUser, role: AppRole) {
    const confirmed = window.confirm(
      `Remove ${getRoleLabel(role)} from ${user.email}?`,
    )

    if (!confirmed) return

    setAction({ userId: user.userId, role, mode: 'remove' })
    setMessage('')

    try {
      await removeUserRole(user.userId, role)
      await loadUsers(query)
      setMessage(`${getRoleLabel(role)} removed from ${user.email}.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to remove role.')
    } finally {
      setAction(null)
    }
  }

  const roleCounts = useMemo(() => {
    return users.reduce<Record<string, number>>((acc, user) => {
      for (const role of user.roles) {
        acc[role] = (acc[role] ?? 0) + 1
      }

      return acc
    }, {})
  }, [users])

  if (checkingAccess) {
    return (
      <AdminShell title="Roles & Permissions" subtitle="Assign and review administrator roles.">
      <div className="admin-nested-page">
        <div className="page-wrap rounded-[2rem] bg-white p-6 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            {copy.common.loading}
          </div>
        </div>
      </div>
    </AdminShell>
    )
  }

  return (
    <AdminShell title="Roles & Permissions" subtitle="Assign and review administrator roles.">
      <div className="admin-nested-page">
      <div className="page-wrap space-y-6">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 no-underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.common.backToAdminCenter}
        </Link>

        <header className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-800 ring-1 ring-emerald-100">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  {copy.page.badge}
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  {copy.page.title}
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  {copy.page.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadUsers(query)}
                disabled={!allowed || loading}
                className="secondary-btn disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {copy.common.refresh}
              </button>
            </div>
          </div>

          <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label={copy.page.usersShown} value={users.length} icon={<UserCog />} />
            <SummaryCard
              label={copy.page.superAdmins}
              value={roleCounts.super_admin ?? 0}
              icon={<ShieldCheck />}
            />
            <SummaryCard
              label={copy.page.centralAdmins}
              value={roleCounts.admin ?? 0}
              icon={<BadgeCheck />}
            />
            <SummaryCard
              label={copy.page.moduleAdmins}
              value={countModuleAdmins(roleCounts)}
              icon={<LockKeyhole />}
            />
          </div>
        </header>

        {message ? (
          <div
            className={`flex items-start gap-3 rounded-2xl p-4 text-sm font-bold ring-1 ${
              allowed
                ? 'bg-amber-50 text-amber-900 ring-amber-100'
                : 'bg-red-50 text-red-700 ring-red-100'
            }`}
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}

        {!allowed ? (
          <section className="rounded-[2rem] bg-white p-6 text-sm leading-7 text-slate-600 shadow-sm ring-1 ring-slate-200">
            This page is restricted. Login with a super admin account to manage
            roles. Normal admin and module admins can use their assigned admin
            pages, but cannot assign or remove roles.
          </section>
        ) : (
          <>
            <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
              <form onSubmit={handleSearch} className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Search by email, member name, member no or user UUID..."
                  />
                </label>

                <button type="submit" disabled={loading} className="primary-btn disabled:opacity-60">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search Users
                </button>
              </form>
            </section>

            <section className="grid gap-4">
              {users.map((user) => (
                <RoleUserCard
                  key={user.userId}
                  user={user}
                  selectedRole={selectedRoles[user.userId] ?? getDefaultRoleForUser(user)}
                  onSelectedRole={(role) =>
                    setSelectedRoles((current) => ({ ...current, [user.userId]: role }))
                  }
                  onAssign={() => void handleAssign(user)}
                  onRemove={(role) => void handleRemove(user, role)}
                  action={action}
                />
              ))}

              {!loading && users.length === 0 ? (
                <div className="rounded-[2rem] bg-white p-8 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-200">
                  No users found. Try searching by email, member no or member name.
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>
    </div>
    </AdminShell>
  )
}

function RoleUserCard({
  user,
  selectedRole,
  onSelectedRole,
  onAssign,
  onRemove,
  action,
}: {
  user: RoleUser
  selectedRole: AppRole
  onSelectedRole: (role: AppRole) => void
  onAssign: () => void
  onRemove: (role: AppRole) => void
  action: RoleAction | null
}) {
  const availableRoles = roleOptions.filter((role) => !user.roles.includes(role.value))
  const assigning = action?.userId === user.userId && action.mode === 'assign'

  return (
    <article className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-all text-xl font-black text-slate-950">
                {user.email}
              </h2>
              <p className="mt-1 break-all text-xs font-bold text-slate-400">
                User ID: {user.userId}
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">
              {user.roles.length} role{user.roles.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <InfoBox label="Member Name" value={user.memberFullName ?? 'No member profile'} />
            <InfoBox label="Member No" value={user.memberNo ?? 'Not issued'} />
            <InfoBox label="Member Status" value={user.memberStatus ?? 'N/A'} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {user.roles.length ? (
              user.roles.map((role) => {
                const removing =
                  action?.userId === user.userId &&
                  action.mode === 'remove' &&
                  action.role === role

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onRemove(role)}
                    disabled={Boolean(action)}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 ring-1 ring-emerald-100 transition hover:bg-red-50 hover:text-red-700 hover:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    title={getRoleDescription(role)}
                  >
                    {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    {getRoleLabel(role)}
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )
              })
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">
                No admin role assigned
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-sm font-black text-slate-950">Assign new role</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Only assign official JAS admin roles to trusted accounts.
          </p>

          <div className="mt-4 grid gap-3">
            <select
              value={selectedRole}
              onChange={(event) => onSelectedRole(event.target.value as AppRole)}
              disabled={availableRoles.length === 0}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
            >
              {availableRoles.length ? (
                availableRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))
              ) : (
                <option value={selectedRole}>All roles assigned</option>
              )}
            </select>

            <button
              type="button"
              onClick={onAssign}
              disabled={Boolean(action) || availableRoles.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black !text-white shadow-sm transition hover:bg-emerald-800 hover:!text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: '#ffffff' }}
            >
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {assigning ? 'Assigning...' : 'Assign Role'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>
        <span className="text-emerald-700 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      </div>
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="text-[0.65rem] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-slate-900">{value}</p>
    </div>
  )
}

function getDefaultRoleForUser(user: RoleUser): AppRole {
  const firstAvailable = roleOptions.find((role) => !user.roles.includes(role.value))
  return firstAvailable?.value ?? 'membership_admin'
}

function countModuleAdmins(counts: Record<string, number>) {
  return (
    (counts.membership_admin ?? 0) +
    (counts.education_admin ?? 0) +
    (counts.health_admin ?? 0) +
    (counts.welfare_admin ?? 0) +
    (counts.employment_admin ?? 0) +
    (counts.finance_admin ?? 0)
  )
}
