/**
 * Order Details Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  // Extract Order ID from path /admin/orders/:id
  const pathParts = window.location.pathname.split('/');
  let orderId = pathParts[pathParts.length - 1];
  if (!orderId || isNaN(parseInt(orderId, 10))) {
    const params = new URLSearchParams(window.location.search);
    orderId = params.get('id');
  }

  if (!orderId) {
    AdminToast.error('No order ID provided');
    setTimeout(() => { window.location.href = '/admin/orders'; }, 1000);
    return;
  }

  let orderData = null;

  await loadOrderDetails(orderId);

  // Status transition button
  const statusBtn = document.getElementById('btn-update-order-status');
  const statusSelect = document.getElementById('update-order-status-select');
  statusBtn.addEventListener('click', () => {
    const newStatus = statusSelect.value;
    if (newStatus === orderData.order_status) {
      AdminToast.info(`Order is already marked as ${newStatus}.`);
      return;
    }

    if (newStatus === 'CANCELLED' || newStatus === 'RETURNED') {
      AdminConfirm.show({
        title: `Transition to ${newStatus}?`,
        message: `Setting this order to ${newStatus} will automatically restore the product stock quantities in the catalog and record an immutable audit entry in the inventory movements log. Do you want to proceed?`,
        confirmText: `Confirm ${newStatus}`,
        confirmVariant: 'danger',
        onConfirm: () => performStatusUpdate(orderId, newStatus)
      });
    } else {
      performStatusUpdate(orderId, newStatus);
    }
  });

  // Payment status update button
  const payBtn = document.getElementById('btn-update-payment-status');
  const paySelect = document.getElementById('update-payment-status-select');
  payBtn.addEventListener('click', async () => {
    const newPayStatus = paySelect.value;
    if (newPayStatus === orderData.payment_status) {
      AdminToast.info(`Payment status is already ${newPayStatus}.`);
      return;
    }

    try {
      const res = await AdminAPI.request(`/api/admin/orders/${orderId}/payment-status`, {
        method: 'PATCH',
        body: { payment_status: newPayStatus }
      });
      AdminToast.success(res.message || 'Payment status updated');
      await loadOrderDetails(orderId);
    } catch (err) {
      AdminToast.error(err.message || 'Failed to update payment status');
    }
  });

  async function performStatusUpdate(id, status) {
    try {
      const res = await AdminAPI.request(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: { order_status: status }
      });
      AdminToast.success(res.message || 'Order status updated successfully');
      await loadOrderDetails(id);
    } catch (err) {
      AdminToast.error(err.message || 'Failed to update order status');
    }
  }

  async function loadOrderDetails(id) {
    try {
      const res = await AdminAPI.request(`/api/admin/orders/${id}`);
      if (!res.success || !res.data) throw new Error('Order not found');

      orderData = res.data;
      renderOrder(orderData);
    } catch (err) {
      AdminToast.error(err.message || 'Error loading order');
    }
  }

  function renderOrder(o) {
    document.getElementById('order-title').textContent = `Order ${o.order_number}`;
    document.getElementById('order-crumb-num').textContent = o.order_number;
    document.getElementById('order-placed-date').textContent = `Placed on ${AdminAPI.formatDate(o.created_at, true)}`;

    // Badges
    const statusBadge = document.getElementById('order-status-badge');
    statusBadge.className = `admin-badge ${AdminAPI.getBadgeClass(o.order_status)}`;
    statusBadge.textContent = o.order_status;

    const payBadge = document.getElementById('order-payment-badge');
    payBadge.className = `admin-badge ${AdminAPI.getBadgeClass(o.payment_status)}`;
    payBadge.textContent = o.payment_status;

    // Select dropdowns current value
    statusSelect.value = o.order_status;
    paySelect.value = o.payment_status;

    // Notes
    const notesEl = document.getElementById('order-notes');
    notesEl.textContent = o.notes ? `"${o.notes}"` : 'No customer instructions or notes provided.';

    // Items
    const items = o.items || [];
    document.getElementById('items-count').textContent = items.length;
    const tbody = document.getElementById('order-items-tbody');

    let html = '';
    items.forEach(item => {
      const img = item.image_url || '/assets/images/placeholder-product.svg';
      html += `
        <tr>
          <td>
            <img src="${img}" alt="${item.product_title}" class="admin-table-thumb" onerror="this.src='/assets/images/placeholder-product.svg'">
          </td>
          <td>
            <div style="font-weight: 600; color: var(--admin-text-primary);">${item.product_title}</div>
            <div style="font-size: var(--admin-font-xs); color: var(--admin-text-muted);">ID: ${item.product_id}</div>
          </td>
          <td style="font-family: var(--admin-font-mono); font-size: var(--admin-font-xs);">${item.sku || '—'}</td>
          <td>${AdminAPI.formatCurrency(item.unit_price)}</td>
          <td style="font-weight: 600;">&times; ${item.quantity}</td>
          <td style="text-align: right; font-weight: 600;">${AdminAPI.formatCurrency(item.total_price)}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;

    // Summaries
    document.getElementById('summary-subtotal').textContent = AdminAPI.formatCurrency(o.subtotal);
    document.getElementById('summary-shipping').textContent = AdminAPI.formatCurrency(o.shipping_fee);
    document.getElementById('summary-discount').textContent = o.discount_amount > 0 ? `- ${AdminAPI.formatCurrency(o.discount_amount)}` : '$0.00';
    document.getElementById('summary-tax').textContent = AdminAPI.formatCurrency(o.tax_amount || 0);
    document.getElementById('summary-total').textContent = AdminAPI.formatCurrency(o.total_amount);

    // Customer Info Card
    const custBox = document.getElementById('customer-info-box');
    const custName = o.first_name ? `${o.first_name} ${o.last_name || ''}`.trim() : 'Customer';
    custBox.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="font-weight: 600; font-size: var(--admin-font-base);">${custName}</div>
        <div style="font-size: var(--admin-font-sm); color: var(--admin-text-secondary);">
          📧 <a href="mailto:${o.email}" style="color: var(--admin-primary);">${o.email}</a>
        </div>
        ${o.phone ? `<div style="font-size: var(--admin-font-sm); color: var(--admin-text-secondary);">📞 ${o.phone}</div>` : ''}
        <div style="margin-top: 6px;">
          <a href="/admin/customers/${o.user_id}" class="admin-btn admin-btn-xs admin-btn-outline">
            View Customer Dossier &rarr;
          </a>
        </div>
      </div>
    `;

    // Shipping Address Card
    const shipBox = document.getElementById('shipping-address-box');
    if (o.shipping_address) {
      const sa = o.shipping_address;
      shipBox.innerHTML = `
        <div style="font-size: var(--admin-font-sm); line-height: 1.6; color: var(--admin-text-secondary);">
          <strong style="color: var(--admin-text-primary); font-size: var(--admin-font-base);">${sa.full_name || custName}</strong><br>
          ${sa.street_address || ''} ${sa.apartment ? `, ${sa.apartment}` : ''}<br>
          ${sa.city || ''}${sa.state ? `, ${sa.state}` : ''} ${sa.postal_code || ''}<br>
          ${sa.country || ''}<br>
          ${sa.phone ? `Phone: ${sa.phone}` : ''}
        </div>
      `;
    } else {
      shipBox.innerHTML = '<span style="color: var(--admin-text-muted); font-size: var(--admin-font-sm);">No shipping address record attached.</span>';
    }
  }
});
