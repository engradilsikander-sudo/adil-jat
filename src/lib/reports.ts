// src/lib/reports.ts
import { supabase } from './supabase/client'
import { filterRowsByAreaAccess, loadCurrentAdminAreaAccess } from './area-permissions'

type MemberStatus = 'pending' | 'approved' | 'rejected'
type ProgramKey = 'education' | 'health' | 'welfare' | 'employment'

type MemberReportRow = {
  id: string
  status: MemberStatus
  district: string | null
  taluka: string | null
  created_at: string
  approved_at: string | null
  member_no: string | null
}

type ProgramApplicationReportRow = {
  id: string
  program_key: ProgramKey
  status: string
  district: string | null
  taluka: string | null
  approved_amount: number | null
  created_at: string
  submitted_at: string | null
}

type FinanceDonationReportRow = {
  id: string
  amount: number
  purpose: string
  payment_method: string
  status: string
  district: string | null
  taluka: string | null
  created_at: string
  approved_at: string | null
}

type FinanceExpenseReportRow = {
  id: string
  amount: number
  category: string
  linked_program_key: ProgramKey | null
  payment_method: string
  status: string
  district: string | null
  taluka: string | null
  created_at: string
  paid_at: string | null
}

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

const programKeys: ProgramKey[] = ['education', 'health', 'welfare', 'employment']

export async function currentUserCanViewReports() {
  const access = await loadCurrentAdminAreaAccess('reports', 'view', {
    requiredRoles: ['admin', 'super_admin'],
  })

  return access.ok
}

export async function loadReportsCenterData(): Promise<ReportsCenterData> {
  const areaAccess = await loadCurrentAdminAreaAccess('reports', 'view', {
    requiredRoles: ['admin', 'super_admin'],
  })

  if (!areaAccess.ok) {
    throw new Error(areaAccess.message)
  }

  const [membersResult, applicationsResult, donationsResult, expensesResult] =
    await Promise.all([
      supabase
        .from('members')
        .select('id,status,district,taluka,created_at,approved_at,member_no')
        .returns<MemberReportRow[]>(),
      supabase
        .from('program_applications')
        .select(
          'id,program_key,status,district,taluka,approved_amount,created_at,submitted_at',
        )
        .in('program_key', programKeys)
        .returns<ProgramApplicationReportRow[]>(),
      supabase
        .from('finance_donations')
        .select(
          'id,amount,purpose,payment_method,status,district,taluka,created_at,approved_at',
        )
        .returns<FinanceDonationReportRow[]>(),
      supabase
        .from('finance_expenses')
        .select(
          'id,amount,category,linked_program_key,payment_method,status,district,taluka,created_at,paid_at',
        )
        .returns<FinanceExpenseReportRow[]>(),
    ])

  if (membersResult.error) throw membersResult.error
  if (applicationsResult.error) throw applicationsResult.error
  if (donationsResult.error) throw donationsResult.error
  if (expensesResult.error) throw expensesResult.error

  const members = filterRowsByAreaAccess(membersResult.data ?? [], areaAccess)
  const applications = filterRowsByAreaAccess(applicationsResult.data ?? [], areaAccess)
  const donations = filterRowsByAreaAccess(donationsResult.data ?? [], areaAccess)
  const expenses = filterRowsByAreaAccess(expensesResult.data ?? [], areaAccess)

  const approvedDonations = donations.filter((item) => isApprovedStatus(item.status))
  const paidExpenses = expenses.filter((item) => isPaidExpenseStatus(item.status))

  const approvedDonationAmount = sumAmounts(approvedDonations)
  const paidExpenseAmount = sumAmounts(paidExpenses)

  const memberStatus = {
    pending: members.filter((item) => item.status === 'pending').length,
    approved: members.filter((item) => item.status === 'approved').length,
    rejected: members.filter((item) => item.status === 'rejected').length,
  }

  const programSummaries = buildProgramSummaries(applications)
  const districtSummaries = buildDistrictSummaries(
    members,
    applications,
    approvedDonations,
    paidExpenses,
  )
  const financeByPurpose = buildFinanceByPurpose(approvedDonations, paidExpenses)
  const monthlySummaries = buildMonthlySummaries(
    members,
    applications,
    approvedDonations,
    paidExpenses,
  )
  const recentActivity = buildRecentActivity(
    members,
    applications,
    donations,
    expenses,
  )

  return {
    generatedAt: new Date().toISOString(),
    metrics: [
      {
        label: 'Total Members',
        value: members.length,
        helper: `${memberStatus.approved} approved members`,
      },
      {
        label: 'Pending Members',
        value: memberStatus.pending,
        helper: 'Need membership review',
      },
      {
        label: 'Program Applications',
        value: applications.length,
        helper: 'Education, health, welfare and employment',
      },
      {
        label: 'Approved Donations',
        value: formatCurrency(approvedDonationAmount),
        helper: `${approvedDonations.length} verified donation records`,
      },
      {
        label: 'Paid Expenses',
        value: formatCurrency(paidExpenseAmount),
        helper: `${paidExpenses.length} paid expense records`,
      },
      {
        label: 'Available Balance',
        value: formatCurrency(approvedDonationAmount - paidExpenseAmount),
        helper: 'Approved donations minus paid expenses',
      },
    ],
    memberStatus,
    programSummaries,
    districtSummaries,
    financeByPurpose,
    monthlySummaries,
    recentActivity,
  }
}

function buildProgramSummaries(applications: ProgramApplicationReportRow[]) {
  return programKeys.map((programKey) => {
    const rows = applications.filter((item) => item.program_key === programKey)

    return {
      programKey,
      label: programLabels[programKey],
      total: rows.length,
      pending: rows.filter((item) => isPendingStatus(item.status)).length,
      underReview: rows.filter((item) => isUnderReviewStatus(item.status)).length,
      approved: rows.filter((item) => isApprovedStatus(item.status)).length,
      rejected: rows.filter((item) => isRejectedStatus(item.status)).length,
      completed: rows.filter((item) => isCompletedStatus(item.status)).length,
      approvedAmount: sumApprovedAmounts(rows),
    }
  })
}

function buildDistrictSummaries(
  members: MemberReportRow[],
  applications: ProgramApplicationReportRow[],
  approvedDonations: FinanceDonationReportRow[],
  paidExpenses: FinanceExpenseReportRow[],
) {
  const districts = uniqueSorted([
    ...members.map((item) => normalizeDistrict(item.district)),
    ...applications.map((item) => normalizeDistrict(item.district)),
    ...approvedDonations.map((item) => normalizeDistrict(item.district)),
    ...paidExpenses.map((item) => normalizeDistrict(item.district)),
  ])

  return districts
    .map((district) => ({
      district,
      members: members.filter((item) => normalizeDistrict(item.district) === district)
        .length,
      approvedMembers: members.filter(
        (item) =>
          normalizeDistrict(item.district) === district && item.status === 'approved',
      ).length,
      programApplications: applications.filter(
        (item) => normalizeDistrict(item.district) === district,
      ).length,
      approvedDonations: sumAmounts(
        approvedDonations.filter(
          (item) => normalizeDistrict(item.district) === district,
        ),
      ),
      paidExpenses: sumAmounts(
        paidExpenses.filter((item) => normalizeDistrict(item.district) === district),
      ),
    }))
    .sort((a, b) => b.members + b.programApplications - (a.members + a.programApplications))
    .slice(0, 12)
}

function buildFinanceByPurpose(
  approvedDonations: FinanceDonationReportRow[],
  paidExpenses: FinanceExpenseReportRow[],
) {
  const purposes = uniqueSorted([
    ...approvedDonations.map((item) => normalizePurpose(item.purpose)),
    ...paidExpenses.map((item) => normalizePurpose(item.linked_program_key ?? item.category)),
  ])

  return purposes.map((purpose) => {
    const donationRows = approvedDonations.filter(
      (item) => normalizePurpose(item.purpose) === purpose,
    )
    const expenseRows = paidExpenses.filter(
      (item) => normalizePurpose(item.linked_program_key ?? item.category) === purpose,
    )
    const approvedDonationAmount = sumAmounts(donationRows)
    const paidExpenseAmount = sumAmounts(expenseRows)

    return {
      purpose,
      approvedDonations: approvedDonationAmount,
      donationCount: donationRows.length,
      paidExpenses: paidExpenseAmount,
      expenseCount: expenseRows.length,
      balance: approvedDonationAmount - paidExpenseAmount,
    }
  })
}

function buildMonthlySummaries(
  members: MemberReportRow[],
  applications: ProgramApplicationReportRow[],
  approvedDonations: FinanceDonationReportRow[],
  paidExpenses: FinanceExpenseReportRow[],
) {
  const months = buildLastMonths(6)

  return months.map((month) => ({
    month,
    members: members.filter((item) => getMonthKey(item.created_at) === month).length,
    applications: applications.filter((item) => getMonthKey(item.created_at) === month)
      .length,
    donations: sumAmounts(
      approvedDonations.filter((item) => getMonthKey(item.created_at) === month),
    ),
    expenses: sumAmounts(
      paidExpenses.filter((item) => getMonthKey(item.created_at) === month),
    ),
  }))
}

function buildRecentActivity(
  members: MemberReportRow[],
  applications: ProgramApplicationReportRow[],
  donations: FinanceDonationReportRow[],
  expenses: FinanceExpenseReportRow[],
) {
  const activities: RecentActivity[] = [
    ...members.map((item) => ({
      id: `member-${item.id}`,
      type: 'member' as const,
      title: item.member_no ? `Member ${item.member_no}` : 'Membership application',
      status: item.status,
      date: item.created_at,
    })),
    ...applications.map((item) => ({
      id: `program-${item.id}`,
      type: 'program' as const,
      title: `${programLabels[item.program_key]} application`,
      status: item.status,
      date: item.created_at,
    })),
    ...donations.map((item) => ({
      id: `donation-${item.id}`,
      type: 'donation' as const,
      title: `${formatCurrency(item.amount)} donation for ${normalizePurpose(item.purpose)}`,
      status: item.status,
      date: item.created_at,
    })),
    ...expenses.map((item) => ({
      id: `expense-${item.id}`,
      type: 'expense' as const,
      title: `${formatCurrency(item.amount)} expense for ${normalizePurpose(
        item.linked_program_key ?? item.category,
      )}`,
      status: item.status,
      date: item.created_at,
    })),
  ]

  return activities
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12)
}

function buildLastMonths(count: number) {
  const months: string[] = []
  const now = new Date()

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    months.push(getMonthKey(date.toISOString()))
  }

  return months
}

function getMonthKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function isPendingStatus(status: string) {
  return ['new', 'submitted', 'pending', 'pending_verification'].includes(status)
}

function isUnderReviewStatus(status: string) {
  return ['under_review', 'under_verification', 'need_more_info', 'verified'].includes(
    status,
  )
}

function isApprovedStatus(status: string) {
  return ['approved', 'committee_approved', 'paid', 'fund_released'].includes(status)
}

function isRejectedStatus(status: string) {
  return ['rejected', 'committee_rejected', 'not_recommended'].includes(status)
}

function isCompletedStatus(status: string) {
  return ['completed', 'paid_completed', 'closed', 'placed', 'employed'].includes(status)
}

function isPaidExpenseStatus(status: string) {
  return ['paid', 'completed', 'closed'].includes(status)
}

function sumAmounts(rows: Array<{ amount: number | null }>) {
  return rows.reduce((total, row) => total + Number(row.amount ?? 0), 0)
}

function sumApprovedAmounts(rows: ProgramApplicationReportRow[]) {
  return rows.reduce((total, row) => total + Number(row.approved_amount ?? 0), 0)
}

function normalizeDistrict(value: string | null | undefined) {
  return value?.trim() || 'Not specified'
}

function normalizePurpose(value: string | null | undefined) {
  const raw = value?.trim() || 'General Fund'

  return raw
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export function formatCurrency(value: number) {
  return `Rs. ${Math.round(value).toLocaleString('en-PK')}`
}

export function formatReportDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function downloadReportCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) {
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => csvCell(String(cell))).join(','))
    .join('\n')

  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  })
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
