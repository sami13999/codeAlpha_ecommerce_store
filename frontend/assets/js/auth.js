/**
 * MAISON & CO. — AUTHENTICATION CLIENT SCRIPT
 */

function setupPasswordToggles() {
  document.querySelectorAll('.toggle-password-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
      }
    });
  });
}

function showAuthError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div style="background: var(--error-bg); color: var(--error); padding: 0.85rem 1rem; border-radius: var(--radius-sm); font-size: 0.875rem; margin-bottom: 1.25rem; border: 1px solid rgba(168, 50, 50, 0.2);">
        ${escapeHTML(message)}
      </div>
    `;
  }
}

function clearAuthError(containerId) {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  if (window.api.isAuthenticated()) {
    const params = new URLSearchParams(window.location.search);
    window.location.href = params.get('redirect') || '/account';
    return;
  }

  setupPasswordToggles();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthError('login-error-container');

    const email = document.getElementById('login_email').value.trim();
    const password = document.getElementById('login_password').value;
    const submitBtn = document.getElementById('login-submit-btn');

    submitBtn.disabled = true;
    const orig = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span class="spinner"></span> Signing In...`;

    try {
      const res = await window.api.post('/auth/login', { email, password });
      if (res.success && res.data) {
        window.api.setSession(res.data.token, res.data.user);
        showToast('Welcome Back', `Signed in as ${res.data.user.full_name}`, 'success');

        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect') || '/account';
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
      }
    } catch (err) {
      showAuthError('login-error-container', err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = orig;
    }
  });
}

function initRegisterPage() {
  const form = document.getElementById('register-form');
  if (!form) return;

  if (window.api.isAuthenticated()) {
    window.location.href = '/account';
    return;
  }

  setupPasswordToggles();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthError('reg-error-container');

    const full_name = document.getElementById('reg_name').value.trim();
    const email = document.getElementById('reg_email').value.trim();
    const phone = document.getElementById('reg_phone').value.trim();
    const password = document.getElementById('reg_password').value;
    const submitBtn = document.getElementById('reg-submit-btn');

    submitBtn.disabled = true;
    const orig = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span class="spinner"></span> Creating Account...`;

    try {
      const res = await window.api.post('/auth/register', {
        full_name,
        email,
        phone: phone || null,
        password
      });

      if (res.success && res.data) {
        window.api.setSession(res.data.token, res.data.user);
        showToast('Account Created', 'Welcome to Maison & Co.', 'success');

        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect') || '/account';
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
      }
    } catch (err) {
      showAuthError('reg-error-container', err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = orig;
    }
  });
}

function logout() {
  window.api.clearSession();
  showToast('Signed Out', 'You have been safely signed out.', 'info');
  setTimeout(() => {
    window.location.href = '/';
  }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initRegisterPage();
});

