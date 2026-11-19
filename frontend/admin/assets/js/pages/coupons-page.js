/**
 * Coupons Management Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  let currentPage = 1;
  const limit = 10;
  let couponsList = [];

  const tbody = document.getElementById('coupons-tbody');
  const modal = document.getElementById('coupon-modal');
  const modalTitle = document.getElementById('coupon-modal-title');
  const form = document.getElementById('coupon-form');
  const openModalBtn = document.getElementById('open-coupon-modal-btn');
  const modalClose = document.getElementById('coupon-modal-close');
  const modalCancel = document.getElementById('coupon-modal-cancel');

  const idInput = document.getElementById('coupon-id');
  const codeInput = document.getElementById('coupon-code');
  const typeSelect = document.getElementById('coupon-type');
  const valueInput = document.getElementById('coupon-value');
  const minOrderInput = document.getElementById('coupon-min-order');
  const maxDiscountInput = document.getElementById('coupon-max-discount');
  const maxUsesInput = document.getElementById('coupon-max-uses');
  const startInput = document.getElementById('coupon-start-date');
  const endInput = document.getElementById('coupon-end-date');
  const activeInput = document.getElementById('coupon-active');

  openModalBtn.addEventListener('click', openCreateModal);
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  await loadCoupons(1);

  async function loadCoupons(page = 1) {
    currentPage = page;
    tbody.innerHTML = DataTableUtils.getLoadingRowHtml(7, 'Loading coupons...');

    try {
      const res = await AdminAPI.request(`/api/admin/coupons?page=${page}&limit=${limit}`);
      if (!res.success || !res.data) throw new Error('Failed to load coupons');

      couponsList = res.data.coupons;
      renderTable(couponsList);
      renderPagination(res.data.pagination);
    } catch (err) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(7, 'Error loading coupons', err.message);
      AdminToast.error(err.message || 'Error loading coupons');
    }
  }

  function renderTable(coupons) {
    if (!coupons || coupons.length === 0) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(7, 'No Coupons Found', 'Create your first discount coupon above.');
      return;
    }

    let html = '';
    coupons.forEach(c => {
      const isPercent = c.discount_type === 'PERCENTAGE';
      const discountFormatted = isPercent ? `${parseFloat(c.discount_value)}% OFF` : `${AdminAPI.formatCurrency(c.discount_value)} OFF`;

      const usageTxt = c.usage_limit_total ? `${c.times_used || 0} / ${c.usage_limit_total}` : `${c.times_used || 0} (Unlimited)`;

      let windowTxt = 'Always Valid';
      if (c.start_date || c.end_date) {
        windowTxt = `${c.start_date ? AdminAPI.formatDate(c.start_date, false) : 'Anytime'} &rarr; ${c.end_date ? AdminAPI.formatDate(c.end_date, false) : 'No expiry'}`;
      }

      html += `
        <tr>
          <td>
            <code style="font-size: var(--admin-font-sm); font-weight: 700; color: var(--admin-primary); background: rgba(79, 70, 229, 0.1); padding: 4px 8px; border-radius: 4px;">
              ${c.code}
            </code>
          </td>
          <td>
            <div style="font-weight: 600;">${discountFormatted}</div>
            <div style="font-size: var(--admin-font-xs); color: var(--admin-text-muted);">${c.discount_type}</div>
          </td>
          <td>
            ${c.min_order_amount > 0 ? AdminAPI.formatCurrency(c.min_order_amount) : '<span style="color: var(--admin-text-muted);">None</span>'}
          </td>
          <td>
            <span style="font-family: var(--admin-font-mono); font-size: var(--admin-font-xs);">${usageTxt}</span>
          </td>
          <td style="font-size: var(--admin-font-xs); color: var(--admin-text-secondary);">
            ${windowTxt}
          </td>
          <td>
            <button class="admin-badge ${c.is_active ? 'badge-success' : 'badge-neutral'} toggle-coupon-btn" 
                    data-id="${c.id}" 
                    style="cursor: pointer; border: none;">
              ${c.is_active ? 'Active' : 'Inactive'}
            </button>
          </td>
          <td style="text-align: right;">
            <button class="admin-btn admin-btn-xs admin-btn-outline edit-coupon-btn" data-id="${c.id}">
              ✏️ Edit
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Toggle status
    tbody.querySelectorAll('.toggle-coupon-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          const res = await AdminAPI.request(`/api/admin/coupons/${id}/toggle-status`, { method: 'PATCH' });
          AdminToast.success(res.message || 'Coupon status updated');
          loadCoupons(currentPage);
        } catch (e) {
          AdminToast.error(e.message || 'Failed to toggle status');
        }
      });
    });

    // Edit button
    tbody.querySelectorAll('.edit-coupon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const coupon = couponsList.find(c => c.id === id);
        if (coupon) openEditModal(coupon);
      });
    });
  }

  function renderPagination(pagination) {
    const container = document.getElementById('coupons-pagination-container');
    container.innerHTML = '';
    const el = DataTableUtils.renderPagination(pagination, (newPage) => {
      loadCoupons(newPage);
    });
    if (el) container.appendChild(el);
  }

  function openCreateModal() {
    modalTitle.textContent = 'Create Discount Coupon';
    idInput.value = '';
    codeInput.value = '';
    codeInput.disabled = false;
    typeSelect.value = 'PERCENTAGE';
    valueInput.value = '';
    minOrderInput.value = '0';
    maxDiscountInput.value = '';
    maxUsesInput.value = '';
    startInput.value = '';
    endInput.value = '';
    activeInput.checked = true;
    modal.classList.add('active');
  }

  function openEditModal(c) {
    modalTitle.textContent = `Edit Coupon: ${c.code}`;
    idInput.value = c.id;
    codeInput.value = c.code;
    codeInput.disabled = true; // Codes shouldn't be altered once referenced
    typeSelect.value = c.discount_type;
    valueInput.value = c.discount_value;
    minOrderInput.value = c.min_order_amount || 0;
    maxDiscountInput.value = c.max_discount_amount || '';
    maxUsesInput.value = c.usage_limit_total || '';
    startInput.value = c.start_date ? c.start_date.substring(0, 10) : '';
    endInput.value = c.end_date ? c.end_date.substring(0, 10) : '';
    activeInput.checked = !!c.is_active;
    modal.classList.add('active');
  }

  function closeModal() {
    modal.classList.remove('active');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = idInput.value;
    const code = codeInput.value.trim().toUpperCase();
    const discount_type = typeSelect.value;
    const discount_value = parseFloat(valueInput.value);

    if (!code) {
      AdminToast.error('Please enter a coupon code');
      return;
    }
    if (isNaN(discount_value) || discount_value <= 0) {
      AdminToast.error('Please enter a valid discount value');
      return;
    }

    const payload = {
      code,
      discount_type,
      discount_value,
      min_order_amount: minOrderInput.value ? parseFloat(minOrderInput.value) : 0,
      max_discount_amount: maxDiscountInput.value ? parseFloat(maxDiscountInput.value) : null,
      usage_limit_total: maxUsesInput.value ? parseInt(maxUsesInput.value, 10) : null,
      start_date: startInput.value || null,
      end_date: endInput.value || null,
      is_active: activeInput.checked ? 1 : 0
    };

    try {
      const endpoint = id ? `/api/admin/coupons/${id}` : '/api/admin/coupons';
      const method = id ? 'PUT' : 'POST';

      const res = await AdminAPI.request(endpoint, {
        method,
        body: payload
      });

      AdminToast.success(res.message || 'Coupon saved successfully');
      closeModal();
      loadCoupons(currentPage);
    } catch (err) {
      AdminToast.error(err.message || 'Failed to save coupon');
    }
  });
});
