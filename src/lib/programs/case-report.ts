import {
  formatHealthMoney, getHealthCasePriorityLabel, getHealthCommitteeDecisionLabel,
  getHealthDocumentLabel, getHealthDocumentStatusLabel, getHealthPaymentStatusLabel,
  getHealthStatusLabel, isHealthEmergency, type HealthApplicationDetails,
  type HealthDocumentRecord,
} from './health'
import {
  formatWelfareMoney, getWelfareCommitteeDecisionLabel,
  getWelfarePaymentStatusLabel, getWelfareStatusLabel, type WelfareApplicationDetails,
} from './welfare'

export type CaseReportData = {
  type: 'health' | 'welfare'
  title: string
  reference: string
  generatedAt: string
  confidential: string
  fields: Array<[string, string]>
  sections: Array<{ title: string; text: string }>
  documents?: Array<{ label: string; status: string; note: string }>
}
const str = (value: unknown): string => value === null || value === undefined || value === '' ? '-' : String(value)

export type HealthCaseApplication = {
  id: string; application_no: string | null; applicant_name: string; membership_no: string;
  district: string | null; taluka: string | null; status: string; approved_amount: number | null;
}
export type WelfareCaseApplication = {
  id: string; application_no: string | null; applicant_name: string; membership_no: string;
  status: string; approved_amount: number | null;
}
export type WelfareReportLabels = {
  badge: string; applicantName: string; membershipNo: string; caseType: string;
  requiredAmount: string; approvedAmount: string; committeeDecision: string;
}

/** All untrusted case fields are plain text, rendered by React (never innerHTML). */
export function createHealthCaseReport(
  app: HealthCaseApplication, d: HealthApplicationDetails, docs: HealthDocumentRecord[],
  generatedAt = new Date().toLocaleString(),
): CaseReportData {
  return {
    type: 'health', title: 'Jatt Welfare Alliance Sindh — Health Case Report',
    reference: str(app.application_no || app.id), generatedAt,
    confidential: 'Restricted medical information. Share only with authorized JWAS health committee/admin users.',
    fields: [
      ['Case No', str(app.application_no || app.id)],
      ['Patient Name', str(app.applicant_name)], ['Membership No', str(app.membership_no)],
      ['District / Taluka', `${str(app.district)} / ${str(app.taluka)}`],
      ['Status', getHealthStatusLabel(app.status)],
      ['Priority', getHealthCasePriorityLabel(d)],
      ['Emergency', isHealthEmergency(d) ? 'Yes' : 'No'],
      ['Disease / Condition', str(d.disease_name)], ['Treatment Type', str(d.treatment_type)],
      ['Hospital', str(d.hospital_name)], ['Doctor', str(d.doctor_name)],
      ['Estimated Cost', formatHealthMoney(d.estimated_cost)],
      ['Required Support', formatHealthMoney(d.required_amount)],
      ['Approved Amount', app.approved_amount === null ? 'Pending' : formatHealthMoney(app.approved_amount)],
      ['Payment Status', getHealthPaymentStatusLabel(d.payment_status)],
      ['Committee Decision', getHealthCommitteeDecisionLabel(d.health_committee_decision)],
      ['Committee Members', str(d.health_committee_members)],
      ['Committee Remarks', str(d.health_committee_remarks || d.medical_committee_remarks)],
      ['Follow-up Notes', str(d.follow_up_notes)], ['Case Close Report', str(d.case_close_report)],
    ],
    sections: [],
    documents: docs.map(doc => ({
      label: getHealthDocumentLabel(doc.document_type),
      status: getHealthDocumentStatusLabel(doc.verification_status),
      note: str(doc.admin_note),
    })),
  }
}

export function createWelfareCaseReport(
  app: WelfareCaseApplication, d: WelfareApplicationDetails, labels: WelfareReportLabels,
  generatedAt = new Date().toLocaleString(),
): CaseReportData {
  return {
    type: 'welfare', title: `JWAS ${labels.badge} Close Report`,
    reference: str(app.application_no || app.id), generatedAt,
    confidential: 'Confidential welfare case information. Share only with authorized JWAS staff.',
    fields: [
      [labels.applicantName, str(app.applicant_name)],
      [labels.membershipNo, str(app.membership_no)],
      [labels.caseType, str(d.case_type)],
      ['Status', getWelfareStatusLabel(app.status)],
      [labels.requiredAmount, formatWelfareMoney(d.required_amount)],
      [labels.approvedAmount, app.approved_amount === null ? '-' : formatWelfareMoney(app.approved_amount)],
      ['Fund Status', getWelfarePaymentStatusLabel(d.payment_status)],
      [labels.committeeDecision, getWelfareCommitteeDecisionLabel(d.welfare_committee_decision)],
    ],
    sections: [
      { title: 'Case Reason', text: str(d.reason) },
      { title: 'Verifier Remarks', text: str(d.verifier_remarks) },
      { title: 'Committee Remarks', text: str(d.welfare_committee_remarks) },
      { title: 'Case Close Report', text: str(d.case_close_report) },
    ],
  }
}
