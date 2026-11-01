// src/lib/roles.ts
import { supabase } from './supabase/client'

export const roleOptions = [
  { value: 'membership_admin', label: 'Membership Admin', description: 'Manage member applications and digital cards.' },
  { value: 'education_admin', label: 'Education Admin', description: 'Review scholarship and education support applications.' },
  { value: 'health_admin', label: 'Health Admin', description: 'Review restricted medical help cases.' },
  { value: 'welfare_admin', label: 'Welfare Admin', description: 'Review welfare and social support cases.' },
  { value: 'employment_admin', label: 'Employment Admin', description: 'Review job seeker profiles, CVs and placements.' },
  { value: 'finance_admin', label: 'Finance Admin', description: 'Manage donations, expenses and finance audit records.' },
  { value: 'admin', label: 'Admin', description: 'Central operations access to all core modules.' },
  { value: 'super_admin', label: 'Super Admin', description: 'Owner-level access including role management.' },
] as const

export type AppRole = (typeof roleOptions)[number]['value']

export type RoleUser = {
  userId: string
  email: string
  authCreatedAt: string
  memberFullName: string | null
  memberNo: string | null
  memberStatus: string | null
  roles: AppRole[]
}

export const roleLabels: Record<AppRole, string> = Object.fromEntries(
  roleOptions.map((role) => [role.value, role.label]),
) as Record<AppRole, string>

export function getRoleLabel(role: AppRole | string) {
  return roleLabels[role as AppRole] ?? role
}

export function getRoleDescription(role: AppRole | string) {
  return roleOptions.find((item) => item.value === role)?.description ?? ''
}

export function isKnownAppRole(value: string): value is AppRole {
  return roleOptions.some((role) => role.value === value)
}

export async function currentUserIsSuperAdmin() {
  const { data, error } = await supabase.rpc('current_user_is_super_admin')

  if (error) throw error

  return Boolean(data)
}

export async function searchRoleUsers(query: string) {
  const { data, error } = await supabase.rpc('role_management_search_users' as never, {
    _query: query.trim(),
  } as never)

  if (error) throw error

  return ((data ?? []) as unknown[]).map(normalizeRoleUser)
}

export async function assignUserRole(userId: string, role: AppRole) {
  const { error } = await supabase.rpc('role_management_assign_role' as never, {
    _target_user_id: userId,
    _role: role,
  } as never)

  if (error) throw error
}

export async function removeUserRole(userId: string, role: AppRole) {
  const { error } = await supabase.rpc('role_management_remove_role' as never, {
    _target_user_id: userId,
    _role: role,
  } as never)

  if (error) throw error
}

function normalizeRoleUser(row: unknown): RoleUser {
  const item = row as Record<string, unknown>
  const rawRoles = Array.isArray(item.roles) ? item.roles : []

  return {
    userId: String(item.user_id ?? ''),
    email: String(item.email ?? ''),
    authCreatedAt: String(item.auth_created_at ?? ''),
    memberFullName: nullableString(item.member_full_name),
    memberNo: nullableString(item.member_no),
    memberStatus: nullableString(item.member_status),
    roles: rawRoles.map(String).filter(isKnownAppRole),
  }
}

function nullableString(value: unknown) {
  if (value === null || value === undefined) return null
  const safe = String(value)
  return safe.length ? safe : null
}
