import { describe, expect, it } from 'vitest'
import {
  buildProfileUpdateChanges,
  formatProfileUpdateValue,
  getProfileUpdateChangedFields,
  memberToProfileUpdateDraft,
  parseProfileUpdateChanges,
  validateProfileUpdateDraft,
  type ProfileUpdateMember,
} from './profile-update'

const member: ProfileUpdateMember = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: '22222222-2222-4222-8222-222222222222',
  member_no: 'JAS-2026-0001',
  status: 'approved',
  full_name: 'Noman Khan',
  father_name: 'Abdul Razzaque',
  cnic: '44104-1234567-1',
  mobile: '03001234567',
  district: 'Umerkot',
  taluka: 'Kunri',
  profession: 'Business',
  caste_branch: 'Awan',
  address: 'Main Road, Kunri, Umerkot',
  date_of_birth: '1990-01-01',
  gender: 'Male',
  education: 'MBA',
  blood_group: 'B+',
  emergency_contact_name: 'Test Contact',
  emergency_contact_relation: 'Brother',
  emergency_contact_mobile: '03111234567',
  photo_url: 'user/photo.jpg',
  updated_at: '2026-07-10T10:00:00.000Z',
}

describe('profile update helpers', () => {
  it('maps an approved member into an editable draft', () => {
    const draft = memberToProfileUpdateDraft(member)
    expect(draft.full_name).toBe('Noman Khan')
    expect(draft.taluka).toBe('Kunri')
  })

  it('returns changed fields only and normalizes mobile values', () => {
    const draft = memberToProfileUpdateDraft(member)
    draft.profession = 'School Administrator'
    draft.mobile = '+92 300 1234567'

    expect(buildProfileUpdateChanges(member, draft)).toEqual({
      profession: 'School Administrator',
      mobile: '+923001234567',
    })
  })

  it('returns no changes when values are unchanged', () => {
    expect(
      buildProfileUpdateChanges(member, memberToProfileUpdateDraft(member)),
    ).toEqual({})
  })

  it('validates CNIC, mobile, district/taluka, and required fields', () => {
    const draft = memberToProfileUpdateDraft(member)
    draft.cnic = '123'
    draft.mobile = '123'
    draft.taluka = 'Mithi'
    draft.address = ''

    const result = validateProfileUpdateDraft(draft)
    expect(result.valid).toBe(false)
    expect(result.errors.cnic).toBeTruthy()
    expect(result.errors.mobile).toBeTruthy()
    expect(result.errors.taluka).toBeTruthy()
    expect(result.errors.address).toBeTruthy()
  })

  it('rejects impossible calendar dates', () => {
    const result = validateProfileUpdateDraft({
      ...memberToProfileUpdateDraft(member),
      date_of_birth: '2026-02-30',
    })

    expect(result.valid).toBe(false)
    expect(result.errors.date_of_birth).toBe('Enter a valid date of birth.')
  })

  it('parses only supported string/null fields from database JSON', () => {
    expect(
      parseProfileUpdateChanges({
        full_name: 'Updated Name',
        mobile: null,
        member_no: 'forbidden',
        profession: 55,
      }),
    ).toEqual({ full_name: 'Updated Name', mobile: null })
  })

  it('builds before and after rows in stable field order', () => {
    const rows = getProfileUpdateChangedFields({
      requested_changes: { mobile: '03009999999', district: 'Tharparkar' },
      current_snapshot: { mobile: '03001234567', district: 'Umerkot' },
    })

    expect(rows.map((row) => row.field)).toEqual(['mobile', 'district'])
    expect(rows[0]).toMatchObject({
      before: '03001234567',
      after: '03009999999',
    })
  })

  it('masks sensitive values unless explicitly revealed', () => {
    expect(formatProfileUpdateValue('cnic', '44104-1234567-1')).toContain(
      '*****',
    )
    expect(
      formatProfileUpdateValue('cnic', '44104-1234567-1', {
        revealSensitive: true,
      }),
    ).toBe('44104-1234567-1')
  })
})
