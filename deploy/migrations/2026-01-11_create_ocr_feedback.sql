-- Migration: create ocr_feedback table (privacy-conscious storage for OCR feedback)
-- Run on a tested backup of your DB.

CREATE TABLE IF NOT EXISTS `ocr_feedback` (
  `id_feedback` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_utilisateur` INT UNSIGNED NULL,
  `receipt_text_hash` VARCHAR(64) NOT NULL,
  `redacted_text` VARCHAR(500) DEFAULT NULL,
  `merchant` VARCHAR(255) DEFAULT NULL,
  `invoice_hash` VARCHAR(64) DEFAULT NULL,
  `suggested_amount` DECIMAL(12,2) DEFAULT NULL,
  `suggested_category` VARCHAR(255) DEFAULT NULL,
  `applied_amount` DECIMAL(12,2) DEFAULT NULL,
  `applied_category` VARCHAR(255) DEFAULT NULL,
  `action` ENUM('accepted','overridden','rejected') NOT NULL,
  `candidates` JSON DEFAULT NULL,
  `meta` JSON DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_feedback`),
  INDEX (`created_at`),
  INDEX (`receipt_text_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Note: to respect privacy, we store only a SHA-256 hash of the full text and at most a 500-char redaction for debugging.
-- For images, prefer storing only the file hash (invoice_hash) or keeping a reference to uploaded invoice files rather than the full binary.
