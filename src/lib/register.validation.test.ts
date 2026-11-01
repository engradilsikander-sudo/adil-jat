import { describe, expect, it } from 'vitest'
import type { TranslationKey } from './i18n'
import {
  getRegisterDescriptionIds,
  initialRegisterForm,
  memberToRegisterForm,
  registerDraftKey,
  validateRegisterForm,
  type ExistingMember,
  type RegisterFormState,
} from './register.validation'

const t = (key: TranslationKey) => key

function validForm(): RegisterFormState {
  return {
    ...initialRegisterForm,
    fullName: 'Noman Khan',
    fatherName: 'Abdul Razzaque',
    cnic: '44404-6886551-3',
    mobile: '03001234567',
    district: 'Umerkot',
    taluka: 'Kunri',
    profession: 'Business',
    casteBranch: 'Jatt',
    address: 'Nabisar Road, Kunri',
    dateOfBirth: '1990-01-01',
    gender: 'Male',
    education: 'MBA',
    bloodGroup: 'B+',
    emergencyContactName: 'Muhammad Ali',
    emergencyContactRelation: 'Brother',
    emergencyContactMobile: '+923111234567',
    declarationAccepted: true,
  }
}

function validate(form: RegisterFormState, options?: { photo?: File | null }) {
  return validateRegisterForm({
    form,
    photo:
      options && Object.prototype.hasOwnProperty.call(options, 'photo')
        ? options.photo ?? null
        : new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }),
    existingMember: null,
    t,
  })
}

describe('register validation', () => {
  it('accepts a complete free membership form with no payment record or receipt', () => {
    expect(validate(validForm())).toEqual({})
  })

  it('reports all required identity and location fields', () => {
    const errors = validate({ ...initialRegisterForm })

    expect(errors).toMatchObject({
      fullName: 'register.error.fullNameRequired',
      fatherName: 'register.error.fatherRequired',
      cnic: 'register.error.cnicInvalid',
      mobile: 'register.error.mobileInvalid',
      district: 'register.error.districtRequired',
      taluka: 'register.error.talukaRequired',
      address: 'register.error.addressRequired',
    })
  })

  it('rejects malformed CNIC/mobile and a future date of birth', () => {
    const errors = validate({
      ...validForm(),
      cnic: '4440468865513',
      mobile: '04001234567',
      dateOfBirth: '2999-01-01',
      emergencyContactMobile: '123',
    })

    expect(errors.cnic).toBe('register.error.cnicInvalid')
    expect(errors.mobile).toBe('register.error.mobileInvalid')
    expect(errors.dateOfBirth).toBe('register.error.dobFuture')
    expect(errors.emergencyContactMobile).toBe(
      'register.error.emergencyMobileInvalid',
    )
  })

  it('requires a photo while accepting registration without a receipt', () => {
    const errors = validate(validForm(), { photo: null })
    expect(errors.photo).toBe('register.error.photoRequired')
    expect(errors).toEqual({ photo: 'register.error.photoRequired' })
  })

  it('still requires consent when membership is free', () => {
    expect(validate({ ...validForm(), declarationAccepted: false })).toEqual({
      declarationAccepted: 'register.error.declarationRequired',
    })
  })

  it('maps database member values into the editable form shape', () => {
    const member: ExistingMember = {
      id: 'member-1',
      status: 'approved',
      address: null,
      date_of_birth: '1990-01-01',
      gender: 'Male',
      education: null,
      blood_group: 'B+',
      emergency_contact_name: null,
      emergency_contact_relation: null,
      emergency_contact_mobile: null,
      declaration_accepted: true,
      full_name: 'Noman Khan',
      father_name: 'Abdul Razzaque',
      cnic: '44404-6886551-3',
      mobile: '03001234567',
      district: 'Umerkot',
      taluka: null,
      profession: 'Business',
      caste_branch: null,
      photo_url: 'member/photo.jpg',
    }

    expect(memberToRegisterForm(member)).toMatchObject({
      fullName: 'Noman Khan',
      taluka: '',
      address: '',
      education: '',
      profession: 'Business',
      declarationAccepted: true,
    })
  })

  it('builds versioned draft keys and accessible description IDs', () => {
    expect(registerDraftKey('user-1')).toBe('jas-register-draft:1:user-1')
    expect(getRegisterDescriptionIds('mobile', { mobile: 'Invalid' }, true)).toBe(
      'mobile-hint mobile-error',
    )
    expect(getRegisterDescriptionIds('mobile', {}, false)).toBeUndefined()
  })
})
