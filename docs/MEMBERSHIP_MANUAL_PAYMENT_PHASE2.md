# Membership Manual Payment Phase 2

## Purpose

This phase adds required manual payment receipt upload to the membership registration flow.

Membership fee remains separate from voluntary donations and finance donation records.

## Fee

- Base membership application fee: **Rs. 600**
- Applicable tax/processing charges are still not hardcoded.
- Final total can be adjusted later when a payment gateway or accountant confirms charges.

## Manual payment details shown to applicant

- Bank Name: **Mobilink Microfinance Bank**
- Account Title: **Abdur shop**
- Account No: **01333300393**
- IBAN: **PK08JCMA1905921333300393**

## Registration behavior

The user must upload a payment receipt before submitting the membership application.

Accepted receipt formats:

- PNG
- JPG / JPEG
- WebP
- PDF

Maximum receipt size: **5MB**

## Database changes

`membership_payments` now supports receipt metadata:

- `receipt_path`
- `receipt_file_name`
- `receipt_mime_type`
- `receipt_size_bytes`
- `receipt_uploaded_at`

A private Supabase Storage bucket is added:

- `membership-receipts`

Path convention:

```text
membership-receipts/{user_id}/receipt-{timestamp}.ext
```

## Admin behavior

Admin member detail page now shows:

- Manual payment account details
- Receipt file name
- Receipt uploaded timestamp
- Open receipt button using signed URL
- Mark Paid / Waive / Pending controls

## Important policy

Application submission is blocked until a receipt is uploaded.

Approval is still not automatically blocked by payment status in this phase. Admin should verify the receipt manually and then mark the fee as Paid or Waived.


## QR payment support

Manual payment flow now also supports a QR code payment image for receiving membership fee payments.

User-facing details:
- Bank Name: Mobilink Microfinance Bank
- Account Title: Abdur shop
- Account No: 01333300393
- IBAN: PK08JCMA1905921333300393
- Payment Network: JazzCash / Raast
- Till ID: 983365478

QR image asset path:
- `public/jas/membership-payment-qr.jpg`

The QR image is shown on:
- Register page
- Dashboard membership fee panel
- Admin member detail payment section
