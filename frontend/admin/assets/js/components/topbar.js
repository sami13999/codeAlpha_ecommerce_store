/**
 * Admin Topbar Component
 * E-Commerce Store Administration System
 */

const AdminTopbar = (() => {
  function init() {
    const user = AdminAPI.getUser();
    
    // Update user display
    const userNameEl = document.getElementById('topbar-admin-name');
    const userAvatarEl = document.getElementById('topbar-admin-avatar');
    
    if (user) {
      if (userNameEl) {
        userNameEl.textContent = `${user.first_name || 'Admin'} ${user.last_name || ''}`.trim();
      }
      if (userAvatarEl) {
        const initials = ((user.first_name?.[0] || 'A') + (user.last_name?.[0] || '')).toUpperCase();
        userAvatarEl.textContent = initials;
      }
    }

    // Logout button handler
    const logoutBtn = document.getElementById('topbar-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        AdminConfirm.show({
          title: 'Sign Out',
          message: 'Are you sure you want to sign out of the Admin Dashboard?',
          confirmText: 'Sign Out',
          confirmVariant: 'danger',
          onConfirm: () => {
            AdminAPI.clearAuth();
            window.location.href = '/admin/login';
          }
        });
      });
    }
  }

  return {
    init
  };
})();
