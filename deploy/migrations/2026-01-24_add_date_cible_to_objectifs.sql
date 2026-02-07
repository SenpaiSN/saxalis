-- Migration: Add date_cible (target date) column to objectif_crees table
-- This allows tracking goal deadline for better progress estimation

ALTER TABLE `objectif_crees` 
ADD COLUMN `date_cible` DATE NULL DEFAULT NULL AFTER `automatique`;
