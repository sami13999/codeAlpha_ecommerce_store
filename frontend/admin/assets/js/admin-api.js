/**
 * Admin API Client & Authentication Utilities
 * E-Commerce Store Administration System
 */

const AdminAPI = (() => {
  const TOKEN_KEY = 'admin_token';
  const USER_KEY = 'admin_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function setAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isAuthenticated() {
    const token = getToken();
    const user = getUser();
    return !!(token && user && user.role === 'ADMIN');
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      clearAuth();
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/admin/login?returnUrl=${returnUrl}`;
      return false;
    }
    return true;
  }

  async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(endpoint, config);

      if (response.status === 401 || response.status === 403) {
        clearAuth();
        const reason = response.status === 403 ? 'forbidden' : 'session_expired';
        window.location.href = `/admin/login?error=${reason}`;
        throw new Error(response.status === 403 ? 'Access forbidden: Admins only' : 'Session expired');
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
        }
        return data;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with status ${response.status}`);
      }

      return response;
    } catch (err) {
      console.error(`[AdminAPI] Error on ${endpoint}:`, err);
      throw err;
    }
  }

  function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  }

  function formatDate(dateStr, includeTime = true) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';

    const opts = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };

    if (includeTime) {
      opts.hour = '2-digit';
      opts.minute = '2-digit';
    }

    return d.toLocaleDateString('en-US', opts);
  }

  function getBadgeClass(status) {
    const map = {
      // Order status
      'PENDING': 'badge-warning',
      'CONFIRMED': 'badge-info',
      'PROCESSING': 'badge-primary',
      'SHIPPED': 'badge-info',
      'DELIVERED': 'badge-success',
      'CANCELLED': 'badge-danger',
      'RETURNED': 'badge-danger',

      // Payment status
      'PAID': 'badge-success',
      'UNPAID': 'badge-warning',
      'REFUNDED': 'badge-info',

      // User status
      'ACTIVE': 'badge-success',
      'INACTIVE': 'badge-neutral',
      'BLOCKED': 'badge-danger',

      // Inventory movement
      'STOCK_IN': 'badge-success',
      'STOCK_OUT': 'badge-danger',
      'ORDER': 'badge-primary',
      'CANCELLED_ORDER': 'badge-warning',
      'RETURN': 'badge-info',
      'ADJUSTMENT': 'badge-neutral',

      // Review status
      'APPROVED': 'badge-success',
      'REJECTED': 'badge-danger',

      // Newsletter
      'SUBSCRIBED': 'badge-success',
      'UNSUBSCRIBED': 'badge-neutral'
    };

    return map[status] || 'badge-neutral';
  }

  return {
    getToken,
    getUser,
    setAuth,
    clearAuth,
    isAuthenticated,
    requireAuth,
    request,
    formatCurrency,
    formatDate,
    getBadgeClass
  };
})();
