# JAS Android APK / Google Play Readiness Checklist

This checklist covers the current PWABuilder / Bubblewrap Trusted Web Activity release flow for `https://jasofficial.org`.

## 1. Current Android package status

The APK/AAB package was generated successfully by PWABuilder for:

```text
https://jasofficial.org
```

Package name from `assetlinks.json`:

```text
org.jasofficial.twa
```

Required Digital Asset Links file is committed at:

```text
public/.well-known/assetlinks.json
```

Live verification URL must return HTTP 200:

```text
https://jasofficial.org/.well-known/assetlinks.json
```

## 2. Vercel domain setup

Correct setup:

```text
jasofficial.org        -> Production
www.jasofficial.org    -> 308 redirect -> jasofficial.org
```

Verify:

```bash
curl -I https://jasofficial.org/.well-known/assetlinks.json
curl -I https://www.jasofficial.org/.well-known/assetlinks.json
```

Expected:

```text
jasofficial.org -> HTTP/2 200
www.jasofficial.org -> HTTP/2 308 location: https://jasofficial.org/...
```

## 3. Local Android readiness verification

```bash
npm run verify:android
```

Optional custom package dir:

```bash
ANDROID_PACKAGE_DIR=~/Downloads/jas-android-package npm run verify:android
```

## 4. Package files

PWABuilder ZIP contains:

```text
JAS.apk                  -> phone testing / sideload
JAS.aab                  -> Google Play Console upload
assetlinks.json          -> already copied to public/.well-known/assetlinks.json
signing.keystore         -> private backup only
signing-key-info.txt     -> private backup only
```

Never commit:

```text
signing.keystore
signing-key-info.txt
JAS.apk
JAS.aab
*.apk
*.aab
*.keystore
```

## 5. Phone testing flow

1. Uninstall old JAS APK from phone.
2. Close Chrome/recent browser tabs.
3. Install latest `JAS.apk`.
4. Open from the JAS app icon, not by opening the website URL.
5. Confirm no Chrome address bar is visible.
6. Test login, dashboard, card, notifications, and membership application.

If address bar appears:

- `assetlinks.json` is missing or redirecting on the packaged domain.
- APK was generated for a different domain.
- Fingerprint in `assetlinks.json` does not match APK signing certificate.
- Android cached a failed verification; uninstall/reinstall after fixing domain.

## 6. Google Play upload flow

Use:

```text
JAS.aab
```

Do not upload the test APK for Play release.

Recommended first release:

```text
Internal testing -> add tester Gmail -> install from Play test link -> final QA -> production
```

## 7. Store listing assets needed

- App name: `JAS` or `Jatt Alliance Sindh`
- Short description
- Full description
- App icon
- Feature graphic
- Phone screenshots
- Privacy Policy URL
- Support email
- Website URL: `https://jasofficial.org`
- Data Safety form answers
- Content rating questionnaire
- Target audience declaration

## 8. Suggested Play listing text

Short description:

```text
Official JAS member portal for registration, digital cards and updates.
```

Full description:

```text
Jatt Alliance Sindh (JAS) Member Platform helps members apply for membership, track approval, view digital membership cards, receive organization updates, submit donations and access member-linked support programs.
```
