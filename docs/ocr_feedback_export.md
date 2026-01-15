# OCR Feedback Export

This document covers the nightly export job for OCR feedback that creates anonymized datasets suitable for training.

Files
- `scripts/export_ocr_feedback.php` — CLI script to export `ocr_feedback` rows since a given date (or last N days)
- `exports/` — default directory where compressed JSONL exports are stored

Usage
- Export last 24 hours (default):
  php scripts/export_ocr_feedback.php
- Export since a date:
  php scripts/export_ocr_feedback.php --since=2026-01-01
- Export last 7 days:
  php scripts/export_ocr_feedback.php --days=7

Environment
- `OCR_FEEDBACK_EXPORT_DIR` — directory to write export files (default `exports/`)
- `OCR_FEEDBACK_INCLUDE_MERCHANT` — set to `1` to include merchant field (redacted), default `0`
- `OCR_FEEDBACK_S3_BUCKET` — optional S3 bucket name to upload the gzipped export (requires aws-cli configured with credentials on the host)

Redaction rules
- The script stores only a SHA-256 of the full OCR text and a `redacted_text` field (≤500 chars).
- `redacted_text` is sanitized:
  - emails are replaced by `[EMAIL]`
  - numeric sequences are replaced by `X` to avoid exposing phone numbers, card numbers, or precise amounts

Cron example (daily at 2:00):
0 2 * * * /usr/bin/php /path/to/project/scripts/export_ocr_feedback.php --days=1 >> /var/log/ocr_feedback_export.log 2>&1

Quick test (local)
1) Insert a test feedback row (use PHP from your MAMP installation). Example:
   /c/MAMP/bin/php/php8.2.0/php.exe scripts/insert_test_ocr_feedback.php
   (adjust path to your php.exe)
2) Run the export for the last day (CLI):
   /c/MAMP/bin/php/php8.2.0/php.exe scripts/export_ocr_feedback.php --days=1
3) Inspect the latest exported file (CLI):
   /c/MAMP/bin/php/php8.2.0/php.exe scripts/inspect_latest_export.php

Or, trigger export via the admin API on your hosted site (use a logged-in admin or provide admin token):

POST /API/export_ocr_feedback.php?days=1
Headers:
  Cookie: (your session cookie)
  X-Admin-Token: (optional if OCR_FEEDBACK_ADMIN_TOKEN is configured)

Response (JSON): { success: true, exported: N, file: "/path/to/exports/ocr_feedback_...jsonl.gz", s3: { bucket, key } }

Security notes:
- The endpoint requires an authenticated session (`require_auth()`), plus either an admin token header matching `OCR_FEEDBACK_ADMIN_TOKEN` or the user id matching `OCR_FEEDBACK_ADMIN_USER_ID` (set in env).
- Keep `OCR_FEEDBACK_ADMIN_TOKEN` secret and consider using a strong random token (not a password).

Notes
- The export file is produced as `exports/ocr_feedback_YYYYMMDD_HHMMSS.jsonl.gz`.
- Files may be uploaded to S3 if `OCR_FEEDBACK_S3_BUCKET` is set and `aws` CLI is available on the host.
- After running the export, review files and rotate old exports as per your retention policy.
