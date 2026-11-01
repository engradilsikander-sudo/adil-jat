# Multilingual Status Helpers + Program Polish Phase 8

This phase localizes program status/helper labels that were still coming from English-only helper functions.

## Updated helper files

- `src/lib/program-status-i18n.ts`
- `src/lib/programs/education.ts`
- `src/lib/programs/health.ts`
- `src/lib/programs/welfare.ts`
- `src/lib/programs/employment.ts`

## What changed

Added language-aware labels for:

### Education

- Application status labels
- Document labels
- Document verification status labels

### Health

- Application status labels
- Document labels
- Document verification status labels
- Payment status labels
- Committee decision labels
- Case priority labels

### Welfare

- Application status labels
- Document labels
- Document verification status labels
- Payment/fund status labels
- Committee decision labels
- Case priority labels

### Employment

- Application/profile status labels
- Document labels
- Document verification status labels
- Employment type labels
- Current employment status labels
- Training interest labels
- Shortlist status labels

## How it works

The helper reads the selected app language from `localStorage` key:

```ts
jas_language
```

If no language is selected or the app is rendering server-side, English is used as the fallback.

## Notes

This patch does not change database schema or Supabase policies.

This patch keeps existing helper function names the same, so existing pages continue using:

```ts
getEducationStatusLabel(...)
getHealthPaymentStatusLabel(...)
getWelfareDocumentStatusLabel(...)
getEmploymentTypeLabel(...)
```

but now labels become language-aware.
