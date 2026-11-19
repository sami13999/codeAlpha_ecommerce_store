/**
 * Admin Sidebar Navigation Component
 * E-Commerce Store Administration System
 */

const AdminSidebar = (() => {
  const navItems = [
    { label: 'Dashboard', icon: '📊', path: '/admin/dashboard', key: 'dashboard' },
    { label: 'Products', icon: '📦', path: '/admin/products', key: 'products' },
    { label: 'Categories', icon: '🏷️', path: '/admin/categories', key: 'categories' },
    { label: 'Orders', icon: '🛍️', path: '/admin/orders', key: 'orders', badgeKey: 'orders' },
    { label: 'Customers', icon: '👥', path: '/admin/customers', key: 'customers' },
    { label: 'Inventory', icon: '📋', path: '/admin/inventory', key: 'inventory', badgeKey: 'inventory' },
    { label: 'Coupons', icon: '🎟️', path: '/admin/coupons', key: 'coupons' },
    { label: 'Reviews', icon: '⭐', path: '/admin/reviews', key: 'reviews', badgeKey: 'reviews' },
    { label: 'Newsletter', icon: '✉️', path: '/admin/newsletter', key: 'newsletter' },
    { label: 'Reports', icon: '📈', path: '/admin/reports', key: 'reports' },
    { label: 'Settings', icon: '⚙️', path: '/admin/settings', key: 'settings' }
  ];

  function render(containerId = 'admin-sidebar-nav') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentPath = window.location.pathname;

    let html = '';
    navItems.forEach(item => {
      const isActive = currentPath === item.path || 
                       (item.path !== '/admin/dashboard' && currentPath.startsWith(item.path));
      
      html += `
        <li class="admin-nav-item">
          <a href="${item.path}" class="admin-nav-link ${isActive ? 'active' : ''}" data-key="${item.key}">
            <span class="admin-nav-icon">${item.icon}</span>
            <span class="admin-nav-label">${item.label}</span>
            ${item.badgeKey ? `<span class="admin-nav-badge" id="nav-badge-${item.badgeKey}" style="display:none;"></span>` : ''}
          </a>
        </li>
      `;
    });

    container.innerHTML = html;
  }

  function initMobileToggle() {
    const toggleBtn = document.getElementById('mobile-sidebar-toggle');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-open');
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        document.body.classList.remove('sidebar-open');
      });
    }
  }

  async function updateBadges() {
    try {
      if (!AdminAPI.isAuthenticated()) return;
      const res = await AdminAPI.request('/api/admin/dashboard');
      if (res && res.success && res.data) {
        const { metrics } = res.data;
        if (metrics.pending_orders > 0) {
          const bOrders = document.getElementById('nav-badge-orders');
          if (bOrders) {
            bOrders.textContent = metrics.pending_orders;
            bOrders.style.display = 'inline-block';
          }
        }
        if (metrics.low_stock_items > 0) {
          const bInv = document.getElementById('nav-badge-inventory');
          if (bInv) {
            bInv.textContent = metrics.low_stock_items;
            bInv.style.display = 'inline-block';
            bInv.classList.add('badge-warning');
          }
        }
      }
    } catch (e) {
      // Non-critical badge loading failure silently ignored
    }
  }

  function init() {
    render();
    initMobileToggle();
    updateBadges();
  }

  return {
    init,
    render,
    updateBadges
  };
})();
