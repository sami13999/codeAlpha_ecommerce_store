/**
 * MAISON & CO. — SHOPPING BAG CLIENT SCRIPT
 */

let appliedCoupon = null;

async function initCartPage() {
  const container = document.getElementById('cart-items-container');
  const summaryCard = document.getElementById('cart-summary-card');
  if (!container) return;

  if (!window.api.isAuthenticated()) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-state-title">Sign In to View Your Bag</h3>
        <p class="empty-state-desc">Your shopping bag is securely synchronized with your customer account.</p>
        <a href="/login?redirect=/cart" class="btn btn-primary">Sign In / Register</a>
      </div>
    `;
    if (summaryCard) summaryCard.style.display = 'none';
    return;
  }

  await loadCartData();
  setupCouponForm();
}

async function loadCartData() {
  const container = document.getElementById('cart-items-container');
  const summaryCard = document.getElementById('cart-summary-card');
  if (!container) return;

  container.innerHTML = `<div class="skeleton" style="height: 250px; border-radius: var(--radius-md);"></div>`;

  try {
    const res = await window.api.get('/cart');
    if (res.success && res.data) {
      const { items, summary } = res.data;

      if (!items || items.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <h3 class="empty-state-title">Your Shopping Bag is Empty</h3>
            <p class="empty-state-desc">Explore our curated selection of architectural goods and everyday artifacts.</p>
            <a href="/shop" class="btn btn-primary">Start Exploring</a>
          </div>
        `;
        if (summaryCard) summaryCard.style.display = 'none';
        window.dispatchEvent(new CustomEvent('cart-updated'));
        return;
      }

      if (summaryCard) summaryCard.style.display = 'block';

      container.innerHTML = `
        <div class="cart-items-list" style="display: flex; flex-direction: column; gap: 1.25rem;">
          ${items.map(item => renderCartRow(item)).join('')}
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
          <button id="clear-cart-btn" class="btn btn-outline btn-sm" style="color: var(--text-muted);">
            Clear Entire Bag
          </button>
        </div>
      `;

      renderSummary(summary);
      setupRowHandlers(items);

      const clearBtn = document.getElementById('clear-cart-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
          if (confirm('Clear all artifacts from your bag?')) {
            await window.api.delete('/cart');
            showToast('Bag Cleared', 'All items removed.', 'info');
            await loadCartData();
          }
        });
      }
    }
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-state-title">Unable to Load Bag</h3>
        <p class="empty-state-desc">${escapeHTML(err.message)}</p>
      </div>
    `;
  }
}

function renderCartRow(item) {
  const priceFormatted = `Rs. ${parseFloat(item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const lineTotalFormatted = `Rs. ${parseFloat(item.line_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return `
    <div class="cart-item-card" data-item-id="${item.id}" style="display: grid; grid-template-columns: 100px 1fr auto auto; gap: 1.5rem; align-items: center; background: var(--bg-surface); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
      
      <a href="/product/${escapeHTML(item.slug)}" style="width: 100px; height: 100px; border-radius: var(--radius-xs); overflow: hidden; background: var(--bg-subtle);">
        <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" style="width: 100%; height: 100%; object-fit: cover;" />
      </a>

      <div>
        <h4 style="font-size: 1.05rem; font-weight: 600; margin-bottom: 0.25rem;">
          <a href="/product/${escapeHTML(item.slug)}">${escapeHTML(item.name)}</a>
        </h4>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">Unit: ${priceFormatted}</div>
        ${!item.is_available ? `<span class="badge badge-stock-out">Stock issue: Only ${item.stock_quantity} left</span>` : ''}
      </div>

      <div style="display: flex; align-items: center; border: 1px solid var(--border-strong); border-radius: var(--radius-xs); background: var(--bg-surface);">
        <button class="qty-btn cart-minus-btn" data-item-id="${item.id}" style="padding: 0.4rem 0.75rem; font-weight: 600;">-</button>
        <span style="min-width: 32px; text-align: center; font-size: 0.9rem; font-weight: 600;">${item.quantity}</span>
        <button class="qty-btn cart-plus-btn" data-item-id="${item.id}" style="padding: 0.4rem 0.75rem; font-weight: 600;">+</button>
      </div>

      <div style="text-align: right; min-width: 110px;">
        <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">${lineTotalFormatted}</div>
        <button class="cart-remove-btn" data-item-id="${item.id}" style="font-size: 0.8rem; color: var(--error); cursor: pointer; text-decoration: underline;">
          Remove
        </button>
      </div>

    </div>
  `;
}

function renderSummary(summary) {
  const subtotalEl = document.getElementById('summary-subtotal');
  const deliveryEl = document.getElementById('summary-delivery');
  const discountRow = document.getElementById('summary-discount-row');
  const discountEl = document.getElementById('summary-discount');
  const totalEl = document.getElementById('summary-total');

  let discount = 0;
  if (appliedCoupon) {
    discount = appliedCoupon.discount_amount;
    if (discountRow) discountRow.style.display = 'flex';
    if (discountEl) discountEl.textContent = `-Rs. ${discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  } else {
    if (discountRow) discountRow.style.display = 'none';
  }

  const finalTotal = Math.max(0, summary.subtotal - discount) + summary.delivery_fee;

  if (subtotalEl) subtotalEl.textContent = `Rs. ${summary.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (deliveryEl) deliveryEl.textContent = summary.delivery_fee === 0 ? 'Complimentary' : `Rs. ${summary.delivery_fee.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `Rs. ${finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const checkoutBtn = document.getElementById('cart-checkout-link');
  if (checkoutBtn) {
    let url = '/checkout';
    if (appliedCoupon) {
      url += `?coupon=${encodeURIComponent(appliedCoupon.code)}`;
    }
    checkoutBtn.href = url;
  }
}

function setupRowHandlers(items) {
  document.querySelectorAll('.cart-plus-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-item-id');
      const item = items.find(i => i.id == id);
      if (item) {
        await updateQty(id, item.quantity + 1);
      }
    });
  });

  document.querySelectorAll('.cart-minus-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-item-id');
      const item = items.find(i => i.id == id);
      if (item) {
        if (item.quantity > 1) {
          await updateQty(id, item.quantity - 1);
        } else {
          await removeRow(id);
        }
      }
    });
  });

  document.querySelectorAll('.cart-remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-item-id');
      await removeRow(id);
    });
  });
}

async function updateQty(itemId, qty) {
  try {
    const res = await window.api.put(`/cart/${itemId}`, { quantity: qty });
    if (res.success) {
      window.dispatchEvent(new CustomEvent('cart-updated'));
      await loadCartData();
    }
  } catch (err) {
    showToast('Stock Notice', err.message, 'error');
  }
}

async function removeRow(itemId) {
  try {
    const res = await window.api.delete(`/cart/${itemId}`);
    if (res.success) {
      showToast('Item Removed', 'The item was removed from your bag.', 'info');
      window.dispatchEvent(new CustomEvent('cart-updated'));
      await loadCartData();
    }
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

function setupCouponForm() {
  const form = document.getElementById('cart-coupon-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('coupon-code-input');
    const msg = document.getElementById('coupon-message');
    if (!input || !input.value.trim()) return;

    try {
      const cartRes = await window.api.get('/cart');
      const subtotal = cartRes.data.summary.subtotal;

      const res = await window.api.post('/coupons/validate', {
        code: input.value.trim(),
        subtotal
      });

      if (res.success && res.data) {
        appliedCoupon = res.data;
        if (msg) {
          msg.style.color = '#2E7D32';
          msg.textContent = `Coupon "${res.data.code}" applied! Saved Rs. ${res.data.discount_amount}.`;
        }
        showToast('Coupon Applied', `Promo "${res.data.code}" verified.`, 'success');
        renderSummary(cartRes.data.summary);
      }
    } catch (err) {
      appliedCoupon = null;
      if (msg) {
        msg.style.color = '#C62828';
        msg.textContent = err.message;
      }
      showToast('Coupon Error', err.message, 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cart-items-container')) {
    initCartPage();
  }
});

