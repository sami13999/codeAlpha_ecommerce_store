/**
 * Admin Login Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', () => {
  // If already authenticated, redirect to dashboard immediately
  if (AdminAPI.isAuthenticated()) {
    window.location.replace('/admin/dashboard');
    return;
  }

  const form = document.getElementById('admin-login-form');
  const emailInput = document.getElementById('admin-email');
  const passwordInput = document.getElementById('admin-password');
  const submitBtn = document.getElementById('login-submit-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const alertEl = document.getElementById('login-alert');
  const autoFillBtn = document.getElementById('auto-fill-btn');
  const togglePwBtn = document.getElementById('toggle-pw-btn');

  // Check URL params for messages
  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === 'session_expired') {
    showAlert('Your session has expired. Please log in again.');
  } else if (params.get('error') === 'forbidden') {
    showAlert('Access denied. Administrator privileges required.');
  }

  // Auto fill credentials
  if (autoFillBtn) {
    autoFillBtn.addEventListener('click', () => {
      emailInput.value = 'admin@store.com';
      passwordInput.value = 'Password123!';
      emailInput.focus();
    });
  }

  // Toggle password visibility
  if (togglePwBtn) {
    togglePwBtn.addEventListener('click', () => {
      const isPw = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPw ? 'text' : 'password');
      togglePwBtn.textContent = isPw ? '🔒' : '👁️';
    });
  }

  function showAlert(message) {
    if (alertEl) {
      alertEl.textContent = message;
      alertEl.style.display = 'block';
    }
  }

  function hideAlert() {
    if (alertEl) {
      alertEl.style.display = 'none';
    }
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    if (loading) {
      btnText.textContent = 'Verifying credentials...';
      btnSpinner.style.display = 'inline-block';
    } else {
      btnText.textContent = 'Sign In to Dashboard';
      btnSpinner.style.display = 'none';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showAlert('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Invalid email or password');
      }

      const { token, user } = data.data;

      // Strict role check: customer accounts are strictly rejected from entering admin portal
      if (!user || user.role !== 'ADMIN') {
        AdminAPI.clearAuth();
        throw new Error('Access Denied: You do not have administrator permissions.');
      }

      AdminAPI.setAuth(token, user);
      AdminToast.success(`Welcome back, ${user.first_name || 'Admin'}!`);

      const returnUrl = params.get('returnUrl') || '/admin/dashboard';
      setTimeout(() => {
        window.location.href = returnUrl;
      }, 500);

    } catch (err) {
      showAlert(err.message || 'Failed to authenticate');
      setLoading(false);
    }
  });
});
