# Multilingual Program Tracking Phase 7 Prop Fix

This patch fixes two remaining TypeScript scope errors.

## Fixed

- `viewDetailsLabel={viewDetailsLabel}` changed to `viewDetailsLabel={copy.common.viewDetails}`
- `noDocumentsLabel={noDocumentsLabel}` changed to `noDocumentsLabel={copy.common.noDocuments}`

## Updated files

- `src/routes/programs/education/my-applications.tsx`
- `src/routes/programs/health/$id.tsx`
