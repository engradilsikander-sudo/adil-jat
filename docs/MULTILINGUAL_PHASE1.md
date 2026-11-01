# Multilingual Phase 1

This phase adds the language foundation and switcher UI for English, Urdu and Sindhi.

## Added

- `src/lib/i18n.tsx`
- `I18nProvider`
- `useI18n()` hook
- `LanguageSwitcher` component
- Browser `localStorage` persistence using `jas_language`
- Automatic `<html lang>` and `<html dir>` update
- Header/nav translations for English, Urdu and Sindhi
- Organization and program menu translations
- Not found page translations

## Scope

This is a safe foundation patch. It does not translate every route/page yet. Large pages such as register, dashboard, admin, finance, program applications and CMS pages should be translated in follow-up phases using the same `useI18n()` hook and translation key structure.

## Recommended follow-up phases

1. Register/Login/Signup translation
2. Dashboard and card pages translation
3. Admin panel translation
4. Program modules translation
5. CMS/public content translation support in database
