# Multilingual Auth & Register Phase 3

This phase expands the JAS multilingual foundation to the main member onboarding flow.

## Scope

Updated pages:

- `/login`
- `/signup`
- `/register`

Supported languages:

- English
- Urdu
- Sindhi

## What changed

- Login hero, form labels, buttons, OTP steps and major validation/auth messages now use the i18n system.
- Signup hero, fee notice, form labels, buttons, OTP steps and major validation/auth messages now use the i18n system.
- Membership registration steps, progress text, field labels, hints, payment instructions, receipt upload text, declaration text, banners and submit actions now use i18n.
- Urdu/Sindhi selected language is applied via the existing `useI18n()` context.
- Layout remains stable while text direction is applied to the onboarding pages.
- Membership payment details and QR flow remain intact.

## Notes

- Database values such as district, taluka, member ID, CNIC, mobile numbers and account numbers remain unchanged.
- Some user-entered values and backend error messages may still appear in their original language.
- Admin pages and program pages should be translated in later phases.

## Recommended next phases

1. Membership card and verification pages multilingual support.
2. Admin panel multilingual support.
3. Programs pages multilingual support.
4. CMS/database content multilingual support.
