import { expect, it } from 'vitest'
import { buildMemberCardExportSearchFilter } from './admin-member-card-export-core'
import { normalizeVerificationNumber } from './verify/validation'
import { buildMemberVerificationUrl, buildMemberCardIssueLabel } from './member-card-config'
import { buildFullMemberCardCsv, type MemberCardCsvSource } from './admin-member-card-csv'

it.each(['0001','0999','9999','10000','10001','2147483647'])('preserves sequence %s through verification, QR URL and export', suffix => {
  const id = `JAS-2026-${suffix}`
  expect(normalizeVerificationNumber(` ${id.toLowerCase()} `)).toBe(id)
  const url = buildMemberVerificationUrl(id, 'https://jasofficial.org')
  expect(url).toBe(`https://jasofficial.org/verify/${id}`)
  expect(buildMemberCardIssueLabel(id)).toBe(`${id} / v1`)
  const member = { id: 'test', member_no: id, full_name: 'Capacity test', status: 'approved' } as MemberCardCsvSource
  const csv = buildFullMemberCardCsv({ members: [member], designationsByMemberId: {}, publicVerifyOrigin: 'https://jasofficial.org' })
  expect(csv).toContain(`"${id}"`)
  expect(csv).toContain(url)
  expect(buildMemberCardExportSearchFilter(id)).toContain(`member_no.ilike.%${id}%`)
})
