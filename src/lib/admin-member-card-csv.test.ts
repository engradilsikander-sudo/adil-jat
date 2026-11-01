import { describe, expect, it } from 'vitest'
import {
  buildFullMemberCardCsv,
  MEMBER_CARD_CSV_HEADERS,
  secureCsvCell,
  type MemberCardCsvSource,
} from './admin-member-card-csv'

const member: MemberCardCsvSource = {
  id: 'member-1',
  member_no: 'JAS-2026-0224',
  full_name: 'Shafiq Jatt',
  father_name: 'Muhammad Iqbal',
  cnic: '44404-6886551-3',
  mobile: '03323387815',
  district: 'Umerkot',
  taluka: 'Kunri',
  profession: 'Commission Shop',
  caste_branch: 'Jatt',
  photo_url: 'member-1/photo.jpg',
  status: 'approved',
  approved_at: '2026-07-07T10:00:00.000Z',
  address: 'Nabisar Road',
  date_of_birth: '1983-01-04',
  gender: 'Male',
  education: 'Intermediate',
  blood_group: 'B+',
  emergency_contact_name: 'Mubshar Lilla',
  emergency_contact_relation: 'Friend',
  emergency_contact_mobile: '03453771431',
  declaration_accepted: true,
  created_at: '2026-07-04T10:00:00.000Z',
}

describe('buildFullMemberCardCsv', () => {
  it('exports every card data group without masking personal values', () => {
    const csv = buildFullMemberCardCsv({
      members: [member],
      publicVerifyOrigin: 'https://jasofficial.org/',
      designationsByMemberId: {
        'member-1': {
          title: 'Vice President Nabisar Unit',
          committeeName: 'Nabisar Unit',
          committeeType: 'taluka',
          committeeLevelLabel: 'Unit',
          committeeLocationLabel: 'Nabisar, Umerkot',
          tenureStart: '2026-07-01',
          tenureEnd: '2027-06-30',
          validityStart: '2026-07-01',
          expiresOn: '2027-06-30',
          validityLabel: '1 Jul 2026 - 30 Jun 2027',
          expiryLabel: 'Expires 30 Jun 2027',
        },
      },
    })

    expect(csv).toContain('"44404-6886551-3"')
    expect(csv).toContain('"03323387815"')
    expect(csv).toContain('"03453771431"')
    expect(csv).toContain('"Vice President Nabisar Unit"')
    expect(csv).toContain('"Nabisar Road"')
    expect(csv).toContain('"https://jasofficial.org/verify/JAS-2026-0224"')
    expect(csv).toContain('"JAS-2026-0224 / v1"')
    expect(csv).not.toContain('*')
    expect(csv).not.toContain('Masked')
  })

  it('keeps the exported columns aligned with the declared headers', () => {
    const csv = buildFullMemberCardCsv({
      members: [member],
      publicVerifyOrigin: 'https://jasofficial.org',
      designationsByMemberId: {},
    })

    const [headerRow, memberRow] = csv.split('\n')
    expect(headerRow.match(/","/g)?.length).toBe(MEMBER_CARD_CSV_HEADERS.length - 1)
    expect(memberRow.match(/","/g)?.length).toBe(MEMBER_CARD_CSV_HEADERS.length - 1)
  })

  it('neutralizes spreadsheet formulas and preserves quoted multiline values', () => {
    expect(secureCsvCell('=HYPERLINK("https://example.test")')).toBe(
      `"'=HYPERLINK(""https://example.test"")"`,
    )
    expect(secureCsvCell('  +SUM(1,2)')).toBe(`"'  +SUM(1,2)"`)
    expect(secureCsvCell('@malicious')).toBe(`"'@malicious"`)
    expect(secureCsvCell('-10+20')).toBe(`"'-10+20"`)
    expect(secureCsvCell('Nabisar, Road\nKunri')).toBe(
      `"Nabisar, Road Kunri"`,
    )
    expect(secureCsvCell('Muhammad "Ali"')).toBe(
      `"Muhammad ""Ali"""`,
    )
  })

})
