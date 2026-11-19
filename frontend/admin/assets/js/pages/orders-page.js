/**
 * Orders Management Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  let currentPage = 1;
  const limit = 10;

  const searchInput = document.getElementById('order-search');
  const orderStatusSelect = document.getElementById('filter-order-status');
  const paymentStatusSelect = document.getElementById('filter-payment-status');
  const resetBtn = document.getElementById('order-reset-btn');

  // Check URL query parameters (e.g. from dashboard click)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('status')) {
    orderStatusSelect.value = urlParams.get('status');
  }

  await loadOrders(1);

  searchInput.addEventListener('input', DataTableUtils.debounce(() => {
    currentPage = 1;
    loadOrders(1);
  }, 350));

  orderStatusSelect.addEventListener('change', () => { currentPage = 1; loadOrders(1); });
  paymentStatusSelect.addEventListener('change', () => { currentPage = 1; loadOrders(1); });

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    orderStatusSelect.value = '';
    paymentStatusSelect.value = '';
    currentPage = 1;
    loadOrders(1);
  });

  async function loadOrders(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('orders-tbody');
    tbody.innerHTML = DataTableUtils.getLoadingRowHtml(7, 'Loading orders...');

    const params = new URLSearchParams({ page, limit });
    if (searchInput.value.trim()) params.append('search', searchInput.value.trim());
    if (orderStatusSelect.value) params.append('order_status', orderStatusSelect.value);
    if (paymentStatusSelect.value) params.append('payment_status', paymentStatusSelect.value);

    try {
      const res = await AdminAPI.request(`/api/admin/orders?${params.toString()}`);
      if (!res.success || !res.data) throw new Error('Failed to load orders');

      renderTable(res.data.orders);
      renderPagination(res.data.pagination);
    } catch (err) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(7, 'Error loading orders', err.message);
      AdminToast.error(err.message || 'Error loading orders');
    }
  }

  function renderTable(orders) {
    const tbody = document.getElementById('orders-tbody');
    if (!orders || orders.length === 0) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(7, 'No Orders Found', 'Try adjusting your search criteria.');
      return;
    }

    let html = '';
    orders.forEach(o => {
      const custName = o.first_name ? `${o.first_name} ${o.last_name || ''}`.trim() : (o.email || 'Customer');
      const orderBadge = AdminAPI.getBadgeClass(o.order_status);
      const payBadge = AdminAPI.getBadgeClass(o.payment_status);

      html += `
        <tr>
          <td>
            <a href="/admin/orders/${o.id}" style="font-family: var(--admin-font-mono); font-weight: 700; color: var(--admin-primary);">
              ${o.order_number}
            </a>
          </td>
          <td>
            <div style="font-weight: 600;">${custName}</div>
            <div style="font-size: var(--admin-font-xs); color: var(--admin-text-muted);">${o.email || ''}</div>
          </td>
          <td style="font-size: var(--admin-font-xs); color: var(--admin-text-secondary);">
            ${AdminAPI.formatDate(o.created_at)}
          </td>
          <td>
            <div style="font-weight: 700; color: var(--admin-text-primary);">
              ${AdminAPI.formatCurrency(o.total_amount)}
            </div>
          </td>
          <td>
            <div><span class="admin-badge ${payBadge}">${o.payment_status}</span></div>
            <div style="font-size: 10px; color: var(--admin-text-muted); margin-top: 2px;">Cash on Delivery</div>
          </td>
          <td>
            <span class="admin-badge ${orderBadge}">${o.order_status}</span>
          </td>
          <td style="text-align: right;">
            <a href="/admin/orders/${o.id}" class="admin-btn admin-btn-xs admin-btn-outline">
              Manage &rarr;
            </a>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  function renderPagination(pagination) {
    const container = document.getElementById('orders-pagination-container');
    container.innerHTML = '';
    const el = DataTableUtils.renderPagination(pagination, (newPage) => {
      loadOrders(newPage);
    });
    if (el) container.appendChild(el);
  }
});
