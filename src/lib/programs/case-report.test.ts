import { expect, it } from 'vitest'
import { createHealthCaseReport, createWelfareCaseReport } from './case-report'
import type { HealthDocumentRecord } from './health'
const health = { id: 'h-id', application_no: 'HC-101', applicant_name: 'Ali <script>evil</script>', membership_no: 'JWAS-001', district: 'Umerkot', taluka: 'Kunri', status: 'submitted', approved_amount: null }
const welfare = { id: 'w-id', application_no: 'WC-101', applicant_name: 'Ayesha', membership_no: 'JWAS-002', status: 'approved', approved_amount: 0 }
const labels = { badge: 'Welfare', applicantName: 'Applicant', membershipNo: 'Membership No', caseType: 'Case Type', requiredAmount: 'Required Amount', approvedAmount: 'Approved Amount', committeeDecision: 'Committee Decision' }

it('includes authorized health summary fields and medical document verification notes', () => {
  const docs = [{ document_type: 'medical_reports', verification_status: 'verified', admin_note: 'Reviewed' }] as HealthDocumentRecord[]
  const report = createHealthCaseReport(health, { disease_name: 'Diabetes', required_amount: '5000', emergency: true }, docs, 'November 4')
  expect(report.type).toBe('health')
  expect(report.reference).toBe('HC-101')
  expect(report.generatedAt).toBe('November 4')
  expect(report.fields.some(([k, v]) => k === 'Disease / Condition' && v === 'Diabetes')).toBe(true)
  expect(report.fields.some(([k, v]) => k === 'Emergency' && v === 'Yes')).toBe(true)
  expect(report.documents?.[0].note).toBe('Reviewed')
})

it('keeps untrusted medical text as literal data, never HTML snippets', () => {
  const report = createHealthCaseReport(health, { disease_name: 'بيماري', case_close_report: '<img src=x onerror=alert(1)>' }, [], 'now')
  expect(report.fields.find(([k]) => k === 'Patient Name')?.[1]).toContain('<script>')
  expect(report.fields.find(([k]) => k === 'Case Close Report')?.[1]).toContain('<img')
  expect(report.fields.find(([k]) => k === 'Disease / Condition')?.[1]).toBe('بيماري')
  expect(report.documents).toEqual([])
})

it('does not confuse an approved amount of zero with Pending', () => {
  const report = createHealthCaseReport({ ...health, approved_amount: 0 }, {}, [], 'now')
  expect(report.fields.find(([k]) => k === 'Approved Amount')?.[1]).toBe('Rs. 0')
})

it('preserves every Welfare close-report section', () => {
  const report = createWelfareCaseReport(welfare, { reason: 'Support', verifier_remarks: 'Verified', welfare_committee_remarks: 'Approved', case_close_report: 'Closed' }, labels, 'now')
  expect(report.type).toBe('welfare')
  expect(report.sections.map(s => s.title)).toEqual(['Case Reason', 'Verifier Remarks', 'Committee Remarks', 'Case Close Report'])
  expect(report.sections[3].text).toBe('Closed')
  expect(report.fields.find(([k]) => k === 'Approved Amount')?.[1]).toBe('Rs. 0')
})

it('handles missing optional information without inventing report content', () => {
  const report = createWelfareCaseReport({ ...welfare, application_no: null, approved_amount: null }, {}, labels, 'now')
  expect(report.reference).toBe('w-id')
  expect(report.sections.every(s => s.text === '-')).toBe(true)
  expect(report.fields.find(([k]) => k === 'Approved Amount')?.[1]).toBe('-')
})
