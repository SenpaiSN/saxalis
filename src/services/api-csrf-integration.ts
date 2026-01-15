/**
 * API Service Integration - CSRF Protection
 * 
 * This guide shows how to update your existing API calls to include CSRF tokens
 */

import { getCsrfToken, addCsrfToBody } from './csrf';

// ============================================================================
// TRANSACTIONS
// ============================================================================

/**
 * Add a new transaction
 */
export async function addTransaction(transaction: {
  Date: string;
  Type: 'income' | 'expense';
  id_type: number;
  category_id: number;
  Montant: number;
  subcategory_id?: number | null;
  Notes?: string;
  currency?: string;
}) {
  const body = await addCsrfToBody(transaction);
  
  const response = await fetch('/API/add_transaction.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    credentials: 'include' // Include session cookies
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add transaction');
  }

  return response.json();
}

/**
 * Update an existing transaction
 */
export async function updateTransaction(transaction: {
  id_transaction: number;
  Date: string;
  Type: string;
  Montant: number;
  Catégorie?: string;
  'Sous-catégorie'?: string;
  category_id?: number;
  subcategory_id?: number;
  Notes?: string;
  currency?: string;
}) {
  const body = await addCsrfToBody(transaction);

  const response = await fetch('/API/update_transaction.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update transaction');
  }

  return response.json();
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: number) {
  const body = await addCsrfToBody({ id_transaction: id });

  const response = await fetch('/API/delete_transaction.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete transaction');
  }

  return response.json();
}

// ============================================================================
// CATEGORIES
// ============================================================================

/**
 * Add a new category
 */
export async function addCategory(data: {
  id_type: number;
  name: string;
  manual_budget?: number;
}) {
  const body = await addCsrfToBody(data);

  const response = await fetch('/API/add_category.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add category');
  }

  return response.json();
}

/**
 * Delete a category
 */
export async function deleteCategory(data: {
  id_category: number;
  reassign_to_subcategory_id?: number;
}) {
  const body = await addCsrfToBody(data);

  const response = await fetch('/API/delete_category.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete category');
  }

  return response.json();
}

// ============================================================================
// SUBCATEGORIES (TODO - Add CSRF to backend first)
// ============================================================================

export async function addSubcategory(data: {
  category_id: number;
  name: string;
}) {
  // TODO: Backend needs CSRF protection added
  const body = await addCsrfToBody(data);

  const response = await fetch('/API/add_subcategory.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add subcategory');
  }

  return response.json();
}

export async function deleteSubcategory(id: number) {
  // TODO: Backend needs CSRF protection added
  const body = await addCsrfToBody({ id_subcategory: id });

  const response = await fetch('/API/delete_subcategory.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete subcategory');
  }

  return response.json();
}

// ============================================================================
// GOALS (TODO - Add CSRF to backend first)
// ============================================================================

export async function addGoal(data: {
  category_id: number;
  subcategory_id: number;
  montant: number;
}) {
  // TODO: Backend needs CSRF protection added
  const body = await addCsrfToBody(data);

  const response = await fetch('/API/add_goal.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add goal');
  }

  return response.json();
}

export async function deleteGoal(id: number) {
  // TODO: Backend needs CSRF protection added
  const body = await addCsrfToBody({ id_objectif: id });

  const response = await fetch('/API/delete_goal.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete goal');
  }

  return response.json();
}

// ============================================================================
// RECURRING TRANSACTIONS (TODO - Add CSRF to backend first)
// ============================================================================

export async function addRecurringTransaction(data: {
  frequency: string;
  start_date: string;
  end_date?: string;
  montant: number;
  categorie: string;
  [key: string]: any;
}) {
  // TODO: Backend needs CSRF protection added
  const body = await addCsrfToBody(data);

  const response = await fetch('/API/add_recurring_transaction.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add recurring transaction');
  }

  return response.json();
}

// ============================================================================
// GET ENDPOINTS (No CSRF needed - read-only)
// ============================================================================

/**
 * Fetch all transactions
 */
export async function getTransactions() {
  const response = await fetch('/API/get_transactions.php', {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch transactions');
  }

  return response.json();
}

/**
 * Fetch all categories
 */
export async function getCategories() {
  const response = await fetch('/API/get_categories.php', {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }

  return response.json();
}

/**
 * Fetch all subcategories for a category
 */
export async function getSubcategories(categoryId: number) {
  const response = await fetch(`/API/get_subcategories.php?category_id=${categoryId}`, {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch subcategories');
  }

  return response.json();
}

/**
 * Fetch user profile
 */
export async function getUser() {
  const response = await fetch('/API/get_user.php', {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }

  return response.json();
}

// ============================================================================
// PATTERN SUMMARY
// ============================================================================

/*
All POST/PUT/DELETE endpoints should now follow this pattern:

1. Import the CSRF helper:
   import { addCsrfToBody } from './csrf';

2. Add CSRF token to body:
   const body = await addCsrfToBody({ ...data });

3. Make the request:
   const response = await fetch('/API/endpoint.php', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(body),
     credentials: 'include'  // IMPORTANT: Include session cookies
   });

4. Handle errors:
   if (!response.ok) {
     const error = await response.json();
     throw new Error(error.error);
   }

5. Return data:
   return response.json();
*/
