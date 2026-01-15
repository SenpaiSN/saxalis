-- Migration: Remove legacy coffre_* tables and point transactions.goal_id to objectif_crees
-- Run this on a tested backup of your database. Do NOT run on production without backup.

-- 1) Backup
-- mysqldump -u user -p database_name > backup_before_remove_coffre.sql

-- 2) Drop FK referencing coffre_projets
ALTER TABLE transactions DROP FOREIGN KEY IF EXISTS transactions_goal_fk;

-- 3) Recreate FK to reference objectif_crees (so goal_id points to id_objectif)
ALTER TABLE transactions ADD CONSTRAINT transactions_goal_fk FOREIGN KEY (goal_id) REFERENCES objectif_crees (id_objectif) ON DELETE SET NULL ON UPDATE CASCADE;

-- 4) Drop legacy tables if not used
DROP TABLE IF EXISTS coffre_depot_files;
DROP TABLE IF EXISTS coffre_depots;
DROP TABLE IF EXISTS coffre_projets;
DROP TABLE IF EXISTS type_projet;

-- 5) Optional: remove orphaned files in uploads/invoices/ if desired (manually inspect before deletion)

-- 6) After running migration, verify:
-- - SELECT COUNT(1) FROM objectif_crees;
-- - SELECT COUNT(1) FROM transactions WHERE goal_id IS NOT NULL;
-- - Run your test suite and manual flows for create/deposit/withdraw/transfer.
