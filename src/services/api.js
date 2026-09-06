import { trackDataRequest } from './requestLoading.js';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const finishLoading = (options.method || 'GET') === 'GET' && !path.startsWith('/api/auth/')
    ? trackDataRequest(path, options.headers?.Authorization)
    : null;
  try {
    const isMultipart = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const response = await fetch(`${API_URL}${path}`, { cache: 'no-store', ...options, headers: { ...(isMultipart ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Request failed.');
    return data;
  } finally {
    finishLoading?.();
  }
}

export const api = {
  whatsappSettings: (token) => request('/api/whatsapp/settings', { headers: { Authorization: `Bearer ${token}` } }),
  saveWhatsAppSettings: (token, body) => request('/api/whatsapp/settings', { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  whatsappStatus: (token) => request('/api/whatsapp/status', { headers: { Authorization: `Bearer ${token}` } }),
  whatsappActivity: (token) => request('/api/whatsapp/activity', { headers: { Authorization: `Bearer ${token}` } }),
  connectWhatsApp: (token) => request('/api/whatsapp/connect', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  disconnectWhatsApp: (token) => request('/api/whatsapp/disconnect', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  previewWhatsAppRule: (token, body) => request('/api/whatsapp/preview', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  retryWhatsAppActivity: (token, id) => request(`/api/whatsapp/activity/${id}/retry`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  requestRegistrationOtp: (body) => request('/api/auth/register/request', { method: 'POST', body: JSON.stringify(body) }),
  verifyRegistrationOtp: (body) => request('/api/auth/register/verify', { method: 'POST', body: JSON.stringify(body) }),
  requestResetOtp: (body) => request('/api/auth/forgot-password/request', { method: 'POST', body: JSON.stringify(body) }),
  verifyResetOtp: (body) => request('/api/auth/forgot-password/verify-otp', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body) => request('/api/auth/forgot-password/reset', { method: 'POST', body: JSON.stringify(body) }),
  dashboard: (token) => request('/api/dashboard/summary', { headers: { Authorization: `Bearer ${token}` } }),
  users: (token) => request('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
  leads: (token, params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
    ).toString();
    return request(`/api/leads${query ? `?${query}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
  },
  createLead: (token, body) => request('/api/leads', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  updateLead: (token, id, body) => request(`/api/leads/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  deleteLead: (token, id) => request(`/api/leads/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  leadOptions: (token) => request('/api/lead-options', { headers: { Authorization: `Bearer ${token}` } }),
  createLeadOption: (token, body) => request('/api/lead-options', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  updateLeadOption: (token, id, body) => request(`/api/lead-options/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  deleteLeadOption: (token, id) => request(`/api/lead-options/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  createFollowUp: (token, id, body) => request(`/api/leads/${id}/followups`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  updateFollowUp: (token, id, followUpId, body) => request(`/api/leads/${id}/followups/${followUpId}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  deleteFollowUp: (token, id, followUpId) => request(`/api/leads/${id}/followups/${followUpId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  sendFollowUpWhatsApp: (token, id, followUpId, message) => request(`/api/leads/${id}/followups/${followUpId}/send-whatsapp`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ message }) }),
  createUser: (token, body) => request('/api/users', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  updateUser: (token, id, body) => request(`/api/users/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  deleteUser: (token, id) => request(`/api/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  products: (token) => request('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
  categories: (token) => request('/api/categories', { headers: { Authorization: `Bearer ${token}` } }),
  createCategory: (token, body) => request('/api/categories', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  updateCategory: (token, id, body) => request(`/api/categories/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  deleteCategory: (token, id) => request(`/api/categories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  createSubCategory: (token, categoryId, body) => request(`/api/categories/${categoryId}/subcategories`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  updateSubCategory: (token, categoryId, subCategoryId, body) => request(`/api/categories/${categoryId}/subcategories/${subCategoryId}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  deleteSubCategory: (token, categoryId, subCategoryId) => request(`/api/categories/${categoryId}/subcategories/${subCategoryId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  quotations: (token) => request('/api/quotations', { headers: { Authorization: `Bearer ${token}` } }),
  createQuotation: (token, body) => request('/api/quotations', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  updateQuotation: (token, id, body) => request(`/api/quotations/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  updateQuotationStatus: (token, id, status) => request(`/api/quotations/${id}/status`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) }),
  deleteQuotation: (token, id) => request(`/api/quotations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  createProduct: (token, body) => request('/api/products', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: body instanceof FormData ? body : JSON.stringify(body) }),
  updateProduct: (token, id, body) => request(`/api/products/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: body instanceof FormData ? body : JSON.stringify(body) }),
  deleteProduct: (token, id) => request(`/api/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
};

export function saveSession(data) { sessionStorage.setItem('jb_crm_token', data.token); sessionStorage.setItem('jb_crm_user', JSON.stringify(data.user)); }
export function getSession() { const token = sessionStorage.getItem('jb_crm_token'); const user = sessionStorage.getItem('jb_crm_user'); return token && user ? { token, user: JSON.parse(user) } : null; }
export function clearSession() { sessionStorage.removeItem('jb_crm_token'); sessionStorage.removeItem('jb_crm_user'); }
