# Home Page i18n Phase 4

This patch moves the cleaned landing page copy into a dedicated multilingual helper.

## Added

- `src/lib/home-i18n.ts`

## Updated

- `src/routes/index.tsx`

## Languages

- English
- Urdu
- Sindhi

## What changed

- Home page hero copy is now language-aware.
- Membership flow section is now language-aware.
- Program gateway cards are now language-aware.
- Portal feature cards are now language-aware.
- Final CTA is now language-aware.
- Home page text direction changes with selected language.
- Urdu and Sindhi use RTL text direction/alignment.
- Action arrows rotate in RTL where needed.

## What was intentionally not touched

- Actual exported membership card components/designs were not changed.
- Database, routes, auth, admin, and election files were not changed.
- Header/root split files were not changed.

## Notes

The card preview inside the home page stays visually LTR to protect the digital card mockup layout, while its supporting preview labels are multilingual.

## Apply

```bash
cd ~/projects/jas-app

unzip -o /mnt/c/Users/*/Downloads/jas-home-page-i18n-phase4-patch.zip -d .

npm run check
npm run build
```

## Manual QA

1. Open `/`.
2. Switch English / Urdu / Sindhi from the header language switcher.
3. Confirm hero text changes.
4. Confirm membership flow text changes.
5. Confirm program cards and badges change.
6. Confirm final CTA changes.
7. Confirm Urdu/Sindhi text aligns RTL.
8. Confirm exported membership card pages are unchanged.
