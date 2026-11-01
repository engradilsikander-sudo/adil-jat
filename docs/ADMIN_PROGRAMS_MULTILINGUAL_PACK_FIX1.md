# Admin Programs Multilingual Pack — Type Fix 1

This patch fixes TypeScript errors reported after applying Patch A.

## Fixed

1. Missing `useAdminProgramsCopy` import in:
   - `src/routes/admin/programs/education/$id.tsx`

2. `copy` used outside scope in child components:
   - `DocumentReviewCard` in education admin detail
   - `ReviewerCard` in health admin detail

3. Program-specific translation keys failed TypeScript because the helper returned a union type:
   - `skillFilter`
   - `phone`
   - `education`
   - `candidateInfo`
   - `skills`
   - `experience`
   - `preferredLocation`
   - `expectedSalary`
   - `currentStatus`
   - `training`
   - `shortlist`
   - `employer`
   - `jobTitle`
   - `patientDetails`
   - `hospital`
   - `applicantName`
   - `caseType`
   - `caseSummary`
   - `reason`
   - `reviewApproval`

## Fix approach

`src/lib/admin-programs-i18n.ts` now uses a string label map type for program-specific labels.
This preserves all labels and avoids narrow union-key TypeScript errors.
