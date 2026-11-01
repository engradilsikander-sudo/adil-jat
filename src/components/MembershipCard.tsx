import type { CSSProperties, ReactNode } from 'react'
import { getMemberDesignationTitle, type MemberCardDesignation } from '../lib/member-card-designation'
import { buildMemberCardIssueLabel } from '../lib/member-card-config'

export const CARD_WIDTH = 1280
export const CARD_HEIGHT = 760
export type CardSide = 'front' | 'back'

export type MembershipCardMember = {
  id: string
  member_no: string | null
  full_name: string
  father_name: string
  cnic: string
  mobile: string
  district: string
  taluka: string | null
  profession: string | null
  caste_branch: string | null
  photo_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  approved_at: string | null

  address: string | null
  date_of_birth: string | null
  gender: string | null
  education: string | null
  blood_group: string | null
  emergency_contact_name: string | null
  emergency_contact_relation: string | null
  emergency_contact_mobile: string | null
  declaration_accepted: boolean
  activeDesignation?: MemberCardDesignation | null
}

type MembershipCardProps = {
  side: CardSide
  member: MembershipCardMember
  photoUrl: string | null
  logoUrl: string | null
  flagUrl: string | null
  qrUrl: string | null
  verifyUrl: string
}

const NAVY = '#142d4e'
const TEAL = '#087f8c'
const MUTED = '#52647b'
const LINE = '#dce5ef'
const SIGNATURE_PATH = '/jas/signature.png'
const boundedText: CSSProperties = { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }
const labelStyle: CSSProperties = { margin: 0, color: MUTED, fontSize: 12, fontWeight: 700, letterSpacing: 1.3, lineHeight: 1.4, textTransform: 'uppercase' }

export function MembershipCard({ side, member, photoUrl, logoUrl, qrUrl, verifyUrl }: MembershipCardProps) {
  return (
    <article
      dir="ltr"
      lang="en"
      aria-label={`${member.full_name} membership card, ${side}`}
      data-card-design="navy-teal-v2"
      style={{ width: CARD_WIDTH, minWidth: CARD_WIDTH, height: CARD_HEIGHT, flexShrink: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 24, border: `1px solid ${LINE}`, background: '#ffffff', color: NAVY, fontFamily: 'Arial, "Segoe UI", sans-serif', lineHeight: 1.4, textAlign: 'left', colorScheme: 'light' }}
    >
      <CardHeader member={member} logoUrl={logoUrl} back={side === 'back'} />
      {side === 'front'
        ? <CardFront member={member} photoUrl={photoUrl} qrUrl={qrUrl} verifyUrl={verifyUrl} />
        : <CardBack member={member} qrUrl={qrUrl} verifyUrl={verifyUrl} />}
      <footer style={{ height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, borderTop: `1px solid ${LINE}`, padding: '0 32px', background: '#f4f7fb', fontSize: 12, color: MUTED }}>
        <span>Valid only when the live QR record confirms approved, active membership.</span>
        <span style={{ fontWeight: 700, color: NAVY, whiteSpace: 'nowrap' }}>Sindh, Pakistan</span>
      </footer>
    </article>
  )
}

function CardHeader({ member, logoUrl, back }: { member: MembershipCardMember; logoUrl: string | null; back: boolean }) {
  const status = { approved: 'Approved member', pending: 'Pending review', rejected: 'Not approved' }[member.status]
  return (
    <header style={{ height: 132, flexShrink: 0, boxSizing: 'border-box', padding: '24px 32px', background: NAVY, borderBottom: `5px solid ${TEAL}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, color: '#ffffff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 }}>
        {logoUrl
          ? <img src={logoUrl} alt="Jatt Alliance Sindh logo" draggable={false} style={{ width: 76, height: 76, flexShrink: 0, borderRadius: '50%', objectFit: 'contain', background: '#ffffff' }} />
          : <span style={{ width: 76, height: 76, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: '50%', border: '2px solid #87d7df', fontSize: 25, fontWeight: 800 }}>JAS</span>}
        <div>
          <h2 style={{ margin: 0, fontSize: 33, fontWeight: 800, letterSpacing: .5, lineHeight: 1.15 }}>JATT ALLIANCE SINDH</h2>
          <p style={{ margin: '9px 0 0', color: '#aee1e7', fontSize: 16, fontWeight: 600, letterSpacing: 1.2 }}>Education · Health · Dignity</p>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ margin: '0 0 9px', fontSize: 12, letterSpacing: 2, color: '#c7d8e9', textTransform: 'uppercase', fontWeight: 700 }}>{back ? 'Cardholder information' : 'Membership card'}</p>
        <span style={{ display: 'inline-block', padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 700, background: member.status === 'approved' ? '#d6f2ee' : '#fff1ce', color: member.status === 'approved' ? '#07574d' : '#784e09' }}>{status}</span>
      </div>
    </header>
  )
}

function CardFront({ member, photoUrl, qrUrl, verifyUrl }: Pick<MembershipCardProps, 'member' | 'photoUrl' | 'qrUrl' | 'verifyUrl'>) {
  const designation = getMemberDesignationTitle(member.activeDesignation) || 'Member'
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '244px minmax(0, 1fr) 240px', gap: 30, padding: 30, boxSizing: 'border-box' }}>
      <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 280, width: 244, boxSizing: 'border-box', overflow: 'hidden', borderRadius: 12, border: `1px solid ${LINE}`, background: '#edf2f7' }}>
          {photoUrl
            ? <img src={photoUrl} alt={`${member.full_name} profile photo`} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
            : <div style={{ height: '100%', display: 'grid', placeItems: 'center', fontSize: 18, color: MUTED }}>Photo unavailable</div>}
        </div>
        <div style={{ marginTop: 16, padding: '15px 16px', background: NAVY, borderRadius: 10, color: '#ffffff' }}>
          <p style={{ ...labelStyle, color: '#aee1e7', fontSize: 11 }}>Membership number</p>
          <p style={{ margin: '6px 0 0', fontSize: fitSize(member.member_no || '', 23, 18, 20), fontWeight: 800, letterSpacing: .2, overflowWrap: 'anywhere' }}>{member.member_no || 'Not issued'}</p>
        </div>
        <div style={{ marginTop: 17 }}>
          <p style={labelStyle}>Designation</p>
          <p style={{ ...boundedText, WebkitLineClamp: 3, margin: '5px 0 0', fontSize: fitSize(designation, 20, 14, 28), fontWeight: 700, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{designation}</p>
        </div>
      </section>
      <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '4px 0' }}>
        <div>
          <p style={labelStyle}>Member name</p>
          <h3 style={{ ...boundedText, WebkitLineClamp: 3, margin: '9px 0 0', fontSize: fitSize(member.full_name, 43, 25, 23), fontWeight: 800, lineHeight: 1.15, letterSpacing: -.7, overflowWrap: 'anywhere' }}>{member.full_name}</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 26, rowGap: 25, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, padding: '25px 0', marginBlock: 20 }}>
          <Field label="Father name" value={member.father_name} />
          <Field label="District" value={member.district} />
          <Field label="Taluka" value={member.taluka} />
          <Field label="Profession" value={member.profession} />
          <Field label="Approved on" value={member.status === 'approved' ? formatDate(member.approved_at) : 'Not approved'} />
          <Field label="Blood group" value={member.blood_group} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, color: MUTED }}>
          <span style={{ width: 4, alignSelf: 'stretch', flexShrink: 0, background: TEAL, borderRadius: 2 }} />
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>This card identifies the named JAS member. Scan the QR code to confirm the current membership record.</p>
        </div>
      </section>
      <aside style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18, borderLeft: `1px solid ${LINE}`, paddingLeft: 20, minWidth: 0 }}>
        <p style={{ ...labelStyle, color: TEAL, textAlign: 'center' }}>Digital verification</p>
        <QrBlock qrUrl={qrUrl} size={184} />
        <p style={{ margin: 0, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>Scan to verify</p>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: MUTED, lineHeight: 1.65, overflowWrap: 'anywhere' }}>{displayVerifyUrl(verifyUrl)}</p>
        <p style={{ margin: '10px 0 0', textAlign: 'center', color: TEAL, fontSize: 11, fontWeight: 700, letterSpacing: 1.3 }}>PERSONAL · NON-TRANSFERABLE</p>
      </aside>
    </div>
  )
}

function CardBack({ member, qrUrl, verifyUrl }: Pick<MembershipCardProps, 'member' | 'qrUrl' | 'verifyUrl'>) {
  const designation = getMemberDesignationTitle(member.activeDesignation) || 'Member'
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 276px', gap: 26, padding: 28, boxSizing: 'border-box' }}>
      <div style={{ minWidth: 0, display: 'grid', gridTemplateRows: '136px 157px minmax(0, 1fr)', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Panel title="Residential address">
            <p style={{ ...boundedText, WebkitLineClamp: 3, margin: '9px 0 0', fontSize: fitSize(member.address || '', 17, 13, 70), fontWeight: 700, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{member.address || 'Not provided'}</p>
            <p style={{ margin: '7px 0 0', fontSize: 13, color: MUTED }}>{[member.taluka, member.district].filter(Boolean).join(', ')}</p>
          </Panel>
          <Panel title="Emergency contact">
            <p style={{ ...boundedText, margin: '9px 0 0', fontSize: fitSize(member.emergency_contact_name || '', 18, 13, 30), fontWeight: 700, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{member.emergency_contact_name || 'Not provided'}</p>
            <p style={{ margin: '5px 0 0', fontSize: 13, color: MUTED }}>Relation: {member.emergency_contact_relation || 'Not provided'}</p>
            <p style={{ margin: '6px 0 0', fontSize: 17, fontWeight: 700, color: TEAL }}>{formatMobile(member.emergency_contact_mobile)}</p>
          </Panel>
        </div>
        <Panel title="Personal record">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '14px 18px', marginTop: 12 }}>
            <Field small label="CNIC" value={formatCnic(member.cnic)} />
            <Field small label="Mobile" value={formatMobile(member.mobile)} />
            <Field small label="Date of birth" value={formatDate(member.date_of_birth)} />
            <Field small label="Gender" value={member.gender} />
            <Field small label="Education" value={member.education} />
            <Field small label="Blood group" value={member.blood_group} />
            <div style={{ gridColumn: 'span 2', minWidth: 0 }}><Field small label="Designation" value={designation} /></div>
          </div>
        </Panel>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, minHeight: 0 }}>
          <Panel title="Cardholder guidance">
            <ul style={{ margin: '10px 0 0', paddingLeft: 17, fontSize: 13, color: MUTED, lineHeight: 1.65, listStyle: 'disc' }}>
              <li>This card remains the property of Jatt Alliance Sindh.</li>
              <li>Misuse, alteration or transfer is prohibited.</li>
              <li>Match the name, member number and approval status with the live verification record.</li>
            </ul>
          </Panel>
          <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0, paddingTop: 3 }}>
            <p style={{ ...labelStyle, color: TEAL }}>Issuing authority</p>
            <img src={SIGNATURE_PATH} alt="Authorized signature" draggable={false} style={{ width: 230, height: 80, maxWidth: '100%', objectFit: 'contain', objectPosition: 'left center', margin: '6px 0', flexShrink: 0 }} />
            <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 7 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Authorized Signature</p>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: 1 }}>GENERAL SECRETARY</p>
            </div>
          </section>
        </div>
      </div>
      <aside style={{ borderRadius: 12, padding: 20, boxSizing: 'border-box', background: '#edf5f8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
        <div>
          <p style={{ ...labelStyle, color: TEAL, fontSize: 11 }}>Issue number / version</p>
          <p style={{ margin: '7px 0 0', fontSize: 18, fontWeight: 800, overflowWrap: 'anywhere' }}>{buildMemberCardIssueLabel(member.member_no)}</p>
        </div>
        <div>
          <QrBlock qrUrl={qrUrl} size={196} />
          <p style={{ margin: '9px 0 0', textAlign: 'center', fontSize: 13, fontWeight: 700 }}>Scan to verify membership</p>
        </div>
        <div>
          <p style={{ ...labelStyle, fontSize: 10 }}>Verification URL</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.6, overflowWrap: 'anywhere' }}>{displayVerifyUrl(verifyUrl)}</p>
        </div>
        <div style={{ paddingTop: 14, borderTop: '1px solid #cadfe5' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Jatt Alliance Sindh</p>
          <p style={{ margin: '4px 0 0', color: TEAL, fontSize: 12 }}>Education · Health · Dignity</p>
        </div>
      </aside>
    </div>
  )
}

function QrBlock({ qrUrl, size }: { qrUrl: string | null; size: number }) {
  return (
    <div style={{ width: size + 28, height: size + 28, padding: 14, boxSizing: 'border-box', background: '#ffffff', marginInline: 'auto', flexShrink: 0 }}>
      {qrUrl
        ? <img src={qrUrl} alt="Membership verification QR code" draggable={false} style={{ width: size, height: size, maxWidth: 'none', objectFit: 'contain', display: 'block' }} />
        : <div style={{ width: size, height: size, display: 'grid', placeItems: 'center', color: MUTED, fontSize: 13, textAlign: 'center', background: '#f4f7fb' }}>QR unavailable</div>}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section style={{ minWidth: 0, borderTop: `2px solid ${LINE}`, paddingTop: 10 }}><h3 style={{ ...labelStyle, color: TEAL }}>{title}</h3>{children}</section>
}

function Field({ label, value, small = false }: { label: string; value: string | null | undefined; small?: boolean }) {
  const text = value?.trim() || 'Not provided'
  return <div style={{ minWidth: 0 }}><p style={{ ...labelStyle, fontSize: small ? 10 : 12 }}>{label}</p><p style={{ ...boundedText, margin: '5px 0 0', fontSize: fitSize(text, small ? 15 : 21, small ? 12 : 15, small ? 24 : 25), fontWeight: 700, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{text}</p></div>
}

function fitSize(value: string, preferred: number, minimum: number, threshold: number) {
  return Math.max(minimum, preferred - Math.max(0, value.length - threshold) * .4)
}

function displayVerifyUrl(value: string) {
  if (!value) return 'Verification link unavailable'
  try { const url = new URL(value); return `${url.host}${url.pathname}${url.search}` }
  catch { return value.replace(/^https?:\/\//, '') }
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not provided'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not provided'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function formatCnic(value: string | null | undefined) {
  if (!value) return 'Not provided'
  const digits = value.replace(/\D/g, '')
  return digits.length === 13 ? `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}` : value
}

function formatMobile(value: string | null | undefined) {
  if (!value) return 'Not provided'
  const digits = value.replace(/\D/g, '')
  return digits.startsWith('92') && digits.length === 12 ? `+${digits}` : value
}
