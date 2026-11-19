/**
 * MAISON & CO. — CENTRALIZED API CLIENT
 */

const API_BASE_URL = '/api';

class ApiClient {
  constructor() {
    this.tokenKey = 'maison_ecommerce_jwt';
    this.userKey = 'maison_ecommerce_user';
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getUser() {
    try {
      const userStr = localStorage.getItem(this.userKey);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  setSession(token, user) {
    if (token) localStorage.setItem(this.tokenKey, token);
    if (user) localStorage.setItem(this.userKey, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user } }));
  }

  clearSession() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user: null } }));
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({
        success: false,
        message: 'Invalid response from server'
      }));

      if (!response.ok) {
        if (response.status === 401 && this.isAuthenticated()) {
          this.clearSession();
          window.dispatchEvent(new CustomEvent('session-expired'));
        }

        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.errors = data.errors || [data.message];
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        const netErr = new Error('Network error. Unable to reach the server.');
        netErr.errors = ['Network connection failed'];
        throw netErr;
      }
      throw err;
    }
  }

  get(endpoint, queryParams = null) {
    let url = endpoint;
    if (queryParams) {
      const filtered = {};
      Object.keys(queryParams).forEach(k => {
        if (queryParams[k] !== undefined && queryParams[k] !== null && queryParams[k] !== '') {
          filtered[k] = queryParams[k];
        }
      });
      const qs = new URLSearchParams(filtered).toString();
      if (qs) url += `?${qs}`;
    }
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

window.api = new ApiClient();

