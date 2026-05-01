const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

function toNetworkError(error) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const message = offline
    ? 'Check your internet connection and try again.'
    : 'Network error. Check your internet connection and try again.';
  const err = new Error(message);
  err.cause = error;
  err.isNetworkError = true;
  return err;
}

function getAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function apiFetch(path, { method = 'GET', token, jsonBody, formData } = {}) {
  const headers = {
    ...getAuthHeaders(token),
  };

  if (!formData && jsonBody) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: formData ? formData : jsonBody ? JSON.stringify(jsonBody) : undefined,
    });
  } catch (error) {
    throw toNetworkError(error);
  }

  const payload = await parseJsonSafe(res);
  if (!res.ok) {
    const message = payload?.error?.message || payload?.message || res.statusText || 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload?.data ?? payload;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

