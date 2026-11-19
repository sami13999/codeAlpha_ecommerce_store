/**
 * Customer Dossier Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  const pathParts = window.location.pathname.split('/');
  let custId = pathParts[pathParts.length - 1];
  if (!custId || isNaN(parseInt(custId, 10))) {
    const params = new URLSearchParams(window.location.search);
    custId = params.get('id');
  }

  if (!custId) {
    AdminToast.error('Customer ID missing');
    setTimeout(() => { window.location.href = '/admin/customers'; }, 1000);
    return;
  }

  let customerData = null;

  await loadCustomerDossier(custId);

  const statusBtn = document.getElementById('btn-toggle-customer-status');
  statusBtn.addEventListener('click', () => {
    if (!customerData) return;
    const isBlocked = customerData.status === 'BLOCKED';
    const nextStatus = isBlocked ? 'ACTIVE' : 'BLOCKED';

    AdminConfirm.show({
      title: `${isBlocked ? 'Unblock' : 'Block'} Customer?`,
      message: `Set status of this user account to ${nextStatus}?`,
      confirmText: `${isBlocked ? 'Unblock' : 'Block'} Account`,
      confirmVariant: isBlocked ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          const res = await AdminAPI.request(`/api/admin/customers/${custId}/status`, {
            method: 'PATCH',
            body: { status: nextStatus }
          });
          AdminToast.success(res.message || 'Status updated');
          await loadCustomerDossier(custId);
        } catch (err) {
          AdminToast.error(err.message || 'Failed to update customer status');
        }
      }
    });
  });

  async function loadCustomerDossier(id) {
    try {
      const res = await AdminAPI.request(`/api/admin/customers/${id}`);
      if (!res.success || !res.data) throw new Error('Customer not found');

      customerData = res.data;
      renderDossier(customerData);
    } catch (err) {
      AdminToast.error(err.message || 'Failed to load customer profile');
    }
  }

  function renderDossier(d) {
    const fullName = `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Anonymous User';
    document.getElementById('cust-name-header').textContent = fullName;
    document.getElementById('cust-crumb-name').textContent = fullName;
    document.getElementById('cust-joined-date').textContent = `Customer registered on ${AdminAPI.formatDate(d.created_at, false)}`;

    const statusBadge = document.getElementById('cust-status-badge');
    statusBadge.className = `admin-badge ${AdminAPI.getBadgeClass(d.status)}`;
    statusBadge.textContent = d.status;

    document.getElementById('cust-role-badge').textContent = d.role;

    // Toggle button style
    const isBlocked = d.status === 'BLOCKED';
    statusBtn.textContent = isBlocked ? 'Unblock Account' : 'Block Account';
    statusBtn.className = `admin-btn ${isBlocked ? 'admin-btn-outline' : 'admin-btn-danger'}`;

    // Metrics
    const totalSpent = parseFloat(d.metrics?.total_spent || 0);
    const orderCount = parseInt(d.metrics?.order_count || 0, 10);
    const aov = orderCount > 0 ? totalSpent / orderCount : 0;

    document.getElementById('metric-cust-spend').textContent = AdminAPI.formatCurrency(totalSpent);
    document.getElementById('metric-cust-orders').textContent = orderCount;
    document.getElementById('metric-cust-aov').textContent = AdminAPI.formatCurrency(aov);

    // Contact Box
    document.getElementById('cust-contact-box').innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: var(--admin-font-sm);">
        <div><strong>Email:</strong> <a href="mailto:${d.email}" style="color: var(--admin-primary);">${d.email}</a></div>
        <div><strong>Phone:</strong> ${d.phone || '<span style="color: var(--admin-text-muted);">None provided</span>'}</div>
        <div><strong>Account Status:</strong> ${d.status}</div>
        <div><strong>Last Updated:</strong> ${AdminAPI.formatDate(d.updated_at, true)}</div>
      </div>
    `;

    // Addresses
    const addrBox = document.getElementById('cust-addresses-box');
    const addresses = d.addresses || [];
    if (addresses.length === 0) {
      addrBox.innerHTML = '<span style="color: var(--admin-text-muted); font-size: var(--admin-font-sm);">No saved addresses on file.</span>';
    } else {
      let addrHtml = '<div style="display: flex; flex-direction: column; gap: 12px;">';
      addresses.forEach(a => {
        addrHtml += `
          <div style="background: var(--admin-bg-surface-elevated); padding: 12px; border-radius: var(--admin-radius-sm); border: 1px solid var(--admin-border-subtle); font-size: var(--admin-font-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong>${a.full_name || fullName}</strong>
              ${a.is_default ? '<span class="admin-badge badge-primary">Default</span>' : ''}
            </div>
            <div style="color: var(--admin-text-secondary); line-height: 1.5;">
              ${a.street_address} ${a.apartment ? `, ${a.apartment}` : ''}<br>
              ${a.city}, ${a.state || ''} ${a.postal_code || ''}<br>
              ${a.country} ${a.phone ? `• ${a.phone}` : ''}
            </div>
          </div>
        `;
      });
      addrHtml += '</div>';
      addrBox.innerHTML = addrHtml;
    }

    // Orders History Table
    const ordersTbody = document.getElementById('cust-orders-tbody');
    const orders = d.orders || [];
    if (orders.length === 0) {
      ordersTbody.innerHTML = DataTableUtils.getEmptyRowHtml(6, 'No Orders Yet', 'This customer has not placed any orders.');
    } else {
      let oHtml = '';
      orders.forEach(o => {
        const orderBadge = AdminAPI.getBadgeClass(o.order_status);
        const payBadge = AdminAPI.getBadgeClass(o.payment_status);

        oHtml += `
          <tr>
            <td>
              <a href="/admin/orders/${o.id}" style="font-family: var(--admin-font-mono); font-weight: 600; color: var(--admin-primary);">
                ${o.order_number}
              </a>
            </td>
            <td style="font-size: var(--admin-font-xs); color: var(--admin-text-secondary);">${AdminAPI.formatDate(o.created_at)}</td>
            <td style="font-weight: 600;">${AdminAPI.formatCurrency(o.total_amount)}</td>
            <td><span class="admin-badge ${payBadge}">${o.payment_status}</span></td>
            <td><span class="admin-badge ${orderBadge}">${o.order_status}</span></td>
            <td style="text-align: right;">
              <a href="/admin/orders/${o.id}" class="admin-btn admin-btn-xs admin-btn-outline">View &rarr;</a>
            </td>
          </tr>
        `;
      });
      ordersTbody.innerHTML = oHtml;
    }
  }
});
