# Patch — i18n Split Phase 1

Branding remains: **JAS — Jatt Alliance Sindh**.

## Goal

Split the large `src/lib/i18n.tsx` file into smaller focused language and provider files without changing public behavior.

## Changed files

- `src/lib/i18n.tsx`
- `src/lib/i18n/index.tsx`
- `src/lib/i18n/types.ts`
- `src/lib/i18n/languages.ts`
- `src/lib/i18n/translations.ts`
- `src/lib/i18n/en.ts`
- `src/lib/i18n/ur.ts`
- `src/lib/i18n/sd.ts`

## Notes

- Existing imports like `../lib/i18n` continue working through a compatibility re-export.
- English, Urdu, and Sindhi dictionaries are now isolated in separate files.
- `TranslationKey` is still derived from the English dictionary.
- Urdu and Sindhi dictionaries are type-checked against the English keys.

## Test checklist

1. Run `npm run check`.
2. Run `npm run build`.
3. Open the app and switch English/Urdu/Sindhi from the header.
4. Confirm login/signup/register/dashboard labels still translate.
5. Confirm app layout remains stable LTR while selected text language changes.
