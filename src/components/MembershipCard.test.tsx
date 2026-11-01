import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MembershipCard, type MembershipCardMember } from './MembershipCard'

// Rendering supplied card data must not require a live database connection.
vi.mock('../lib/supabase/client', () => ({ supabase: {} }))

const member: MembershipCardMember = {
  id: 'test-member', member_no: 'JAS-2026-1234', full_name: 'Example Member',
  father_name: 'Example Father', cnic: '4440412345678', mobile: '923001234567',
  district: 'Umerkot', taluka: 'Kunri', profession: 'Teacher', caste_branch: null,
  photo_url: null, status: 'approved', approved_at: '2026-09-01T00:00:00Z',
  address: 'Example address, Sindh', date_of_birth: '1990-02-03', gender: 'Male',
  education: 'Graduate', blood_group: 'AB+', emergency_contact_name: 'Example Contact',
  emergency_contact_relation: 'Brother', emergency_contact_mobile: '03011234567',
  declaration_accepted: true,
}
const props = { member, photoUrl: null, logoUrl: null, flagUrl: null, qrUrl: 'data:image/png;base64,cXItZXhhbXBsZQ==', verifyUrl: 'https://example.org/verify/JAS-2026-1234' }

describe('membership card rendering', () => {
  it.each(['front', 'back'] as const)('preserves verification and member identity on %s', (side) => {
    const html = renderToStaticMarkup(<MembershipCard {...props} side={side} />)
    expect(html).toContain(props.qrUrl)
    expect(html).toContain('example.org/verify/JAS-2026-1234')
    expect(html).toContain('JAS-2026-1234')
    expect(html).toContain('Approved member')
  })
  it.each(['pending', 'rejected'] as const)('never labels a %s member as approved', (status) => {
    for (const side of ['front', 'back'] as const) {
      const html = renderToStaticMarkup(<MembershipCard {...props} member={{ ...member, status }} side={side} />)
      expect(html).not.toContain('Approved member')
      expect(html).toContain(status === 'pending' ? 'Pending review' : 'Not approved')
    }
  })
  it('retains emergency details and formatted personal identifiers on the back', () => {
    const html = renderToStaticMarkup(<MembershipCard {...props} side="back" />)
    for (const value of ['Example address, Sindh', 'Example Contact', 'Brother', '03011234567', '44404-1234567-8', '+923001234567', '3 Feb 1990', 'AB+', 'Graduate']) {
      expect(html).toContain(value)
    }
    expect(html).toContain('/jas/signature.png')
  })
  it('shows explicit fallbacks when assets and membership number are unavailable', () => {
    const html = renderToStaticMarkup(<MembershipCard {...props} qrUrl={null} verifyUrl="" side="front" member={{ ...member, member_no: null }} />)
    expect(html).toContain('Photo unavailable')
    expect(html).toContain('QR unavailable')
    expect(html).toContain('Not issued')
    expect(html).toContain('Verification link unavailable')
  })
})
