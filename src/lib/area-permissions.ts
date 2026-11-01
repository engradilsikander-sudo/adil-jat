import { supabase } from './supabase/client'

export type AreaPermissionModule =
  | 'all'
  | 'membership'
  | 'education'
  | 'health'
  | 'welfare'
  | 'employment'
  | 'finance'
  | 'reports'

export type AreaPermissionScope = 'all' | 'district' | 'taluka'
export type AreaPermissionAction = 'view' | 'review' | 'approve'

export type AreaPermissionUser = {
  user_id: string
  email: string | null
  roles: string[]
  member_id: string | null
  member_no: string | null
  full_name: string | null
  father_name: string | null
  district: string | null
  taluka: string | null
  active_permissions_count: number
}

export type AdminAreaPermission = {
  id: string
  user_id: string
  module_key: AreaPermissionModule
  scope: AreaPermissionScope
  district: string | null
  taluka: string | null
  can_view: boolean
  can_review: boolean
  can_approve: boolean
  is_active: boolean
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type AreaPermissionFormInput = {
  id?: string | null
  userId: string
  moduleKey: AreaPermissionModule
  scope: AreaPermissionScope
  district?: string | null
  taluka?: string | null
  canView: boolean
  canReview: boolean
  canApprove: boolean
  isActive: boolean
  notes?: string | null
}

export type AreaScopedRow = {
  district?: string | null
  taluka?: string | null
}

export type AdminAreaAccessContext = {
  ok: boolean
  message: string
  userId: string | null
  moduleKey: AreaPermissionModule
  action: AreaPermissionAction
  roles: string[]
  permissions: AdminAreaPermission[]
  isGlobalAdmin: boolean
  isRestricted: boolean
  summary: string
}

export const areaPermissionModuleOptions: Array<{
  value: AreaPermissionModule
  label: string
  description: string
}> = [
  { value: 'all', label: 'All Modules', description: 'Applies to all area-sensitive admin modules.' },
  { value: 'membership', label: 'Membership', description: 'Member applications and member records.' },
  { value: 'education', label: 'Education', description: 'Education support and scholarship applications.' },
  { value: 'health', label: 'Health', description: 'Medical assistance cases.' },
  { value: 'welfare', label: 'Welfare', description: 'Welfare case management.' },
  { value: 'employment', label: 'Employment', description: 'Job seeker and CV database.' },
  { value: 'finance', label: 'Finance', description: 'Finance/donation records by area when linked.' },
  { value: 'reports', label: 'Reports', description: 'Area-scoped reports and summaries.' },
]

export const areaPermissionScopeOptions: Array<{
  value: AreaPermissionScope
  label: string
  description: string
}> = [
  { value: 'all', label: 'All Sindh', description: 'No district/taluka restriction.' },
  { value: 'district', label: 'District', description: 'Access limited to one district.' },
  { value: 'taluka', label: 'Taluka', description: 'Access limited to one taluka inside a district.' },
]

const moduleAdminRoles: Partial<Record<AreaPermissionModule, string[]>> = {
  membership: ['membership_admin'],
  education: ['education_admin'],
  health: ['health_admin'],
  welfare: ['welfare_admin', 'ration_admin'],
  employment: ['employment_admin'],
  finance: ['finance_admin'],
  reports: [],
}

const globalAdminRoles = ['admin', 'super_admin']

export function getAreaPermissionModuleLabel(moduleKey: AreaPermissionModule | string) {
  return areaPermissionModuleOptions.find((item) => item.value === moduleKey)?.label ?? moduleKey
}

export function getAreaPermissionScopeLabel(scope: AreaPermissionScope | string) {
  return areaPermissionScopeOptions.find((item) => item.value === scope)?.label ?? scope
}

export function describeAreaPermission(permission: Pick<AdminAreaPermission, 'scope' | 'district' | 'taluka'>) {
  if (permission.scope === 'all') return 'All Sindh'
  if (permission.scope === 'district') return permission.district || 'District not set'
  return [permission.taluka, permission.district].filter(Boolean).join(', ') || 'Taluka not set'
}

export function getPermissionActionText(permission: Pick<AdminAreaPermission, 'can_view' | 'can_review' | 'can_approve'>) {
  const actions: string[] = []
  if (permission.can_view) actions.push('View')
  if (permission.can_review) actions.push('Review')
  if (permission.can_approve) actions.push('Approve')
  return actions.length ? actions.join(' / ') : 'No actions'
}

export function hasGlobalAdminRole(roles: readonly string[]) {
  return roles.some((role) => globalAdminRoles.includes(role))
}

export function getModuleAdminRoles(moduleKey: AreaPermissionModule) {
  return moduleAdminRoles[moduleKey] ?? []
}

export function hasModuleAdminRole(roles: readonly string[], moduleKey: AreaPermissionModule) {
  return roles.some((role) => getModuleAdminRoles(moduleKey).includes(role))
}

export async function currentUserCanManageAreaPermissions() {
  const { data, error } = await supabase.rpc('current_user_is_super_admin' as never)
  if (error) throw error
  return Boolean(data)
}

export async function searchUsersForAreaPermissions(query: string) {
  const { data, error } = await supabase.rpc('search_users_for_area_permissions' as never, {
    _query: query.trim(),
    _limit: 25,
  } as never)

  if (error) throw error
  return ((data ?? []) as unknown as AreaPermissionUser[]).map((item) => ({
    ...item,
    active_permissions_count: Number(item.active_permissions_count ?? 0),
    roles: Array.isArray(item.roles) ? item.roles : [],
  }))
}

export async function fetchAreaPermissionsForUser(userId: string) {
  const { data, error } = await supabase.rpc('get_area_permissions_for_user' as never, {
    _user_id: userId,
  } as never)

  if (error) throw error
  return (data ?? []) as unknown as AdminAreaPermission[]
}

export async function fetchMyAreaPermissions() {
  const { data, error } = await supabase.rpc('get_my_area_permissions' as never)
  if (error) throw error
  return (data ?? []) as unknown as AdminAreaPermission[]
}

export async function saveAreaPermission(input: AreaPermissionFormInput) {
  const district = input.scope === 'all' ? null : input.district?.trim() || null
  const taluka = input.scope === 'taluka' ? input.taluka?.trim() || null : null

  const { data, error } = await supabase.rpc('upsert_admin_area_permission' as never, {
    _permission_id: input.id ?? null,
    _user_id: input.userId,
    _module_key: input.moduleKey,
    _scope: input.scope,
    _district: district,
    _taluka: taluka,
    _can_view: input.canView,
    _can_review: input.canReview,
    _can_approve: input.canApprove,
    _is_active: input.isActive,
    _notes: input.notes?.trim() || null,
  } as never)

  if (error) throw error
  return data as unknown as AdminAreaPermission
}

export async function removeAreaPermission(permissionId: string) {
  const { error } = await supabase.rpc('delete_admin_area_permission' as never, {
    _permission_id: permissionId,
  } as never)

  if (error) throw error
}

export function canAccessArea(
  permissions: AdminAreaPermission[],
  moduleKey: AreaPermissionModule,
  district: string | null | undefined,
  taluka: string | null | undefined,
  action: AreaPermissionAction = 'view',
) {
  return permissions.some((permission) => permissionMatchesArea(permission, moduleKey, district, taluka, action))
}

export async function loadCurrentAdminAreaAccess(
  moduleKey: AreaPermissionModule,
  action: AreaPermissionAction = 'view',
  options?: {
    requiredRoles?: string[]
    allowAreaPermissionOnly?: boolean
    userId?: string | null
    roles?: readonly string[]
  },
): Promise<AdminAreaAccessContext> {
  let userId = options?.userId ?? null
  let roles = options?.roles ? Array.from(options.roles) : null

  if (!userId || !roles) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return emptyAreaAccess(moduleKey, action, 'Admin area dekhne ke liye pehle login karen.')
    }

    userId = user.id

    if (!roles) {
      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)

      if (roleError) {
        return emptyAreaAccess(moduleKey, action, roleError.message, userId)
      }

      roles = ((roleRows ?? []) as Array<{ role: string }>).map((item) => item.role)
    }
  }

  const safeRoles = roles ?? []
  const isGlobalAdmin = hasGlobalAdminRole(safeRoles)
  const requiredRoles = options?.requiredRoles ?? [...globalAdminRoles, ...getModuleAdminRoles(moduleKey)]
  const hasRequiredRole = safeRoles.some((role) => requiredRoles.includes(role))
  const permissions = isGlobalAdmin ? [] : await safeFetchMyAreaPermissions()
  const relevantPermissions = permissions.filter((permission) =>
    permissionMatchesModuleAndAction(permission, moduleKey, action),
  )

  if (isGlobalAdmin) {
    return {
      ok: true,
      message: '',
      userId: userId,
      moduleKey,
      action,
      roles: safeRoles,
      permissions: [],
      isGlobalAdmin: true,
      isRestricted: false,
      summary: 'All Sindh access active',
    }
  }

  if (relevantPermissions.length > 0) {
    return {
      ok: true,
      message: '',
      userId: userId,
      moduleKey,
      action,
      roles: safeRoles,
      permissions: relevantPermissions,
      isGlobalAdmin: false,
      isRestricted: true,
      summary: buildAreaAccessSummary(relevantPermissions, moduleKey),
    }
  }

  if (options?.allowAreaPermissionOnly === false && !hasRequiredRole) {
    return emptyAreaAccess(
      moduleKey,
      action,
      `${getAreaPermissionModuleLabel(moduleKey)} admin access required.`,
      userId,
      safeRoles,
    )
  }

  if (hasRequiredRole) {
    return emptyAreaAccess(
      moduleKey,
      action,
      `No active ${getAreaPermissionModuleLabel(moduleKey)} area permission assigned. Super admin must assign district/taluka access first.`,
      userId,
      safeRoles,
    )
  }

  return emptyAreaAccess(
    moduleKey,
    action,
    `${getAreaPermissionModuleLabel(moduleKey)} area access required.`,
    userId,
    safeRoles,
  )
}

export function filterRowsByAreaAccess<T extends AreaScopedRow>(
  rows: T[],
  access: AdminAreaAccessContext,
) {
  if (!access.ok) return []
  if (!access.isRestricted || access.isGlobalAdmin) return rows

  return rows.filter((row) =>
    access.permissions.some((permission) =>
      permissionMatchesArea(permission, access.moduleKey, row.district, row.taluka, access.action),
    ),
  )
}

export function getAreaAccessSummaryText(access: AdminAreaAccessContext) {
  if (!access.ok) return access.message

  // Global admins already have full access by role. Showing a large "All Sindh access"
  // badge on every module page creates visual clutter, so only restricted district/taluka
  // access is surfaced in the UI.
  if (access.isGlobalAdmin || !access.isRestricted) return ''

  return access.summary
}

export function getAreaAccessBadgeTone(access: AdminAreaAccessContext) {
  if (!access.ok) return 'border-red-200 bg-red-50 text-red-800'
  if (access.isRestricted) return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-emerald-200 bg-emerald-50 text-emerald-800'
}

function permissionMatchesArea(
  permission: AdminAreaPermission,
  moduleKey: AreaPermissionModule,
  district: string | null | undefined,
  taluka: string | null | undefined,
  action: AreaPermissionAction = 'view',
) {
  if (!permissionMatchesModuleAndAction(permission, moduleKey, action)) return false

  const normalizedDistrict = normalizeAreaValue(district)
  const normalizedTaluka = normalizeAreaValue(taluka)
  const permissionDistrict = normalizeAreaValue(permission.district)
  const permissionTaluka = normalizeAreaValue(permission.taluka)

  if (permission.scope === 'all') return true
  if (permission.scope === 'district') return permissionDistrict === normalizedDistrict
  return permissionDistrict === normalizedDistrict && permissionTaluka === normalizedTaluka
}

function permissionMatchesModuleAndAction(
  permission: AdminAreaPermission,
  moduleKey: AreaPermissionModule,
  action: AreaPermissionAction,
) {
  if (!permission.is_active) return false
  if (permission.module_key !== 'all' && permission.module_key !== moduleKey) return false

  if (action === 'review') return permission.can_review
  if (action === 'approve') return permission.can_approve
  return permission.can_view
}

function normalizeAreaValue(value?: string | null) {
  return value?.trim().toLowerCase() || ''
}

async function safeFetchMyAreaPermissions() {
  try {
    return await fetchMyAreaPermissions()
  } catch (error) {
    console.error('Failed to fetch area permissions:', error)
    return []
  }
}

function buildAreaAccessSummary(permissions: AdminAreaPermission[], moduleKey: AreaPermissionModule) {
  const areas = permissions.map((permission) => describeAreaPermission(permission))
  const uniqueAreas = Array.from(new Set(areas))
  return `${getAreaPermissionModuleLabel(moduleKey)} area access active: ${uniqueAreas.join(' · ')}`
}

function emptyAreaAccess(
  moduleKey: AreaPermissionModule,
  action: AreaPermissionAction,
  message: string,
  userId: string | null = null,
  roles: string[] = [],
): AdminAreaAccessContext {
  return {
    ok: false,
    message,
    userId,
    moduleKey,
    action,
    roles,
    permissions: [],
    isGlobalAdmin: false,
    isRestricted: true,
    summary: message,
  }
}
