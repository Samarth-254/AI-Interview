/**
 * apiClient — fetch wrapper that auto-attaches JWT and base URL.
 * All frontend API calls go through this module.
 */

const getBackendUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (!envUrl) return '/api'; // fallback to proxy for local development
  // Ensure the base URL ends with /api for all endpoints
  return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
};

export const BACKEND_URL = getBackendUrl();
const BASE_URL = BACKEND_URL;

const getToken = () => localStorage.getItem('auth_token');

const request = async (method, path, body = undefined) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
};

export const apiClient = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
