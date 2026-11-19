/**
 * Customers Directory Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  let currentPage = 1;
  const limit = 10;

  const searchInput = document.getElementById('customer-search');
  const statusSelect = document.getElementById('filter-customer-status');
  const resetBtn = document.getElementById('customer-reset-btn');

  await loadCustomers(1);

  searchInput.addEventListener('input', DataTableUtils.debounce(() => {
    currentPage = 1;
    loadCustomers(1);
  }, 350));

  statusSelect.addEventListener('change', () => { currentPage = 1; loadCustomers(1); });

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    statusSelect.value = '';
    currentPage = 1;
    loadCustomers(1);
  });

  async function loadCustomers(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('customers-tbody');
    tbody.innerHTML = DataTableUtils.getLoadingRowHtml(8, 'Loading customers...');

    const params = new URLSearchParams({ page, limit });
    if (searchInput.value.trim()) params.append('search', searchInput.value.trim());
    if (statusSelect.value) params.append('status', statusSelect.value);

    try {
      const res = await AdminAPI.request(`/api/admin/customers?${params.toString()}`);
      if (!res.success || !res.data) throw new Error('Failed to load customers');

      renderTable(res.data.customers);
      renderPagination(res.data.pagination);
    } catch (err) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(8, 'Error loading customers', err.message);
      AdminToast.error(err.message || 'Error loading customers');
    }
  }

  function renderTable(customers) {
    const tbody = document.getElementById('customers-tbody');
    if (!customers || customers.length === 0) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(8, 'No Customers Found', 'No records match your search.');
      return;
    }

    let html = '';
    customers.forEach(c => {
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Anonymous';
      const badgeCls = AdminAPI.getBadgeClass(c.status);
      const isBlocked = c.status === 'BLOCKED';

      html += `
        <tr>
          <td style="font-family: var(--admin-font-mono); color: var(--admin-text-muted);">${c.id}</td>
          <td>
            <div style="font-weight: 600; color: var(--admin-text-primary);">${name}</div>
            <div style="font-size: var(--admin-font-xs); color: var(--admin-text-muted);">Role: ${c.role}</div>
          </td>
          <td>
            <div style="font-size: var(--admin-font-sm);">${c.email}</div>
            ${c.phone ? `<div style="font-size: var(--admin-font-xs); color: var(--admin-text-muted);">${c.phone}</div>` : ''}
          </td>
          <td style="font-size: var(--admin-font-xs); color: var(--admin-text-secondary);">
            ${AdminAPI.formatDate(c.created_at, false)}
          </td>
          <td>
            <span class="admin-badge ${c.order_count > 0 ? 'badge-primary' : 'badge-neutral'}">
              ${c.order_count} orders
            </span>
          </td>
          <td style="font-weight: 600; color: var(--admin-text-primary);">
            ${AdminAPI.formatCurrency(c.total_spent || 0)}
          </td>
          <td>
            <span class="admin-badge ${badgeCls}">${c.status}</span>
          </td>
          <td style="text-align: right;">
            <div class="admin-action-group">
              <a href="/admin/customers/${c.id}" class="admin-btn admin-btn-xs admin-btn-outline">
                Dossier &rarr;
              </a>
              <button class="admin-btn admin-btn-xs ${isBlocked ? 'admin-btn-outline' : 'admin-btn-danger'} toggle-block-btn" 
                      data-id="${c.id}" 
                      data-name="${name}" 
                      data-status="${c.status}">
                ${isBlocked ? 'Unblock' : 'Block'}
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Attach Block / Unblock Handlers
    tbody.querySelectorAll('.toggle-block-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const currentStatus = btn.dataset.status;
        const nextStatus = currentStatus === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';

        AdminConfirm.show({
          title: `${nextStatus === 'BLOCKED' ? 'Block' : 'Activate'} Customer Account?`,
          message: `Are you sure you want to set status of "${name}" to ${nextStatus}? ${nextStatus === 'BLOCKED' ? 'They will not be able to log in or place orders.' : 'Their account access will be restored.'}`,
          confirmText: nextStatus === 'BLOCKED' ? 'Block Account' : 'Activate Account',
          confirmVariant: nextStatus === 'BLOCKED' ? 'danger' : 'primary',
          onConfirm: async () => {
            try {
              const res = await AdminAPI.request(`/api/admin/customers/${id}/status`, {
                method: 'PATCH',
                body: { status: nextStatus }
              });
              AdminToast.success(res.message || `Customer marked as ${nextStatus}`);
              loadCustomers(currentPage);
            } catch (err) {
              AdminToast.error(err.message || 'Failed to update customer status');
            }
          }
        });
      });
    });
  }

  function renderPagination(pagination) {
    const container = document.getElementById('customers-pagination-container');
    container.innerHTML = '';
    const el = DataTableUtils.renderPagination(pagination, (newPage) => {
      loadCustomers(newPage);
    });
    if (el) container.appendChild(el);
  }
});
