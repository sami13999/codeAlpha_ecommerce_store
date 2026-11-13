/**
 * MAISON & CO. — AUTHENTICATION SCRIPT
 */

function initAuthPage() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');

  if (!loginForm || !registerForm) return;

  // Check if already authenticated
  if (window.api.isAuthenticated()) {
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect') || '/orders.html';
    window.location.href = redirectUrl;
    return;
  }

  // Tab switching
  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
      clearAuthErrors();
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      registerForm.style.display = 'block';
      loginForm.style.display = 'none';
      clearAuthErrors();
    });
  }

  // Setup password toggles
  setupPasswordToggles();

  // Login handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthErrors();

    const email = document.getElementById('login_email').value.trim();
    const password = document.getElementById('login_password').value;
    const submitBtn = document.getElementById('login-submit-btn');

    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span class="spinner"></span> Signing In...`;

    try {
      const res = await window.api.post('/auth/login', { email, password });
      if (res.success && res.data) {
        window.api.setSession(res.data.token, res.data.user);
        showToast('Welcome Back', `Signed in as ${res.data.user.full_name}`, 'success');

        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect') || '/index.html';
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 600);
      }
    } catch (err) {
      showAuthError('login-error-container', err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });

  // Register handler
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthErrors();

    const full_name = document.getElementById('reg_name').value.trim();
    const email = document.getElementById('reg_email').value.trim();
    const phone = document.getElementById('reg_phone').value.trim();
    const password = document.getElementById('reg_password').value;
    const submitBtn = document.getElementById('reg-submit-btn');

    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
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
        const redirectUrl = params.get('redirect') || '/index.html';
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 600);
      }
    } catch (err) {
      showAuthError('reg-error-container', err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

function showAuthError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div style="background: var(--error-bg); color: var(--error); padding: 0.85rem 1rem; border-radius: var(--radius-sm); font-size: 0.875rem; margin-bottom: 1rem; border: 1px solid rgba(168, 50, 50, 0.2);">
        ${escapeHTML(message)}
      </div>
    `;
  }
}

function clearAuthErrors() {
  const c1 = document.getElementById('login-error-container');
  const c2 = document.getElementById('reg-error-container');
  if (c1) c1.innerHTML = '';
  if (c2) c2.innerHTML = '';
}

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

function logout() {
  window.api.clearSession();
  showToast('Signed Out', 'You have been signed out successfully.', 'info');
  setTimeout(() => {
    window.location.href = '/index.html';
  }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('login-form')) {
    initAuthPage();
  }
});

