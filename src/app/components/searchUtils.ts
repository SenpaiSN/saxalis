/**
 * Utility functions for advanced search/filtering across the app
 * Provides consistent, multi-field search with diacritic normalization
 */

import { Transaction } from '../App';

/**
 * Normalize a string for search: lowercase + remove diacritics
 * Allows matching "café" with "cafe", "é" with "e", etc.
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Check if a transaction matches a search query
 * Searches across: category, subcategory, note, amount, and date
 */
export function matchesSearch(transaction: Transaction, query: string): boolean {
  const searchNorm = normalizeString(query);
  
  // If query is empty, everything matches
  if (searchNorm.length === 0) return true;
  
  // Combine all searchable fields and normalize them
  const fields = [
    transaction.categorie,
    transaction.subcategoryName || (transaction as any).subCategory || '',
    transaction.note || '',
    String(transaction.montant ?? ''),
    transaction.date || ''
  ]
    .map(field => normalizeString(String(field ?? '')))
    .join(' ');
  
  return fields.includes(searchNorm);
}

/**
 * Simple search for a single field (used in Settings/GestionPostes)
 * @param fieldValue The value to search in
 * @param query The search query
 */
export function matchesFieldSearch(fieldValue: string | undefined, query: string): boolean {
  if (!query.trim()) return true;
  const normalized = normalizeString(fieldValue ?? '');
  const queryNorm = normalizeString(query);
  return normalized.includes(queryNorm);
}
