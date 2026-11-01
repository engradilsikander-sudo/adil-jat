import {
  bloodGroupOptions,
  genderOptions,
  talukasByDistrict,
} from './register/registration-options'
import {
  isPakistaniMobile,
  normalizeMobile,
  todayDate,
} from './shared/formatters'

export const PROFILE_UPDATE_FIELD_KEYS = [
  'full_name',
  'father_name',
  'cnic',
  'mobile',
  'district',
  'taluka',
  'profession',
  'caste_branch',
  'address',
  'date_of_birth',
  'gender',
  'education',
  'blood_group',
  'emergency_contact_name',
  'emergency_contact_relation',
  'emergency_contact_mobile',
  'photo_url',
] as const

export type ProfileUpdateFieldKey = (typeof PROFILE_UPDATE_FIELD_KEYS)[number]
export type ProfileUpdateStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'

export type ProfileUpdateValue = string | null
export type ProfileUpdateChanges = Partial<
  Record<ProfileUpdateFieldKey, ProfileUpdateValue>
>

export type ProfileUpdateMember = {
  id: string
  user_id: string
  member_no: string | null
  status: 'pending' | 'approved' | 'rejected'
  full_name: string
  father_name: string
  cnic: string
  mobile: string
  district: string
  taluka: string | null
  profession: string | null
  caste_branch: string | null
  address: string | null
  date_of_birth: string | null
  gender: string | null
  education: string | null
  blood_group: string | null
  emergency_contact_name: string | null
  emergency_contact_relation: string | null
  emergency_contact_mobile: string | null
  photo_url: string | null
  updated_at: string
}

export type ProfileUpdateDraft = {
  full_name: string
  father_name: string
  cnic: string
  mobile: string
  district: string
  taluka: string
  profession: string
  caste_branch: string
  address: string
  date_of_birth: string
  gender: string
  education: string
  blood_group: string
  emergency_contact_name: string
  emergency_contact_relation: string
  emergency_contact_mobile: string
}

export type ProfileUpdateRequest = {
  id: string
  member_id: string
  user_id: string
  member_name: string
  member_no: string | null
  status: ProfileUpdateStatus
  requested_changes: ProfileUpdateChanges
  current_snapshot: ProfileUpdateChanges
  member_note: string | null
  admin_note: string | null
  source_district: string
  source_taluka: string | null
  target_district: string
  target_taluka: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type ProfileUpdateFieldErrors = Partial<
  Record<keyof ProfileUpdateDraft | 'photo', string>
>

export const PROFILE_UPDATE_MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024
export const PROFILE_UPDATE_ALLOWED_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

const requiredTextFields: Array<keyof ProfileUpdateDraft> = [
  'full_name',
  'father_name',
  'cnic',
  'mobile',
  'district',
  'taluka',
  'profession',
  'caste_branch',
  'address',
  'date_of_birth',
  'gender',
  'education',
  'blood_group',
  'emergency_contact_name',
  'emergency_contact_relation',
  'emergency_contact_mobile',
]

export const profileUpdateFieldLabels: Record<ProfileUpdateFieldKey, string> = {
  full_name: 'Full Name',
  father_name: 'Father Name',
  cnic: 'CNIC',
  mobile: 'Mobile',
  district: 'District',
  taluka: 'Taluka',
  profession: 'Profession',
  caste_branch: 'Caste / Branch',
  address: 'Residential Address',
  date_of_birth: 'Date of Birth',
  gender: 'Gender',
  education: 'Education',
  blood_group: 'Blood Group',
  emergency_contact_name: 'Emergency Contact Name',
  emergency_contact_relation: 'Emergency Contact Relation',
  emergency_contact_mobile: 'Emergency Contact Mobile',
  photo_url: 'Member Photo',
}

export function memberToProfileUpdateDraft(
  member: ProfileUpdateMember,
): ProfileUpdateDraft {
  return {
    full_name: member.full_name,
    father_name: member.father_name,
    cnic: member.cnic,
    mobile: member.mobile,
    district: member.district,
    taluka: member.taluka ?? '',
    profession: member.profession ?? '',
    caste_branch: member.caste_branch ?? '',
    address: member.address ?? '',
    date_of_birth: member.date_of_birth ?? '',
    gender: member.gender ?? '',
    education: member.education ?? '',
    blood_group: member.blood_group ?? '',
    emergency_contact_name: member.emergency_contact_name ?? '',
    emergency_contact_relation: member.emergency_contact_relation ?? '',
    emergency_contact_mobile: member.emergency_contact_mobile ?? '',
  }
}

export function normalizeProfileUpdateDraft(
  draft: ProfileUpdateDraft,
): ProfileUpdateDraft {
  return {
    full_name: draft.full_name.trim(),
    father_name: draft.father_name.trim(),
    cnic: draft.cnic.trim(),
    mobile: normalizeMobile(draft.mobile),
    district: draft.district.trim(),
    taluka: draft.taluka.trim(),
    profession: draft.profession.trim(),
    caste_branch: draft.caste_branch.trim(),
    address: draft.address.trim(),
    date_of_birth: draft.date_of_birth.trim(),
    gender: draft.gender.trim(),
    education: draft.education.trim(),
    blood_group: draft.blood_group.trim(),
    emergency_contact_name: draft.emergency_contact_name.trim(),
    emergency_contact_relation: draft.emergency_contact_relation.trim(),
    emergency_contact_mobile: normalizeMobile(
      draft.emergency_contact_mobile,
    ),
  }
}

export function isValidProfileUpdateDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function validateProfileUpdateDraft(
  draft: ProfileUpdateDraft,
  photo?: File | null,
) {
  const normalized = normalizeProfileUpdateDraft(draft)
  const errors: ProfileUpdateFieldErrors = {}

  for (const field of requiredTextFields) {
    if (!normalized[field]) {
      errors[field] = 'This field is required.'
    }
  }

  if (
    normalized.full_name &&
    (normalized.full_name.length < 3 || normalized.full_name.length > 120)
  ) {
    errors.full_name = 'Full name must be between 3 and 120 characters.'
  }

  if (
    normalized.father_name &&
    (normalized.father_name.length < 3 ||
      normalized.father_name.length > 120)
  ) {
    errors.father_name = 'Father name must be between 3 and 120 characters.'
  }

  if (
    normalized.cnic &&
    !/^[0-9]{5}-[0-9]{7}-[0-9]$/.test(normalized.cnic)
  ) {
    errors.cnic = 'Enter CNIC in 12345-1234567-1 format.'
  }

  if (normalized.mobile && !isPakistaniMobile(normalized.mobile)) {
    errors.mobile = 'Enter a valid Pakistani mobile number.'
  }

  if (
    normalized.emergency_contact_mobile &&
    !isPakistaniMobile(normalized.emergency_contact_mobile)
  ) {
    errors.emergency_contact_mobile =
      'Enter a valid emergency contact mobile number.'
  }

  if (normalized.address && normalized.address.length < 10) {
    errors.address = 'Enter a complete residential address.'
  }

  if (normalized.address.length > 500) {
    errors.address = 'Address must be 500 characters or fewer.'
  }

  if (
    normalized.date_of_birth &&
    (!isValidProfileUpdateDate(normalized.date_of_birth) ||
      normalized.date_of_birth > todayDate())
  ) {
    errors.date_of_birth = 'Enter a valid date of birth.'
  }

  if (
    normalized.gender &&
    !genderOptions.includes(normalized.gender)
  ) {
    errors.gender = 'Select a valid gender option.'
  }

  if (
    normalized.blood_group &&
    !bloodGroupOptions.includes(normalized.blood_group)
  ) {
    errors.blood_group = 'Select a valid blood group.'
  }

  const validTalukas = talukasByDistrict[normalized.district] ?? []
  if (
    normalized.district &&
    normalized.taluka &&
    !validTalukas.includes(normalized.taluka)
  ) {
    errors.taluka = 'Select a taluka from the selected district.'
  }

  if (photo) {
    if (
      !PROFILE_UPDATE_ALLOWED_PHOTO_TYPES.includes(
        photo.type as (typeof PROFILE_UPDATE_ALLOWED_PHOTO_TYPES)[number],
      )
    ) {
      errors.photo = 'Photo must be JPG, PNG, or WebP.'
    } else if (photo.size > PROFILE_UPDATE_MAX_PHOTO_SIZE_BYTES) {
      errors.photo = 'Photo must be 2 MB or smaller.'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized,
  }
}

export function buildProfileUpdateChanges(
  member: ProfileUpdateMember,
  draft: ProfileUpdateDraft,
): ProfileUpdateChanges {
  const normalized = normalizeProfileUpdateDraft(draft)
  const current = memberToProfileUpdateDraft(member)
  const changes: ProfileUpdateChanges = {}

  const fields = Object.keys(normalized) as Array<keyof ProfileUpdateDraft>

  for (const field of fields) {
    const nextValue = normalized[field]
    const currentValue = normalizeProfileUpdateDraft(current)[field]

    if (nextValue !== currentValue) {
      changes[field] = nextValue || null
    }
  }

  return changes
}

export function parseProfileUpdateChanges(
  value: unknown,
): ProfileUpdateChanges {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const source = value as Record<string, unknown>
  const parsed: ProfileUpdateChanges = {}

  for (const field of PROFILE_UPDATE_FIELD_KEYS) {
    const item = source[field]
    if (typeof item === 'string' || item === null) {
      parsed[field] = item
    }
  }

  return parsed
}

export function getProfileUpdateChangedFields(
  request: Pick<
    ProfileUpdateRequest,
    'requested_changes' | 'current_snapshot'
  >,
) {
  const changes = parseProfileUpdateChanges(request.requested_changes)
  const snapshot = parseProfileUpdateChanges(request.current_snapshot)

  return PROFILE_UPDATE_FIELD_KEYS.filter((field) => field in changes).map(
    (field) => ({
      field,
      label: profileUpdateFieldLabels[field],
      before: snapshot[field] ?? null,
      after: changes[field] ?? null,
    }),
  )
}

export function getProfileUpdateStatusLabel(status: ProfileUpdateStatus) {
  switch (status) {
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Pending Review'
  }
}

export function getProfileUpdateStatusClass(status: ProfileUpdateStatus) {
  switch (status) {
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    case 'rejected':
      return 'border-red-200 bg-red-50 text-red-800'
    case 'cancelled':
      return 'border-slate-200 bg-slate-50 text-slate-700'
    default:
      return 'border-amber-200 bg-amber-50 text-amber-900'
  }
}

export function formatProfileUpdateValue(
  field: ProfileUpdateFieldKey,
  value: ProfileUpdateValue | undefined,
  options?: { revealSensitive?: boolean },
) {
  if (!value) return 'Not provided'

  if (!options?.revealSensitive && field === 'cnic') {
    return `${value.slice(0, 6)}*****${value.slice(-2)}`
  }

  if (
    !options?.revealSensitive &&
    (field === 'mobile' || field === 'emergency_contact_mobile')
  ) {
    return `${value.slice(0, 4)}*****${value.slice(-2)}`
  }

  if (field === 'photo_url') return 'New photo uploaded'

  return value
}

export function getProfileUpdatePhotoExtension(file: File) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}
