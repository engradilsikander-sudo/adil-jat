# JWAS Branding B1 delivery

## Baseline and scope

Starting branch: `feature/jwas-branding-b1`, already pointing directly to UX.14 commit `49df92d8eb820e4864168c5fb9366313780c867d` when work began. The requested branch therefore did not need recreation. Production main remains `226a67d1479c1d577f61ae4af898b22bfda2ee5a`. Initial working tree contained only the intentional modification to `supabase/config.toml`; no unrelated application work or staged changes.

Previous displayed identity: **Jatt Alliance Sindh (JAS)**. New identity: **Jatt Welfare Alliance Sindh (JWAS)**. The spelling Jatt and tagline **Education · Health · Dignity** are preserved. No commits, pushes, merge to main, deployment or Cloud Supabase changes were made.

## Audit and implementation

- Public header and landing header/footer, registration consent, login/recovery/signup copy, profile/card screens, navigation, fallback About/Vision/Mission/Manifesto/Constitution/contact content, public committees/designation directory and programs now use JWAS identity.
- `src/lib/branding.ts` centralizes the official name, abbreviation, localized names, tagline and SEO/social copy. Header translations, landing identity, card issuer, Finance receipt heading and metadata consume it. Static JSON/HTML and the separate Deno email runtime retain literals tested against this source, avoiding a new build system or cross-runtime dependency.
- Public organization CMS pages normalize old organization wording at display time only. Stored CMS records are unchanged. The office-bearer display normalizer retains its old-name matching rule but emits the new name.
- Sidebar reads **JWAS Admin Panel** and **JWAS Management Console**. Only brand rendering/imports changed in AdminSidebar/AdminShell. UX.14 grouping, accordion state, collapsed icon rail, accessible controls, active-state behavior, modal drawer, layout CSS and `jas_admin_sidebar_collapsed_v1` are preserved.
- Membership and designation card issuer text, fallback badges, terms, QR verification labels, report print titles, Finance receipt headings and displayed CSV designation heading are updated. Historical membership numbers and QR IDs are unchanged. Newly downloaded card filenames use the JWAS brand suffix without altering the member-number prefix.
- Twelve auth HTML templates, notification email identity/default text, notification worker recipient fallback and browser/worker push fallback text are updated. Email template tokens, providers, transport, secrets and legacy header `X-JAS-Notification-ID` are unchanged.
- PWA name is exactly **Jatt Welfare Alliance Sindh**, short_name **JWAS**. Manifest descriptions/shortcuts, install/update/offline text and push fallback messages match. PWA IDs, start URL, scope, cache keys, service-worker routing and asset paths remain unchanged.
- Root title, description, application-name, Apple title and Open Graph copy are updated. Twitter card/title/description and og:site_name now use the same branding. No existing application sitemap, robots file, canonical tag or JSON-LD branding was found; none was invented or redirected. `jwas.app` and DNS are unchanged.
- Urdu: **جٹ ویلفیئر الائنس سندھ**. Sindhi: **جٽ ويلفيئر الائنس سنڌ**. English/Urdu/Sindhi prose uses JWAS while member-number format examples retain JAS identifiers.
- The unused starter Footer component no longer says “Your name here” or links to TanStack social accounts; it now renders organization copyright and the preserved tagline. The actual landing footer also has organization copyright.

## Artwork: unresolved and explicitly preserved

Visual inspection confirms `public/jas/logo.jpeg`, `public/jas/flag.jpeg` and `public/icon-512.png` contain baked-in **JATT ALLIANCE / SINDH**. The app icon/favicon family and Apple touch icon are legacy logo derivatives. These originals and all image bytes are preserved. Updating alt text does **not** update their artwork.

Required asset follow-up: obtain an approved master of the existing official handshake/wreath logo with **JATT WELFARE ALLIANCE SINDH**, plus the matching flag composition. Regenerate favicon.ico, icon-16/32/48/192/512.png and apple-touch-icon.png from that approved master while retaining current paths, sizes and transparency requirements. Verify icon legibility and card print quality. No placeholder, unrelated design or unapproved AI-generated logo was substituted.

Other assets (ajrak ornament, Sindh map, signature, payment QR) are not organization-name text replacements. Payment QR/account imagery is intentionally unchanged. Existing cards/images already issued or downloaded are not rewritten.

## Intentional remaining references and compatibility

- Issued `JAS-YYYY-…` member numbers and `JAS-OB-…` office-bearer IDs, validators, sample ID placeholders and matching regression fixtures remain unchanged.
- Internal JAS_* exports, API/RPC identifiers, headers, schema/table/column names, roles, migration filenames, package/repository names, local/session storage keys, CSS classes/DOM IDs, Storage buckets/paths and `/jas/…` asset URLs remain unchanged.
- Historical release documents, SQL migrations/seeded historical notification text, operational script comments/log labels and historical stored records remain historical. They were not globally renamed. Persisted notification/audit/user-authored content may still carry historical wording; B1 does not rewrite those records.
- Existing `jasofficial.org` URL fallbacks and `support@jasofficial.org` sender/support addresses are retained for compatibility, not renamed to invented addresses. Current configured production origin/domain remains untouched. Operators should verify their existing public-site and sender settings against the intended `jwas.app` deployment before rollout.
- The protected config contains eight old-brand auth email subjects. HTML body updates do not change those subjects. A separately authorized config/hosted-auth update is needed: invitation → “You are invited to Jatt Welfare Alliance Sindh”; recovery → “Reset your JWAS password”; magic link → “Your secure JWAS sign-in link”; email change → “Confirm your new JWAS email address”; reauthentication → “{{ .Token }} is your JWAS verification code”; password/email/phone security notices → the same wording with JWAS replacing JAS. All config bytes remain unchanged in this task.
- Existing BREVO_SENDER_NAME or hosted auth-template overrides may still use the old identity; no cloud settings were read or changed. Approved deployment must synchronize the reviewed local templates and sender display names.

## Validation

Tests are local and do not certify the hosted deployment.

| Command | Result |
|---|---|
| `npm run check` | PASS, TypeScript no errors |
| `npm test -- --maxWorkers=2 --testTimeout=15000` | PASS on unchanged-command rerun: 64 files, 428 tests; 27 opt-in integration tests skipped here and executed separately below |
| `npm run build` | PASS, client/SSR/Nitro production output generated |
| `node scripts/test-r1-local.mjs` | PASS, 10 real local donation integration tests |
| `node scripts/test-r1-local.mjs --finance` | PASS, 17 real local Finance authorization/decision tests |
| `node scripts/test-r1-local.mjs --mobile` | PASS, 16 mobile browser tests |
| Desktop branding/UX.14 browser tests | PASS, 2 desktop tests; final focused mobile branding recheck also PASS (1 test) |
| `npm run email:templates:check` | PASS, 12 templates |
| `npm run push:check` | PASS, 19/19 checks |
| `git diff --check` | PASS; repeated at final verification |

First full unit attempt: 426 passed, 2 timed out at the unchanged 15-second limit (ordinary-Admin sidebar navigation and the 126-member directory test). Both and the entire suite passed on rerun without changing test configuration or those test assertions. Final rerun duration: 183.39 seconds. New tests cover identity/locales, footer, SEO/PWA, all email templates, legacy ID/storage/path compatibility, obsolete-brand absence, card issuer and Admin Panel brand. The original UX.14 grouping/collapse/persistence tests remain and pass.

After the final landing tagline was switched to the shared exact text, TypeScript, the production build, both desktop branding tests and the focused mobile branding test passed again. The desktop test verifies the existing rail interaction by clicking its Programs icon to reopen the group; no sidebar behavior was changed to satisfy the test.

Production build emits existing dependency/bundler warnings (including module-level `use client` directives and ignored manualChunks configuration), not TypeScript/build errors. No dependency or unrelated test configuration was changed.

## Manual visual verification checklist

- [ ] Approved replacement logo/flag/icons supplied and inspected (blocked on approved artwork).
- [x] English branding layout inspected in final mobile landing and desktop admin screenshots; header/tagline/footer text fits. Public identity also passes desktop/mobile browser assertions.
- [ ] Native-language visual sign-off for Urdu/Sindhi remains a rollout check; localized strings and mobile RTL workflows pass automated checks.
- [ ] Membership/designation cards checked at print/export resolution, including long issuer name and unchanged QR/IDs.
- [x] UX.14 accordion, active group, persisted collapsed icon rail and mobile drawer verified by browser tests; expanded desktop sidebar visually inspected.
- [ ] Hosted auth subject lines/sender overrides synchronized through a separately authorized rollout.

## Security and deployment assessment

Only presentation text, identity configuration, display normalization and related tests/documentation changed. No financial calculation, donation intake validation, auth mechanism, role permission, RLS policy, migration, audit record or database identifier was edited. The existing local integration runners create labeled disposable fixtures; no cloud database was touched. UX.14 source behavior/CSS remains intact.

This branch is for review, not automatically deployed or production-certified. Visible artwork and protected/hosted email-subject configuration remain explicit release follow-ups. Keep production main unchanged until the user separately authorizes normal review/merge/deployment.

Final Git verification: branch and HEAD remain at the requested UX.14 baseline, main remains at `226a67d`, the existing stash remains present, and the index is empty. SHA-256 checks confirm the protected config and local environment are unchanged; all 13 tracked image assets match the baseline byte for byte. `git diff --check` passes.

## Modified/new files

- `README.md`
- `docs/JWAS-BRANDING-B1-DELIVERY.md`
- `e2e/branding.spec.ts`
- `e2e/public.spec.ts`
- `public/manifest.json`
- `public/offline.html`
- `public/sw.js`
- `scripts/check-email-templates.mjs`
- `src/components/Footer.tsx`
- `src/components/MembershipCard.test.tsx`
- `src/components/MembershipCard.tsx`
- `src/components/admin/AdminShell.tsx`
- `src/components/admin/AdminSidebar.test.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/member-detail/OfficeBearerIssuePanel.tsx`
- `src/components/cards/OfficeBearerDesignationCard.tsx`
- `src/components/layout/Header.test.tsx`
- `src/components/layout/Header.tsx`
- `src/components/programs/CaseReportPreview.tsx`
- `src/components/pwa/AppUpdateReset.tsx`
- `src/components/register/RegistrationStepFields.tsx`
- `src/config/navigation.tsx`
- `src/lib/admin-dashboard-i18n.ts`
- `src/lib/admin-management-i18n.ts`
- `src/lib/admin-member-card-csv.ts`
- `src/lib/branding.test.tsx`
- `src/lib/branding.ts`
- `src/lib/cms.ts`
- `src/lib/committees-public.ts`
- `src/lib/donations.ts`
- `src/lib/finance.test.ts`
- `src/lib/finance.ts`
- `src/lib/home-i18n.ts`
- `src/lib/i18n/admin-accessibility-copy.ts`
- `src/lib/i18n/en.ts`
- `src/lib/i18n/mobile-ux-copy.ts`
- `src/lib/i18n/sd.ts`
- `src/lib/i18n/ur.ts`
- `src/lib/member-card-config.ts`
- `src/lib/notification-email.test.ts`
- `src/lib/program-apply-i18n.ts`
- `src/lib/programs/case-report.ts`
- `src/lib/programs/health.ts`
- `src/lib/programs/welfare.ts`
- `src/lib/public-page-i18n.ts`
- `src/routes/-cms-public-page.tsx`
- `src/routes/__root.tsx`
- `src/routes/admin.tsx`
- `src/routes/admin/committees/$id.tsx`
- `src/routes/admin/events.tsx`
- `src/routes/admin/members/$id/card.tsx`
- `src/routes/admin/members/$id/designation-card.tsx`
- `src/routes/admin/news.tsx`
- `src/routes/admin/notifications.tsx`
- `src/routes/card.tsx`
- `src/routes/designation-card.tsx`
- `src/routes/designation-holders.tsx`
- `src/routes/donate.tsx`
- `src/routes/donors.tsx`
- `src/routes/index.tsx`
- `src/routes/programs/education.tsx`
- `src/routes/programs/employment.tsx`
- `src/routes/programs/health.tsx`
- `src/routes/programs/welfare.tsx`
- `src/routes/verify/$memberNo.tsx`
- `src/routes/verify/office-bearer/$officeBearerId.tsx`
- `supabase/functions/_shared/notification-email.ts`
- `supabase/functions/send-notification-emails/index.ts`
- `supabase/functions/send-web-push/index.ts`
- `supabase/templates/email_change.html`
- `supabase/templates/email_changed_notification.html`
- `supabase/templates/identity_linked_notification.html`
- `supabase/templates/identity_unlinked_notification.html`
- `supabase/templates/invite.html`
- `supabase/templates/magic_link.html`
- `supabase/templates/mfa_factor_enrolled_notification.html`
- `supabase/templates/mfa_factor_unenrolled_notification.html`
- `supabase/templates/password_changed_notification.html`
- `supabase/templates/phone_changed_notification.html`
- `supabase/templates/reauthentication.html`
- `supabase/templates/recovery.html`

`supabase/config.toml` remains the pre-existing local modification and is excluded from B1 edits/staging.
