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

// Update Cart Badge Across Pages
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

// Sync Navigation and User State
function syncNavState() {
  const user = window.api.getUser();
  const accountLink = document.getElementById('nav-account-link');
  const accountName = document.getElementById('nav-user-name');
  const mobileAccountLink = document.getElementById('mobile-nav-account');

  if (user) {
    if (accountLink) {
      accountLink.href = '/orders.html';
      accountLink.title = `Signed in as ${user.full_name}`;
    }
    if (accountName) {
      accountName.textContent = user.full_name.split(' ')[0];
      accountName.style.display = 'inline';
    }
    if (mobileAccountLink) {
      mobileAccountLink.textContent = `My Orders (${user.full_name.split(' ')[0]})`;
      mobileAccountLink.href = '/orders.html';
    }
  } else {
    if (accountLink) {
      accountLink.href = '/auth.html';
      accountLink.title = 'Sign In';
    }
    if (accountName) {
      accountName.textContent = '';
      accountName.style.display = 'none';
    }
    if (mobileAccountLink) {
      mobileAccountLink.textContent = 'Sign In / Register';
      mobileAccountLink.href = '/auth.html';
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

  const open = () => drawer.classList.add('is-open');
  const close = () => drawer.classList.remove('is-open');

  toggleBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);
}

// Global Search bar handler
function setupHeaderSearch() {
  const forms = document.querySelectorAll('.header-search-form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="search"]');
      if (input && input.value.trim()) {
        const query = encodeURIComponent(input.value.trim());
        window.location.href = `/index.html?search=${query}#shop-section`;
      }
    });
  });
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  syncNavState();
  updateCartBadge();
  setupMobileDrawer();
  setupHeaderSearch();

  // Listen to auth changes
  window.addEventListener('auth-changed', () => {
    syncNavState();
    updateCartBadge();
  });

  window.addEventListener('cart-updated', () => {
    updateCartBadge();
  });

  window.addEventListener('session-expired', () => {
    showToast('Session Expired', 'Please sign in to continue.', 'error');
  });
});

