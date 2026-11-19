/**
 * Confirmation Dialog Component
 * E-Commerce Store Administration System
 */

const AdminConfirm = (() => {
  let modal = null;

  function initModal() {
    if (!modal) {
      modal = document.getElementById('admin-confirm-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'admin-confirm-modal';
        modal.className = 'admin-modal-backdrop';
        modal.innerHTML = `
          <div class="admin-modal-dialog">
            <div class="admin-modal-header">
              <h3 class="admin-modal-title" id="confirm-modal-title">Confirm Action</h3>
              <button class="admin-modal-close" id="confirm-modal-close">&times;</button>
            </div>
            <div class="admin-modal-body" id="confirm-modal-body">
              Are you sure you want to proceed?
            </div>
            <div class="admin-modal-footer">
              <button class="admin-btn admin-btn-outline" id="confirm-modal-cancel">Cancel</button>
              <button class="admin-btn admin-btn-danger" id="confirm-modal-ok">Confirm</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }
    }
  }

  function show({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed with this action?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'danger', // 'danger' | 'primary' | 'warning'
    onConfirm = () => {},
    onCancel = () => {}
  }) {
    initModal();

    const titleEl = document.getElementById('confirm-modal-title');
    const bodyEl = document.getElementById('confirm-modal-body');
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const closeBtn = document.getElementById('confirm-modal-close');

    titleEl.textContent = title;
    bodyEl.innerHTML = typeof message === 'string' ? `<p>${message}</p>` : '';
    if (typeof message !== 'string') {
      bodyEl.innerHTML = '';
      bodyEl.appendChild(message);
    }

    okBtn.textContent = confirmText;
    okBtn.className = `admin-btn admin-btn-${confirmVariant}`;
    cancelBtn.textContent = cancelText;

    modal.classList.add('active');

    function cleanup() {
      modal.classList.remove('active');
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
      closeBtn.removeEventListener('click', handleCancel);
      modal.removeEventListener('click', handleBackdrop);
    }

    function handleOk() {
      cleanup();
      onConfirm();
    }

    function handleCancel() {
      cleanup();
      onCancel();
    }

    function handleBackdrop(e) {
      if (e.target === modal) {
        handleCancel();
      }
    }

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    closeBtn.addEventListener('click', handleCancel);
    modal.addEventListener('click', handleBackdrop);
  }

  return {
    show
  };
})();
