# OCR Feedback Endpoint

Purpose: collect user accept/override/reject feedback on OCR-extracted fields to enable future model improvements.

Design & Privacy
- The server stores only:
  - `receipt_text_hash` (SHA-256 of the receipt full text)
  - `redacted_text` (first 500 characters) for debugging
  - `merchant` (optional)
  - `invoice_hash` (SHA-256 of uploaded image data URL) — prefer hashing on client
  - suggested/applied values (amount/category)
  - `action` (accepted/overridden/rejected)
  - `candidates` (JSON, limited to a few entries)
  - `meta` JSON for context
- Full raw text or user PII should not be stored beyond the redaction.

API
- POST `/API/ocr_feedback.php` (authenticated + CSRF required)
- JSON payload: { action, full_text?, merchant?, invoice_hash?, suggested_amount?, applied_amount?, suggested_category?, applied_category?, candidates?, meta? }

Client usage
- `src/services/api.ts` exposes `submitOcrFeedback(payload)` which wraps CSRF and posts to the endpoint.
- The scanner modal (`ReceiptScannerModal`) now submits feedback when:
  - user accepts suggested amount
  - user accepts suggested category
  - user confirms (may be an override)

DB Migration
- `deploy/migrations/2026-01-11_create_ocr_feedback.sql` adds `ocr_feedback` table.

Next steps
- Add a periodic job to export/anonymize and build training datasets
- Add admin UI or reporting endpoint for aggregated stats
