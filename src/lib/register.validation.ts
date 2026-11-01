import type { TranslationKey } from './i18n'
import {
  isPakistaniMobile,
  normalizeMobile,
  todayDate,
} from './shared/formatters'

export const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024
export const ALLOWED_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const REGISTER_DRAFT_VERSION = 1

export {
  bloodGroupOptions,
  genderOptions,
  sindhDistricts,
  talukasByDistrict,
} from './register/registration-options'

export type MemberStatus = 'pending' | 'approved' | 'rejected'

export type ExistingMember = {
  id: string
  status: MemberStatus
  address: string | null
  date_of_birth: string | null
  gender: string | null
  education: string | null
  blood_group: string | null
  emergency_contact_name: string | null
  emergency_contact_relation: string | null
  emergency_contact_mobile: string | null
  declaration_accepted: boolean
  full_name: string
  father_name: string
  cnic: string
  mobile: string
  district: string
  taluka: string | null
  profession: string | null
  caste_branch: string | null
  photo_url: string
}

export type RegisterFormState = {
  fullName: string
  fatherName: string
  cnic: string
  mobile: string
  district: string
  taluka: string
  profession: string
  casteBranch: string
  address: string
  dateOfBirth: string
  gender: string
  education: string
  bloodGroup: string
  emergencyContactName: string
  emergencyContactRelation: string
  emergencyContactMobile: string
  declarationAccepted: boolean
}

export type FormField = keyof RegisterFormState | 'photo'

export type FieldErrors = Partial<Record<FormField, string>>

export const initialRegisterForm: RegisterFormState = {
  fullName: '',
  fatherName: '',
  cnic: '',
  mobile: '',
  district: '',
  taluka: '',
  profession: '',
  casteBranch: '',
  address: '',
  dateOfBirth: '',
  gender: '',
  education: '',
  bloodGroup: '',
  emergencyContactName: '',
  emergencyContactRelation: '',
  emergencyContactMobile: '',
  declarationAccepted: false,
}

export const registerFormSteps: Array<{
  titleKey: TranslationKey
  shortTitleKey: TranslationKey
  descriptionKey: TranslationKey
  fields: FormField[]
}> = [
  {
    titleKey: 'register.step.identity.title',
    shortTitleKey: 'register.step.identity.short',
    descriptionKey: 'register.step.identity.desc',
    fields: ['fullName', 'fatherName', 'cnic', 'mobile'],
  },
  {
    titleKey: 'register.step.location.title',
    shortTitleKey: 'register.step.location.short',
    descriptionKey: 'register.step.location.desc',
    fields: ['district', 'taluka', 'address'],
  },
  {
    titleKey: 'register.step.profile.title',
    shortTitleKey: 'register.step.profile.short',
    descriptionKey: 'register.step.profile.desc',
    fields: ['profession', 'casteBranch', 'dateOfBirth', 'gender', 'education', 'bloodGroup'],
  },
  {
    titleKey: 'register.step.emergency.title',
    shortTitleKey: 'register.step.emergency.short',
    descriptionKey: 'register.step.emergency.desc',
    fields: ['emergencyContactName', 'emergencyContactRelation', 'emergencyContactMobile'],
  },
  {
    titleKey: 'register.step.submit.title',
    shortTitleKey: 'register.step.submit.short',
    descriptionKey: 'register.step.submit.desc',
    fields: ['photo', 'declarationAccepted'],
  },
]

export function memberToRegisterForm(data: ExistingMember): RegisterFormState {
  return {
    fullName: data.full_name,
    fatherName: data.father_name,
    cnic: data.cnic,
    mobile: data.mobile,
    district: data.district,
    taluka: data.taluka ?? '',
    profession: data.profession ?? '',
    casteBranch: data.caste_branch ?? '',
    address: data.address ?? '',
    dateOfBirth: data.date_of_birth ?? '',
    gender: data.gender ?? '',
    education: data.education ?? '',
    bloodGroup: data.blood_group ?? '',
    emergencyContactName: data.emergency_contact_name ?? '',
    emergencyContactRelation: data.emergency_contact_relation ?? '',
    emergencyContactMobile: data.emergency_contact_mobile ?? '',
    declarationAccepted: data.declaration_accepted,
  }
}

export function registerDraftKey(userId: string) {
  return `jas-register-draft:${REGISTER_DRAFT_VERSION}:${userId}`
}

export function readRegisterDraft(userId: string) {
  try {
    const raw = localStorage.getItem(registerDraftKey(userId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as {
      version?: number
      savedAt?: string
      form?: Partial<RegisterFormState>
    }

    const savedTime = Date.parse(parsed.savedAt ?? '')
    if (parsed.version !== REGISTER_DRAFT_VERSION || !parsed.form || typeof parsed.form !== 'object' || Array.isArray(parsed.form) ||
        !Number.isFinite(savedTime) || savedTime > Date.now() ||
        Date.now() - savedTime >= 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(registerDraftKey(userId))
      return null
    }
    const safeForm = { ...initialRegisterForm }
    for (const key of Object.keys(initialRegisterForm) as Array<keyof RegisterFormState>) {
      const value = parsed.form[key]
      if (key === 'declarationAccepted') safeForm[key] = false
      else if (typeof value === 'string') safeForm[key] = value
    }

    return {
      savedAt: parsed.savedAt ?? '',
      form: safeForm,
    }
  } catch {
    return null
  }
}

export function focusFirstInvalidRegisterField() {
  window.setTimeout(() => {
    const firstInvalid = document.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    )

    firstInvalid?.focus()
  }, 50)
}

export function getRegisterDescriptionIds(
  field: FormField,
  fieldErrors: FieldErrors,
  hasHint = false,
) {
  const ids: string[] = []

  if (hasHint) ids.push(`${field}-hint`)
  if (fieldErrors[field]) ids.push(`${field}-error`)

  return ids.length ? ids.join(' ') : undefined
}

export function validateRegisterForm({
  form,
  photo,
  existingMember,
  t,
}: {
  form: RegisterFormState
  photo: File | null
  existingMember: ExistingMember | null
  t: (key: TranslationKey) => string
}) {
  const errors: FieldErrors = {}
  const normalizedMobile = normalizeMobile(form.mobile)
  const normalizedEmergencyMobile = normalizeMobile(form.emergencyContactMobile)

  if (!form.fullName.trim()) {
    errors.fullName = t('register.error.fullNameRequired')
  } else if (form.fullName.trim().length < 3) {
    errors.fullName = t('register.error.fullNameShort')
  }

  if (!form.fatherName.trim()) {
    errors.fatherName = t('register.error.fatherRequired')
  } else if (form.fatherName.trim().length < 3) {
    errors.fatherName = t('register.error.fullNameShort')
  }

  if (!/^[0-9]{5}-[0-9]{7}-[0-9]$/.test(form.cnic.trim())) {
    errors.cnic = t('register.error.cnicInvalid')
  }

  if (!isPakistaniMobile(normalizedMobile)) {
    errors.mobile = t('register.error.mobileInvalid')
  }

  if (!form.district) {
    errors.district = t('register.error.districtRequired')
  }

  if (!form.taluka) {
    errors.taluka = t('register.error.talukaRequired')
  }

  if (!form.address.trim()) {
    errors.address = t('register.error.addressRequired')
  } else if (form.address.trim().length < 10) {
    errors.address = t('register.error.addressRequired')
  }

  const requiredMessage = 'This field is required.'

  if (!form.profession.trim()) {
    errors.profession = requiredMessage
  }

  if (!form.casteBranch.trim()) {
    errors.casteBranch = requiredMessage
  }

  if (!form.dateOfBirth) {
    errors.dateOfBirth = requiredMessage
  } else if (form.dateOfBirth > todayDate()) {
    errors.dateOfBirth = t('register.error.dobFuture')
  }

  if (!form.gender) {
    errors.gender = requiredMessage
  }

  if (!form.education.trim()) {
    errors.education = requiredMessage
  }

  if (!form.bloodGroup) {
    errors.bloodGroup = requiredMessage
  }

  if (!form.emergencyContactName.trim()) {
    errors.emergencyContactName = requiredMessage
  }

  if (!form.emergencyContactRelation.trim()) {
    errors.emergencyContactRelation = requiredMessage
  }

  if (!normalizedEmergencyMobile) {
    errors.emergencyContactMobile = requiredMessage
  } else if (!isPakistaniMobile(normalizedEmergencyMobile)) {
    errors.emergencyContactMobile = t('register.error.emergencyMobileInvalid')
  }

  if (!photo && !existingMember?.photo_url) {
    errors.photo = t('register.error.photoRequired')
  }

  if (!form.declarationAccepted) {
    errors.declarationAccepted = t('register.error.declarationRequired')
  }

  return errors
}
