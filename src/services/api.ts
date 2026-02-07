const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL) ?? '';

if (!API_BASE) {
  console.warn('VITE_API_BASE_URL is not set. Requests will go to the current origin (dev server). Set VITE_API_BASE_URL=http://localhost/SITE in .env.local');
}

async function request(path: string, options: RequestInit = {}) {


  let res: Response;
  try {
    res = await fetch(`${API_BASE}/API/${path}`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
  } catch (networkError: any) {
    console.error('Network error on fetch', networkError, { path, API_BASE });
    return { ok: false, status: 0, data: null, text: null, error: networkError?.message ?? String(networkError) };
  }

  // read response text first
  const text = await res.text();
  const trimmed = text.trim();

  // If the server responded 401, notify the app that the session expired so it can clear sensitive data
  if (res.status === 401) {
    return { ok: false, status: res.status, data: null, text, error: 'Session invalide ou expirée' };
  }

  // detect obvious PHP source or HTML (common when pointing to the dev server or wrong host)
  if (trimmed.startsWith('<?php') || trimmed.toLowerCase().startsWith('<!doctype') || trimmed.toLowerCase().startsWith('<html')) {
    // return structured error to the caller rather than throwing so UI can show it
    return { ok: false, status: res.status, data: null, text, error: 'Server returned non-JSON (PHP/HTML)' };
  }

  // try parse json
  try {
      const json = text ? JSON.parse(text) : {};
      return { ok: res.ok, status: res.status, data: json, text };
    } catch (e) {
      // return the raw text to aid debugging when server responds with non-JSON
      return { ok: res.ok, status: res.status, data: null, text };
    }
}

export async function getTransactions() {
  return request('get_transactions.php', { method: 'GET' });
}

import { addCsrfToBody, getCsrfToken } from './csrf';

export async function addTransaction(payload: any) {
  const body = await addCsrfToBody(payload);
  return request('add_transaction.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function deleteTransaction(payload: any) {
  const body = await addCsrfToBody(payload);
  return request('delete_transaction.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function updateTransaction(payload: any) {
  const body = await addCsrfToBody(payload);
  return request('update_transaction.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function getCategories(id_type?: number) {
  const body = id_type ? JSON.stringify({ id_type }) : JSON.stringify({});
  return request('get_categories.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

export async function getTransactionTypes() {
  return request('get_transaction_types.php', { method: 'GET' });
}

export async function getMonthlySavings(month?: string) {
  const url = month ? `get_monthly_savings.php?month=${encodeURIComponent(month)}` : 'get_monthly_savings.php';
  return request(url, { method: 'GET' });
}

// User profile
export async function updateUserProfile(formData: FormData) {
  // Use POST with multipart/form-data (do not set Content-Type so browser sets boundary)
  const token = await getCsrfToken();
  formData.append('csrf_token', token);
  return request('update_user_profile.php', { method: 'POST', body: formData });
}

export async function updatePassword(payload: { current_password: string; new_password: string }) {
  const body = await addCsrfToBody(payload);
  return request('update_password.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// Update a user's preferences (persist on server)
export async function updateUserPreference(payload: { currency?: string }) {
  const body = await addCsrfToBody(payload);
  return request('update_user_pref.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function getBudgets(payload?: any) {
  return request('get_budgets.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
}

export async function getSubcategories(category_id?: number) {
  const url = category_id ? `get_subcategories.php?category_id=${encodeURIComponent(category_id)}` : 'get_subcategories.php';
  return request(url, { method: 'GET' });
}

// ---- Types / Categories / Subcategories CRUD ----
export async function addType(payload: { code: string; label: string }) {
  const body = await addCsrfToBody(payload);
  return request('add_type.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function updateType(payload: { id_type: number; code?: string; label: string }) {
  const body = await addCsrfToBody(payload);
  return request('update_type.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function deleteType(payload: { id_type: number }) {
  const body = await addCsrfToBody(payload);
  return request('delete_type.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function addCategory(payload: { id_type: number; name: string }) {
  const body = await addCsrfToBody(payload);
  return request('add_category.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function updateCategory(payload: { id_category: number; name: string; id_type?: number }) {
  const body = await addCsrfToBody(payload);
  return request('update_category.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function deleteCategory(payload: { id_category: number }) {
  const body = await addCsrfToBody(payload);
  return request('delete_category.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function addSubcategory(payload: { category_id: number; name: string; icon?: string }) {
  const body = await addCsrfToBody(payload);
  return request('add_subcategory.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function updateSubcategory(payload: { id_subcategory: number; name: string; category_id?: number; icon?: string }) {
  const body = await addCsrfToBody(payload);
  return request('update_subcategory.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function deleteSubcategory(payload: { id_subcategory: number }) {
  const body = await addCsrfToBody(payload);
  return request('delete_subcategory.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// ---- Auth ----
export async function login(payload: any) {
  return request('login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function register(payload: { email: string; mot_de_passe: string; firstName: string; lastName: string }) {
  return request('register.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function logout() {
  return request('logout.php', { method: 'GET' });
}

export async function checkSession() {
  return request('check_session.php', { method: 'GET' });
}

// ---- Goals / Objectifs API ----
export async function getGoals() {
  return request('get_goals.php', { method: 'GET' });
}

export async function getObjectifsCrees() {
  return request('get_objectifs_crees.php', { method: 'GET' });
}

export async function getObjectifsAtteints() {
  return request('get_objectifs_atteints.php', { method: 'GET' });
}

export async function createGoal(payload: { nom: string; montant_objectif: number; type_id?: number; date_cible?: string; automatique?: number }) {
  const body = await addCsrfToBody(payload);
  return request('add_goal.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function updateGoal(payload: any) {
  const body = await addCsrfToBody(payload);
  return request('update_objectif.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function deleteGoal(payload: { id: number }) {
  const body = await addCsrfToBody(payload);
  return request('delete_goal.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function addGoalDeposit(payload: { goal_id: number; montant: number; date?: string; create_depot?: boolean; notes?: string }) {
  const body = await addCsrfToBody(payload);
  return request('add_goal_transaction.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function withdrawFromGoal(payload: { goal_id: number; montant: number; date?: string; id_type?: number; category_id?: number; subcategory_id?: number; notes?: string }) {
  const body = await addCsrfToBody(payload);
  return request('add_goal_withdrawal.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function transferBetweenGoals(payload: { from_goal_id: number; to_goal_id: number; montant: number; date?: string; notes?: string }) {
  const body = await addCsrfToBody(payload);
  return request('transfer_goal.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function uploadInvoice(payload: { transaction_id: number | string; file: File }) {
  const form = new FormData();
  form.append('transaction_id', String(payload.transaction_id));
  form.append('invoice', payload.file);
  const token = await getCsrfToken();
  form.append('csrf_token', token);
  // Use the generic request helper; it will pass credentials and accept headers. Do not set Content-Type so the browser sets multipart boundary.
  return request('upload_invoice.php', { method: 'POST', body: form });
}

// Submit OCR feedback for analytics/training (privacy-conscious - server stores hash + redacted text only)
export async function submitOcrFeedback(payload: any) {
  const body = await addCsrfToBody(payload);
  return request('ocr_feedback.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// Search categories across all transaction types (unified endpoint)
export async function searchCategories(query: string, limit = 10) {
  return request(`search_categories.php?q=${encodeURIComponent(query)}&limit=${limit}`, {
    method: 'GET'
  });
}

export async function getGoalTransactions(payload: { projet_id: number }) {
  return request('get_goal_transactions.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// Goal plans (recurring and round-up)
export async function getGoalPlans() {
  return request('get_goal_plans.php', { method: 'GET' });
}

export async function addGoalPlan(payload: any) {
  const body = await addCsrfToBody(payload);
  return request('add_goal_plan.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function updateGoalPlan(payload: any) {
  const body = await addCsrfToBody(payload);
  return request('update_goal_plan.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function deleteGoalPlan(payload: { id: number }) {
  const body = await addCsrfToBody(payload);
  return request('delete_goal_plan.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function runGoalPlans() {
  const body = await addCsrfToBody({});
  return request('run_goal_plans.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function addRecurringTransaction(payload: any) {
  const body = await addCsrfToBody(payload);
  return request('add_recurring_transaction.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function runRecurringTransactions() {
  const body = await addCsrfToBody({ force: 1 });
  return request('run_recurring_transactions.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export default {
  getTransactions,
  addTransaction,
  deleteTransaction,
  getCategories,
  getTransactionTypes,
  getBudgets,
  addType,
  updateType,
  deleteType,
  addCategory,
  updateCategory,
  deleteCategory,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
  login,
  register,
  logout,
  checkSession,
  getGoals,
  getObjectifsCrees,
  getObjectifsAtteints,
  createGoal,
  updateGoal,
  deleteGoal,
  addGoalDeposit,
  withdrawFromGoal,
  transferBetweenGoals,
  uploadInvoice,
  submitOcrFeedback,
  getGoalTransactions,
  updateUserProfile,
  updatePassword
};