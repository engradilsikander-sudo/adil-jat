# Multilingual Final QA Checklist

Use this checklist after applying the final multilingual polish pack.

## Build checks

```bash
npm run check
npm run build
```

## Public pages

Test in English, Urdu and Sindhi:

- `/`
- `/about`
- `/vision-mission`
- `/manifesto`
- `/constitution`
- `/cwc`
- `/committees`
- `/news`
- `/events`
- `/gallery`
- `/contact`

## Member pages

Test in English, Urdu and Sindhi:

- `/signup`
- `/login`
- `/register`
- `/dashboard`
- `/card`
- `/designation-card`

Official card design/content should remain stable and not be auto-translated.

## Program user pages

Test in English, Urdu and Sindhi:

- `/programs/education`
- `/programs/education/apply`
- `/programs/education/my-applications`
- `/programs/health`
- `/programs/health/apply`
- `/programs/health/my-applications`
- `/programs/welfare`
- `/programs/welfare/apply`
- `/programs/welfare/my-applications`
- `/programs/employment`
- `/programs/employment/apply`
- `/programs/employment/my-applications`

## Admin pages

Test in English, Urdu and Sindhi:

- `/admin`
- `/admin/members/$id`
- `/admin/programs/education`
- `/admin/programs/health`
- `/admin/programs/welfare`
- `/admin/programs/employment`
- `/admin/finance`
- `/admin/reports`
- `/admin/roles`
- `/admin/area-permissions`
- `/admin/audit-logs`
- `/admin/committees`
- `/admin/designations`
- `/admin/cms`

## RTL/mobile checks

On mobile width:

- Header menu should not overflow.
- Language switcher should remain usable.
- Urdu/Sindhi text should align right where intended.
- Numeric/CNIC/mobile/date fields should remain readable.
- Cards and tables should not create unwanted horizontal page overflow.
- Official membership/designation cards should stay LTR and visually stable.

## Deployment checks

After commit and push:

- Verify Vercel build.
- Open production home page.
- Switch English / Urdu / Sindhi.
- Check `/admin` and one program admin page.
- Check `/committees` for Central / Divisional / District / Taluka wording.
