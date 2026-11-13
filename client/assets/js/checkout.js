/**
 * MAISON & CO. — CHECKOUT SCRIPT
 */

let cartData = null;

async function initCheckout() {
  const container = document.getElementById('checkout-form-container');
  if (!container) return;

  if (!window.api.isAuthenticated()) {
    window.location.href = `/auth.html?redirect=/checkout.html`;
    return;
  }

  try {
    const res = await window.api.get('/cart');
    if (!res.success || !res.data || !res.data.items || res.data.items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title">Your Cart is Empty</h3>
          <p class="empty-state-desc">You cannot proceed to checkout without any artifacts in your bag.</p>
          <a href="/index.html#shop-section" class="btn btn-primary">Return to Catalog</a>
        </div>
      `;
      const summaryCard = document.getElementById('checkout-summary-card');
      if (summaryCard) summaryCard.style.display = 'none';
      return;
    }

    cartData = res.data;
    renderCheckoutSummary(cartData);
    prefillUserData();
    setupCheckoutForm();

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-state-title">Checkout Initialization Error</h3>
        <p class="empty-state-desc">${escapeHTML(err.message)}</p>
        <a href="/cart.html" class="btn btn-primary">Return to Cart</a>
      </div>
    `;
  }
}

function prefillUserData() {
  const user = window.api.getUser();
  if (!user) return;

  const nameInput = document.getElementById('shipping_name');
  const phoneInput = document.getElementById('shipping_phone');

  if (nameInput && !nameInput.value && user.full_name) {
    nameInput.value = user.full_name;
  }
  if (phoneInput && !phoneInput.value && user.phone) {
    phoneInput.value = user.phone;
  }
}

function renderCheckoutSummary(cart) {
  const itemsContainer = document.getElementById('checkout-items-list');
  const subtotalEl = document.getElementById('chk-subtotal');
  const deliveryEl = document.getElementById('chk-delivery');
  const totalEl = document.getElementById('chk-total');

  if (itemsContainer) {
    itemsContainer.innerHTML = cart.items.map(item => `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" style="width: 44px; height: 44px; border-radius: var(--radius-xs); object-fit: cover;" />
          <div>
            <div style="font-size: 0.9rem; font-weight: 600;">${escapeHTML(item.name)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Qty: ${item.quantity} × Rs. ${item.price.toFixed(2)}</div>
          </div>
        </div>
        <div style="font-size: 0.95rem; font-weight: 700;">
          Rs. ${item.line_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      </div>
    `).join('');
  }

  if (subtotalEl) subtotalEl.textContent = `Rs. ${cart.summary.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (deliveryEl) {
    deliveryEl.textContent = cart.summary.delivery_fee === 0 ? 'Complimentary' : `Rs. ${cart.summary.delivery_fee.toFixed(2)}`;
  }
  if (totalEl) totalEl.textContent = `Rs. ${cart.summary.grand_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function setupCheckoutForm() {
  const form = document.getElementById('checkout-form');
  const submitBtn = document.getElementById('place-order-btn');

  if (!form || !submitBtn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const payload = {
      shipping_name: formData.get('shipping_name'),
      shipping_phone: formData.get('shipping_phone'),
      shipping_address_line1: formData.get('shipping_address_line1'),
      shipping_address_line2: formData.get('shipping_address_line2'),
      shipping_city: formData.get('shipping_city'),
      shipping_state: formData.get('shipping_state'),
      shipping_postal_code: formData.get('shipping_postal_code'),
      shipping_country: formData.get('shipping_country') || 'Pakistan',
      customer_note: formData.get('customer_note')
    };

    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span class="spinner"></span> Processing Order...`;

    try {
      const res = await window.api.post('/orders/checkout', payload);
      if (res.success && res.data) {
        window.dispatchEvent(new CustomEvent('cart-updated'));
        renderOrderConfirmation(res.data);
      }
    } catch (err) {
      showToast('Checkout Failed', err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

function renderOrderConfirmation(order) {
  const mainContainer = document.getElementById('checkout-page-grid');
  if (!mainContainer) return;

  mainContainer.innerHTML = `
    <div style="grid-column: 1 / -1; max-width: 680px; margin: 0 auto; width: 100%;">
      <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 3.5rem 2.5rem; text-align: center; box-shadow: var(--shadow-md);">
        
        <div style="width: 68px; height: 68px; border-radius: 50%; background: #E8F5E9; color: #2E7D32; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
          <svg width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <h2 class="heading-section" style="font-size: 2.25rem; margin-bottom: 0.5rem;">Order Confirmed</h2>
        <p style="color: var(--text-secondary); font-size: 1.05rem; margin-bottom: 2rem;">
          Thank you for choosing Maison & Co. Your acquisition is being prepared with artisanal care.
        </p>

        <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 1.5rem; text-align: left; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
            <span style="color: var(--text-muted);">Order Number:</span>
            <strong style="font-family: monospace; font-size: 1.05rem;">${escapeHTML(order.order_number)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
            <span style="color: var(--text-muted);">Payment Method:</span>
            <strong>Cash on Delivery (COD)</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
            <span style="color: var(--text-muted);">Delivery Address:</span>
            <span>${escapeHTML(order.shipping_address)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 1.1rem; border-top: 1px solid var(--border-strong); padding-top: 0.75rem; margin-top: 0.25rem;">
            <span>Total Payable:</span>
            <strong style="color: var(--accent);">Rs. ${order.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>

        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <a href="/orders.html" class="btn btn-primary">View My Orders</a>
          <a href="/index.html" class="btn btn-outline">Continue Shopping</a>
        </div>

      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('checkout-form-container')) {
    initCheckout();
  }
});

