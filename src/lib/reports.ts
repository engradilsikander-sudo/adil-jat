// JAS UX.9 Reports Center: one area-scoped aggregate response, not entire tables.
import { supabase } from './supabase/client'
import { loadCurrentAdminAreaAccess } from './area-permissions'

type MemberStatus = 'pending' | 'approved' | 'rejected'
type ProgramKey = 'education' | 'health' | 'welfare' | 'employment'
export type ReportsPeriod = 'all' | '6m' | '12m'

export type ReportMetric = {
  label: string
  value: number | string
  helper: string
}

export type ProgramSummary = {
  programKey: ProgramKey
  label: string
  total: number
  pending: number
  underReview: number
  approved: number
  rejected: number
  completed: number
  approvedAmount: number
}

export type DistrictSummary = {
  district: string
  members: number
  approvedMembers: number
  programApplications: number
  approvedDonations: number
  paidExpenses: number
}

export type FinancePurposeSummary = {
  purpose: string
  approvedDonations: number
  donationCount: number
  paidExpenses: number
  expenseCount: number
  balance: number
}

export type MonthlySummary = {
  month: string
  members: number
  applications: number
  donations: number
  expenses: number
}

export type RecentActivity = {
  id: string
  type: 'member' | 'program' | 'donation' | 'expense'
  title: string
  status: string
  date: string
}

export type ReportsCenterData = {
  financeVisible: boolean
  generatedAt: string
  metrics: ReportMetric[]
  memberStatus: Record<MemberStatus, number>
  programSummaries: ProgramSummary[]
  districtSummaries: DistrictSummary[]
  financeByPurpose: FinancePurposeSummary[]
  monthlySummaries: MonthlySummary[]
  recentActivity: RecentActivity[]
}

const programLabels: Record<ProgramKey, string> = {
  education: 'Education',
  health: 'Health',
  welfare: 'Welfare',
  employment: 'Employment',
}

// Fail closed on an incomplete or unexpected RPC response. In particular, never
// interpret missing counts as zero or display a partial set of finance totals.
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Reports summary is incomplete. Please refresh after the database migration.')
  }
  return value as Record<string, unknown>
}
function number(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') {
    throw new Error('Reports summary contains an unavailable amount or count.')
  }
  const result = Number(value)
  if (!Number.isFinite(result)) throw new Error('Reports summary contains an invalid number.')
  return result
}
function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Reports summary contains an invalid label or date.')
  return value
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Reports summary has an incomplete section.')
  return value
}

export function parseReportsCenterSummary(input: unknown): ReportsCenterData {
  const data = record(input)
  const totals = record(data.totals)
  const memberStatus = {
    pending: number(totals.members_pending),
    approved: number(totals.members_approved),
    rejected: number(totals.members_rejected),
  }
  const memberCount = number(totals.members_total)
  const applicationCount = number(totals.applications_total)
  const donations = number(totals.donations_amount)
  const expenses = number(totals.expenses_amount)
  const donationCount = number(totals.donations_count)
  const expenseCount = number(totals.expenses_count)
  const feesPaid = number(totals.fees_paid)
  const feesPending = number(totals.fees_pending)

  const programSummaries = list(data.programSummaries).map((value) => {
    const item = record(value)
    const key = string(item.programKey)
    if (!Object.hasOwn(programLabels, key)) throw new Error('Reports summary contains an unknown program.')
    const programKey = key as ProgramKey
    return {
      programKey,
      label: programLabels[programKey],
      total: number(item.total),
      pending: number(item.pending),
      underReview: number(item.underReview),
      approved: number(item.approved),
      rejected: number(item.rejected),
      completed: number(item.completed),
      approvedAmount: number(item.approvedAmount),
    }
  })
  const districtSummaries = list(data.districtSummaries).map((value) => {
    const item = record(value)
    return {
      district: string(item.district), members: number(item.members),
      approvedMembers: number(item.approvedMembers),
      programApplications: number(item.programApplications),
      approvedDonations: number(item.approvedDonations),
      paidExpenses: number(item.paidExpenses),
    }
  })
  const financeByPurpose = list(data.financeByPurpose).map((value) => {
    const item = record(value)
    return {
      purpose: string(item.purpose),
      approvedDonations: number(item.approvedDonations),
      donationCount: number(item.donationCount),
      paidExpenses: number(item.paidExpenses),
      expenseCount: number(item.expenseCount),
      balance: number(item.balance),
    }
  })
  const monthlySummaries = list(data.monthlySummaries).map((value) => {
    const item = record(value)
    return {
      month: string(item.month), members: number(item.members),
      applications: number(item.applications),
      donations: number(item.donations), expenses: number(item.expenses),
    }
  })
  const recentActivity = list(data.recentActivity).map((value) => {
    const item = record(value)
    const id = string(item.id)
    const type = string(item.type)
    const status = string(item.status)
    const date = string(item.date)
    let title: string
    if (type === 'member') {
      title = item.memberNo ? `Member ${string(item.memberNo)}` : 'Membership application'
    } else if (type === 'program') {
      const key = string(item.programKey)
      if (!Object.hasOwn(programLabels, key)) throw new Error('Reports summary contains an unknown activity program.')
      title = `${programLabels[key as ProgramKey]} application`
    } else if (type === 'donation' || type === 'expense') {
      title = `${formatCurrency(number(item.amount))} ${type} for ${string(item.purpose)}`
    } else {
      throw new Error('Reports summary contains an unknown activity type.')
    }
    return { id, type: type as RecentActivity['type'], title, status, date }
  })

  return {
    financeVisible: data.financeVisible === true,
    generatedAt: string(data.generatedAt),
    metrics: [
      { label: 'Membership Fees Received', value: formatCurrency(feesPaid), helper: 'Verified fees, recorded separately from donations' },
      { label: 'Membership Fees Pending', value: feesPending, helper: 'Awaiting payment verification; waived fees are not receipts' },
      { label: 'Total Members', value: memberCount, helper: `${memberStatus.approved} approved members` },
      { label: 'Pending Members', value: memberStatus.pending, helper: 'Need membership review' },
      { label: 'Program Applications', value: applicationCount, helper: 'Education, health, welfare and employment' },
      ...(data.financeVisible === true ? [{ label: 'Approved Donations', value: formatCurrency(donations), helper: `${donationCount} verified donation records` },
      { label: 'Paid Expenses', value: formatCurrency(expenses), helper: `${expenseCount} paid expense records` },
      { label: 'Available Balance', value: formatCurrency(donations - expenses), helper: 'Approved donations minus paid expenses' }] : []),
    ],
    memberStatus,
    programSummaries,
    districtSummaries,
    financeByPurpose,
    monthlySummaries,
    recentActivity,
  }
}

export async function currentUserCanViewReports() {
  const access = await loadCurrentAdminAreaAccess('reports', 'view', {
    requiredRoles: ['admin', 'super_admin'],
  })
  return access.ok
}

export async function loadReportsCenterData(period: ReportsPeriod = 'all'): Promise<ReportsCenterData> {
  if (period !== 'all' && period !== '6m' && period !== '12m') {
    throw new Error('Invalid reports period.')
  }
  const access = await loadCurrentAdminAreaAccess('reports', 'view', {
    requiredRoles: ['admin', 'super_admin'],
  })
  if (!access.ok) throw new Error(access.message)

  const { data, error } = await supabase.rpc('jas_reports_center_summary' as never, {
    _period: period,
  } as never)
  if (error) throw error
  return parseReportsCenterSummary(data)
}

export function formatCurrency(value: number) {
  return `Rs. ${Math.round(value).toLocaleString('en-PK')}`
}

export function formatReportDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Keep the three existing CSV export layouts and their full-fidelity values.
export function downloadReportCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) {
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => csvCell(String(cell))).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}
