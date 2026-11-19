/**
 * MAISON & CO. — MAIN SHARED APP SCRIPT
 */

// Toast Notification Manager
function showToast(title, message = '', type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-title">${escapeHTML(title)}</div>
      ${message ? `<div class="toast-message">${escapeHTML(message)}</div>` : ''}
    </div>
    <div class="toast-close" title="Dismiss">&times;</div>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Live Cart Badge Counter
async function updateCartBadge() {
  const badge = document.getElementById('cart-count-badge');
  if (!badge) return;

  if (!window.api.isAuthenticated()) {
    badge.textContent = '0';
    badge.style.display = 'none';
    return;
  }

  try {
    const res = await window.api.get('/cart');
    if (res.success && res.data && res.data.summary) {
      const count = res.data.summary.item_count || 0;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  } catch {
    badge.textContent = '0';
    badge.style.display = 'none';
  }
}

// Live Wishlist Badge Counter
async function updateWishlistBadge() {
  const badge = document.getElementById('wishlist-count-badge');
  if (!badge) return;

  if (!window.api.isAuthenticated()) {
    badge.textContent = '0';
    badge.style.display = 'none';
    return;
  }

  try {
    const res = await window.api.get('/wishlist');
    if (res.success && res.data) {
      const count = res.data.total_items || 0;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  } catch {
    badge.textContent = '0';
    badge.style.display = 'none';
  }
}

// Header & Navigation User State Sync
function syncNavState() {
  const user = window.api.getUser();
  const accountLink = document.getElementById('nav-account-link');
  const accountName = document.getElementById('nav-user-name');
  const mobileAccountLink = document.getElementById('mobile-nav-account');

  if (user) {
    if (accountLink) {
      accountLink.href = '/account';
      accountLink.title = `Signed in as ${user.full_name}`;
    }
    if (accountName) {
      accountName.textContent = user.full_name.split(' ')[0];
      accountName.style.display = 'inline';
    }
    if (mobileAccountLink) {
      mobileAccountLink.textContent = `My Account (${user.full_name.split(' ')[0]})`;
      mobileAccountLink.href = '/account';
    }
  } else {
    if (accountLink) {
      accountLink.href = '/login';
      accountLink.title = 'Sign In';
    }
    if (accountName) {
      accountName.textContent = '';
      accountName.style.display = 'none';
    }
    if (mobileAccountLink) {
      mobileAccountLink.textContent = 'Sign In / Register';
      mobileAccountLink.href = '/login';
    }
  }
}

// Mobile Drawer Setup
function setupMobileDrawer() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const closeBtn = document.getElementById('mobile-drawer-close');
  const backdrop = document.getElementById('mobile-drawer-backdrop');

  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', () => drawer.classList.add('is-open'));
  if (closeBtn) closeBtn.addEventListener('click', () => drawer.classList.remove('is-open'));
  if (backdrop) backdrop.addEventListener('click', () => drawer.classList.remove('is-open'));
}

// Search Bar Event
function setupHeaderSearch() {
  const forms = document.querySelectorAll('.header-search-form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="search"]');
      if (input && input.value.trim()) {
        const query = encodeURIComponent(input.value.trim());
        window.location.href = `/shop?search=${query}`;
      }
    });
  });
}

// Newsletter Form Handler
function setupNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('nl-email');
    const btn = document.getElementById('nl-submit-btn');
    const msg = document.getElementById('nl-message');

    if (!input || !input.value.trim()) return;

    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'Subscribing...';
    if (msg) msg.textContent = '';

    try {
      const res = await window.api.post('/newsletter/subscribe', { email: input.value.trim() });
      if (msg) {
        msg.style.color = '#2E7D32';
        msg.textContent = res.message || 'Subscribed successfully!';
      }
      showToast('Newsletter', res.message, 'success');
      input.value = '';
    } catch (err) {
      if (msg) {
        msg.style.color = '#C62828';
        msg.textContent = err.message;
      }
      showToast('Error', err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  syncNavState();
  updateCartBadge();
  updateWishlistBadge();
  setupMobileDrawer();
  setupHeaderSearch();
  setupNewsletter();

  window.addEventListener('auth-changed', () => {
    syncNavState();
    updateCartBadge();
    updateWishlistBadge();
  });

  window.addEventListener('cart-updated', () => {
    updateCartBadge();
    const badge = document.getElementById('cart-count-badge');
    if (badge && window.MotionManager) {
      window.MotionManager.popBadge(badge);
    }
  });

  window.addEventListener('wishlist-updated', () => {
    updateWishlistBadge();
    const badge = document.getElementById('wishlist-count-badge');
    if (badge && window.MotionManager) {
      window.MotionManager.popBadge(badge);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const drawer = document.getElementById('mobile-drawer');
      if (drawer && drawer.classList.contains('is-open')) {
        drawer.classList.remove('is-open');
      }
    }
  });

  window.addEventListener('session-expired', () => {
    showToast('Session Expired', 'Please sign in to continue.', 'error');
  });
});

