/**
 * MAISON & CO. — SHOPPING CART SCRIPT
 */

async function initCartPage() {
  const container = document.getElementById('cart-items-container');
  const summaryContainer = document.getElementById('cart-summary-card');
  if (!container) return;

  if (!window.api.isAuthenticated()) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <h3 class="empty-state-title">Sign In to View Your Cart</h3>
        <p class="empty-state-desc">Your shopping bag is securely synchronized with your customer account.</p>
        <a href="/auth.html?redirect=/cart.html" class="btn btn-primary">Sign In / Register</a>
      </div>
    `;
    if (summaryContainer) summaryContainer.style.display = 'none';
    return;
  }

  await loadCartData();
}

async function loadCartData() {
  const container = document.getElementById('cart-items-container');
  const summaryContainer = document.getElementById('cart-summary-card');
  if (!container) return;

  container.innerHTML = `<div class="skeleton" style="height: 250px; border-radius: var(--radius-md);"></div>`;

  try {
    const res = await window.api.get('/cart');
    if (res.success && res.data) {
      const { items, summary } = res.data;

      if (!items || items.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
            <h3 class="empty-state-title">Your Shopping Bag is Empty</h3>
            <p class="empty-state-desc">Discover our curated selection of architectural goods and everyday artifacts.</p>
            <a href="/index.html#shop-section" class="btn btn-primary">Start Shopping</a>
          </div>
        `;
        if (summaryContainer) summaryContainer.style.display = 'none';
        window.dispatchEvent(new CustomEvent('cart-updated'));
        return;
      }

      if (summaryContainer) summaryContainer.style.display = 'block';

      // Render Item Rows
      container.innerHTML = `
        <div class="cart-items-list" style="display: flex; flex-direction: column; gap: 1.25rem;">
          ${items.map(item => renderCartItemRow(item)).join('')}
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
          <button id="clear-cart-btn" class="btn btn-outline btn-sm" style="color: var(--text-muted);">
            Clear Entire Bag
          </button>
        </div>
      `;

      // Render Summary
      renderCartSummary(summary);

      // Attach item action handlers
      setupCartEventHandlers(items);
    }
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-state-title">Unable to Load Cart</h3>
        <p class="empty-state-desc">${escapeHTML(err.message)}</p>
        <button class="btn btn-primary" onclick="loadCartData()">Try Again</button>
      </div>
    `;
  }
}

function renderCartItemRow(item) {
  const priceFormatted = `Rs. ${parseFloat(item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const lineTotalFormatted = `Rs. ${parseFloat(item.line_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return `
    <div class="cart-item-card" data-item-id="${item.id}" style="display: grid; grid-template-columns: 100px 1fr auto auto; gap: 1.5rem; align-items: center; background: var(--bg-surface); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
      
      <a href="/pages/product.html?slug=${escapeHTML(item.slug)}" style="width: 100px; height: 100px; border-radius: var(--radius-xs); overflow: hidden; background: var(--bg-subtle);">
        <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" style="width: 100%; height: 100%; object-fit: cover;" />
      </a>

      <div>
        <h4 style="font-size: 1.05rem; font-weight: 600; margin-bottom: 0.25rem;">
          <a href="/pages/product.html?slug=${escapeHTML(item.slug)}">${escapeHTML(item.name)}</a>
        </h4>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">Unit Price: ${priceFormatted}</div>
        ${!item.is_available ? `<span class="badge badge-stock-out">Stock issue: Only ${item.stock_quantity} available</span>` : ''}
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

function renderCartSummary(summary) {
  const subtotalEl = document.getElementById('summary-subtotal');
  const deliveryEl = document.getElementById('summary-delivery');
  const totalEl = document.getElementById('summary-total');

  if (subtotalEl) subtotalEl.textContent = `Rs. ${summary.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (deliveryEl) {
    deliveryEl.textContent = summary.delivery_fee === 0 ? 'Complimentary' : `Rs. ${summary.delivery_fee.toFixed(2)}`;
  }
  if (totalEl) totalEl.textContent = `Rs. ${summary.grand_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function setupCartEventHandlers(items) {
  // Plus buttons
  document.querySelectorAll('.cart-plus-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.getAttribute('data-item-id');
      const item = items.find(i => i.id == itemId);
      if (item) {
        await updateQuantity(itemId, item.quantity + 1);
      }
    });
  });

  // Minus buttons
  document.querySelectorAll('.cart-minus-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.getAttribute('data-item-id');
      const item = items.find(i => i.id == itemId);
      if (item) {
        if (item.quantity > 1) {
          await updateQuantity(itemId, item.quantity - 1);
        } else {
          await removeItem(itemId);
        }
      }
    });
  });

  // Remove buttons
  document.querySelectorAll('.cart-remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.getAttribute('data-item-id');
      await removeItem(itemId);
    });
  });

  // Clear Cart
  const clearBtn = document.getElementById('clear-cart-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to remove all items from your bag?')) {
        try {
          await window.api.delete('/cart');
          showToast('Cart Cleared', 'All items have been removed.', 'info');
          await loadCartData();
        } catch (err) {
          showToast('Error', err.message, 'error');
        }
      }
    });
  }
}

async function updateQuantity(itemId, newQty) {
  try {
    const res = await window.api.put(`/cart/${itemId}`, { quantity: newQty });
    if (res.success) {
      window.dispatchEvent(new CustomEvent('cart-updated'));
      await loadCartData();
    }
  } catch (err) {
    showToast('Update Failed', err.message, 'error');
  }
}

async function removeItem(itemId) {
  try {
    const res = await window.api.delete(`/cart/${itemId}`);
    if (res.success) {
      showToast('Item Removed', 'The artifact was removed from your bag.', 'info');
      window.dispatchEvent(new CustomEvent('cart-updated'));
      await loadCartData();
    }
  } catch (err) {
    showToast('Removal Failed', err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cart-items-container')) {
    initCartPage();
  }
});

