/**
 * MAISON & CO. — CUSTOMER ACCOUNT & PROFILE SCRIPT
 */

// Guard account pages
function requireAuth() {
  if (!window.api.isAuthenticated()) {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return false;
  }
  return true;
}

// 1. Account Dashboard (/account)
async function initAccountDashboard() {
  const container = document.getElementById('account-dashboard-view');
  if (!container || !requireAuth()) return;

  try {
    const res = await window.api.get('/users/profile');
    if (res.success && res.data) {
      const u = res.data;
      document.getElementById('acc-user-name').textContent = u.full_name;
      document.getElementById('acc-user-email').textContent = u.email;
      document.getElementById('acc-user-phone').textContent = u.phone || 'No phone registered';
      document.getElementById('acc-orders-count').textContent = u.orders_count || 0;

      const addrEl = document.getElementById('acc-default-address');
      if (addrEl) {
        if (u.default_address) {
          const a = u.default_address;
          addrEl.innerHTML = `
            <strong>${escapeHTML(a.full_name)}</strong><br/>
            ${escapeHTML(a.address_line1)}<br/>
            ${a.address_line2 ? `${escapeHTML(a.address_line2)}<br/>` : ''}
            ${escapeHTML(a.city)}, ${escapeHTML(a.country)}<br/>
            Phone: ${escapeHTML(a.phone)}
          `;
        } else {
          addrEl.innerHTML = `<span style="color:var(--text-muted);">No default address saved. <a href="/account/addresses" style="text-decoration:underline;">Add an address</a>.</span>`;
        }
      }
    }
  } catch (err) {
    showToast('Profile Error', err.message, 'error');
  }
}

// 2. Orders History (/account/orders)
async function initOrdersHistoryPage() {
  const container = document.getElementById('account-orders-list');
  if (!container || !requireAuth()) return;

  container.innerHTML = `<div class="skeleton" style="height: 250px;"></div>`;

  try {
    const res = await window.api.get('/orders');
    if (res.success && res.data) {
      const orders = res.data;
      if (orders.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <h3 class="empty-state-title">No Acquisitions Yet</h3>
            <p class="empty-state-desc">You have not completed any orders yet.</p>
            <a href="/shop" class="btn btn-primary">Browse Catalog</a>
          </div>
        `;
        return;
      }

      container.innerHTML = orders.map(ord => {
        let statusColor = '#B45309'; // Pending amber
        if (ord.order_status === 'DELIVERED') statusColor = '#15803D';
        if (ord.order_status === 'CANCELLED') statusColor = '#B91C1C';

        return `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.5rem 2rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.4rem;">
                <strong style="font-family: monospace; font-size: 1.1rem;">${escapeHTML(ord.order_number)}</strong>
                <span class="badge" style="background: ${statusColor}18; color: ${statusColor};">
                  ${escapeHTML(ord.order_status)}
                </span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">
                Placed on ${new Date(ord.created_at).toLocaleDateString()} • ${ord.item_count} artifact(s) • COD (${escapeHTML(ord.payment_status)})
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 1.5rem;">
              <div style="text-align: right;">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Total</div>
                <div style="font-size: 1.2rem; font-weight: 700; color: var(--accent);">
                  Rs. ${parseFloat(ord.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div style="display: flex; gap: 0.5rem;">
                <a href="/account/orders/${encodeURIComponent(ord.order_number)}" class="btn btn-outline btn-sm">
                  View Details
                </a>
                ${ord.order_status === 'PENDING' ? `
                  <button class="btn btn-sm cancel-order-btn" data-order-id="${ord.id}" style="color: var(--error); border-color: rgba(185,28,28,0.3);">
                    Cancel
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.cancel-order-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const ordId = btn.getAttribute('data-order-id');
          if (confirm('Cancel this acquisition and restore inventory?')) {
            try {
              const cancelRes = await window.api.post(`/orders/${ordId}/cancel`);
              showToast('Order Cancelled', cancelRes.message, 'info');
              await initOrdersHistoryPage();
            } catch (err) {
              showToast('Error', err.message, 'error');
            }
          }
        });
      });
    }
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${escapeHTML(err.message)}</p></div>`;
  }
}

// 3. Order Details (/account/orders/:id)
async function initOrderDetailPage() {
  const container = document.getElementById('single-order-detail-view');
  if (!container || !requireAuth()) return;

  const segments = window.location.pathname.split('/').filter(Boolean);
  let orderId = segments[segments.length - 1];
  if (!orderId || orderId === 'order-details' || orderId === 'order-details.html') {
    orderId = new URLSearchParams(window.location.search).get('id');
  }

  if (!orderId) {
    container.innerHTML = `<div class="empty-state"><p>No order specified.</p><a href="/account/orders" class="btn btn-primary">Return to Orders</a></div>`;
    return;
  }

  container.innerHTML = `<div class="skeleton" style="height: 350px;"></div>`;

  try {
    const res = await window.api.get(`/orders/${encodeURIComponent(orderId)}`);
    if (res.success && res.data) {
      const ord = res.data;
      document.getElementById('ord-number-title').textContent = ord.order_number;

      container.innerHTML = `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 2.5rem; display: flex; flex-direction: column; gap: 2rem;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <span class="subheading-label">Acquisition Status</span>
              <h2 style="font-size: 1.5rem; margin-top: 0.25rem;">Status: <span style="color: var(--accent);">${escapeHTML(ord.order_status)}</span></h2>
              <div style="font-size: 0.85rem; color: var(--text-muted);">Placed on ${new Date(ord.created_at).toLocaleString()}</div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Payment</div>
              <strong>${escapeHTML(ord.payment_method)} (${escapeHTML(ord.payment_status)})</strong>
            </div>
          </div>

          <!-- Destination Card -->
          <div style="background: var(--bg-subtle); border-radius: var(--radius-sm); padding: 1.5rem; font-size: 0.95rem; line-height: 1.6;">
            <h4 style="font-size: 1rem; margin-bottom: 0.5rem; font-weight: 700;">Delivery Destination</h4>
            <strong>${escapeHTML(ord.shipping_name)}</strong> (${escapeHTML(ord.shipping_phone)})<br/>
            ${escapeHTML(ord.shipping_address_line1)}<br/>
            ${ord.shipping_address_line2 ? `${escapeHTML(ord.shipping_address_line2)}<br/>` : ''}
            ${escapeHTML(ord.shipping_city)}, ${escapeHTML(ord.shipping_country)}<br/>
            ${ord.customer_note ? `<div style="margin-top: 0.5rem; font-style: italic; color: var(--text-muted);">Note: "${escapeHTML(ord.customer_note)}"</div>` : ''}
          </div>

          <!-- Items list -->
          <div>
            <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Included Artifacts (${ord.items.length})</h4>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${ord.items.map(i => `
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
                  <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${escapeHTML(i.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80')}" alt="${escapeHTML(i.product_name)}" style="width: 50px; height: 50px; border-radius: var(--radius-xs); object-fit: cover;" />
                    <div>
                      <h5 style="font-size: 0.95rem; font-weight: 600;">${escapeHTML(i.product_name)}</h5>
                      <div style="font-size: 0.8rem; color: var(--text-muted);">SKU: ${escapeHTML(i.product_sku)} • Qty: ${i.quantity} × Rs. ${i.unit_price}</div>
                    </div>
                  </div>
                  <strong style="font-size: 1rem;">Rs. ${parseFloat(i.line_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Totals Breakdown -->
          <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.95rem; max-width: 320px; margin-left: auto; width: 100%; border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Subtotal</span>
              <span>Rs. ${parseFloat(ord.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            ${ord.discount_amount > 0 ? `
              <div style="display: flex; justify-content: space-between; color: var(--success);">
                <span>Discount</span>
                <span>-Rs. ${parseFloat(ord.discount_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Courier Transit</span>
              <span>${ord.delivery_fee == 0 ? 'Complimentary' : `Rs. ${parseFloat(ord.delivery_fee).toFixed(2)}`}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: 700; border-top: 1px solid var(--border-strong); padding-top: 0.75rem; margin-top: 0.25rem;">
              <span>Grand Total</span>
              <span style="color: var(--accent);">Rs. ${parseFloat(ord.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1.5rem; border-top: 1px solid var(--border-subtle);">
            <a href="/account/orders" class="btn btn-outline btn-sm">&larr; Back to Orders</a>
            ${ord.order_status === 'PENDING' ? `
              <button id="cancel-single-order-btn" class="btn btn-outline btn-sm" style="color: var(--error);">
                Cancel Acquisition
              </button>
            ` : ''}
          </div>

        </div>
      `;

      const cancelBtn = document.getElementById('cancel-single-order-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
          if (confirm('Are you sure you want to cancel this order?')) {
            try {
              await window.api.post(`/orders/${ord.id}/cancel`);
              showToast('Order Cancelled', 'The order was cancelled.', 'info');
              await initOrderDetailPage();
            } catch (err) {
              showToast('Error', err.message, 'error');
            }
          }
        });
      }
    }
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${escapeHTML(err.message)}</p></div>`;
  }
}

// 4. Address Book (/account/addresses)
async function initAddressesPage() {
  const container = document.getElementById('account-addresses-grid');
  const formModal = document.getElementById('address-modal');
  const addBtn = document.getElementById('open-add-address-btn');
  const form = document.getElementById('address-form');

  if (!container || !requireAuth()) return;

  await loadAddresses();

  if (addBtn && formModal) {
    addBtn.addEventListener('click', () => {
      form.reset();
      document.getElementById('address-form-id').value = '';
      document.getElementById('address-modal-title').textContent = 'Add New Delivery Address';
      formModal.style.display = 'flex';
    });
  }

  const closeModal = document.getElementById('close-address-modal');
  if (closeModal && formModal) {
    closeModal.addEventListener('click', () => {
      formModal.style.display = 'none';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const addrId = document.getElementById('address-form-id').value;
      const payload = {
        full_name: document.getElementById('addr_full_name').value.trim(),
        phone: document.getElementById('addr_phone').value.trim(),
        address_line1: document.getElementById('addr_line1').value.trim(),
        address_line2: document.getElementById('addr_line2').value.trim() || null,
        city: document.getElementById('addr_city').value.trim(),
        state: document.getElementById('addr_state').value.trim() || null,
        postal_code: document.getElementById('addr_postal').value.trim() || null,
        country: 'Pakistan',
        is_default: document.getElementById('addr_is_default').checked ? 1 : 0
      };

      try {
        if (addrId) {
          await window.api.put(`/addresses/${addrId}`, payload);
          showToast('Updated', 'Address updated successfully.', 'success');
        } else {
          await window.api.post('/addresses', payload);
          showToast('Added', 'Address added to your address book.', 'success');
        }
        formModal.style.display = 'none';
        await loadAddresses();
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    });
  }
}

async function loadAddresses() {
  const container = document.getElementById('account-addresses-grid');
  if (!container) return;

  try {
    const res = await window.api.get('/addresses');
    if (res.success && res.data) {
      const list = res.data;
      if (list.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <h3 class="empty-state-title">No Saved Addresses</h3>
            <p class="empty-state-desc">Add a shipping address to expedite your checkout process.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = list.map(a => `
        <div style="background: var(--bg-surface); border: 1px solid ${a.is_default ? 'var(--accent)' : 'var(--border-subtle)'}; border-radius: var(--radius-md); padding: 1.75rem; position: relative;">
          ${a.is_default ? `<span class="badge" style="background: var(--accent); color: white; margin-bottom: 0.75rem;">Default Destination</span>` : ''}
          <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">${escapeHTML(a.full_name)}</h4>
          <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.25rem;">
            ${escapeHTML(a.address_line1)}<br/>
            ${a.address_line2 ? `${escapeHTML(a.address_line2)}<br/>` : ''}
            ${escapeHTML(a.city)}, ${escapeHTML(a.country)}<br/>
            Phone: ${escapeHTML(a.phone)}
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            ${!a.is_default ? `
              <button class="btn btn-outline btn-sm set-default-btn" data-id="${a.id}">
                Set Default
              </button>
            ` : ''}
            <button class="btn btn-outline btn-sm delete-address-btn" data-id="${a.id}" style="color: var(--error);">
              Delete
            </button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.set-default-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          await window.api.patch(`/addresses/${id}/default`);
          showToast('Updated', 'Default address updated.', 'success');
          await loadAddresses();
        });
      });

      container.querySelectorAll('.delete-address-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (confirm('Delete this address from your book?')) {
            await window.api.delete(`/addresses/${id}`);
            showToast('Deleted', 'Address removed.', 'info');
            await loadAddresses();
          }
        });
      });
    }
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${escapeHTML(err.message)}</p></div>`;
  }
}

// 5. Profile Edit & Password Change (/account/profile)
async function initProfilePage() {
  const profileForm = document.getElementById('profile-edit-form');
  const passwordForm = document.getElementById('password-change-form');

  if (!profileForm || !requireAuth()) return;

  try {
    const res = await window.api.get('/users/profile');
    if (res.success && res.data) {
      document.getElementById('prof_name').value = res.data.full_name;
      document.getElementById('prof_email').value = res.data.email;
      document.getElementById('prof_phone').value = res.data.phone || '';
    }
  } catch (err) {
    showToast('Error', err.message, 'error');
  }

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = profileForm.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
      const res = await window.api.put('/users/profile', {
        full_name: document.getElementById('prof_name').value.trim(),
        phone: document.getElementById('prof_phone').value.trim() || null
      });

      if (res.success && res.data) {
        window.api.setSession(window.api.getToken(), res.data);
        showToast('Saved', 'Profile information updated successfully.', 'success');
      }
    } catch (err) {
      showToast('Error', err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const curr = document.getElementById('pwd_current').value;
      const next = document.getElementById('pwd_new').value;
      const conf = document.getElementById('pwd_confirm').value;

      if (next !== conf) {
        showToast('Mismatch', 'New passwords do not match.', 'error');
        return;
      }

      const btn = passwordForm.querySelector('button[type="submit"]');
      btn.disabled = true;

      try {
        await window.api.put('/users/change-password', {
          current_password: curr,
          new_password: next
        });
        showToast('Password Updated', 'Your password has been changed.', 'success');
        passwordForm.reset();
      } catch (err) {
        showToast('Error', err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAccountDashboard();
  initOrdersHistoryPage();
  initOrderDetailPage();
  initAddressesPage();
  initProfilePage();
});

