/**
 * Toast Notification System
 * E-Commerce Store Administration System
 */

const AdminToast = (() => {
  let container = null;

  function initContainer() {
    if (!container) {
      container = document.querySelector('.admin-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'admin-toast-container';
        document.body.appendChild(container);
      }
    }
  }

  function show(message, type = 'info', duration = 4000) {
    initContainer();

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    toast.innerHTML = `
      <span class="admin-toast-icon">${icons[type] || 'ℹ'}</span>
      <div class="admin-toast-content">
        <div class="admin-toast-msg">${message}</div>
      </div>
      <button class="admin-toast-close" aria-label="Close">&times;</button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.admin-toast-close');
    const dismiss = () => {
      toast.style.animation = 'slideOutRight 0.3s forwards cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    };

    closeBtn.addEventListener('click', dismiss);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
  }

  return {
    show,
    success: (msg, d) => show(msg, 'success', d),
    error: (msg, d) => show(msg, 'error', d || 5000),
    warning: (msg, d) => show(msg, 'warning', d),
    info: (msg, d) => show(msg, 'info', d)
  };
})();
