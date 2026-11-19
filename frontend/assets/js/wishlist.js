/**
 * MAISON & CO. — WISHLIST CLIENT SCRIPT
 */

async function initWishlistPage() {
  const container = document.getElementById('wishlist-grid');
  if (!container) return;

  if (!window.api.isAuthenticated()) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3 class="empty-state-title">Sign In to View Your Wishlist</h3>
        <p class="empty-state-desc">Your saved artifacts are synced with your customer profile.</p>
        <a href="/login?redirect=/wishlist" class="btn btn-primary">Sign In / Register</a>
      </div>
    `;
    return;
  }

  await loadWishlist();
}

async function loadWishlist() {
  const container = document.getElementById('wishlist-grid');
  const countEl = document.getElementById('wishlist-count-indicator');
  if (!container) return;

  container.innerHTML = Array(4).fill(0).map(() => `
    <div class="product-card skeleton" style="height: 360px;"></div>
  `).join('');

  try {
    const res = await window.api.get('/wishlist');
    if (res.success && res.data) {
      const items = res.data.items || [];
      if (countEl) countEl.textContent = `${items.length} saved artifacts`;

      if (items.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <h3 class="empty-state-title">Your Wishlist is Empty</h3>
            <p class="empty-state-desc">Explore the catalog and click the heart icon to save favorite works.</p>
            <a href="/shop" class="btn btn-primary">Discover Works</a>
          </div>
        `;
        window.dispatchEvent(new CustomEvent('wishlist-updated'));
        return;
      }

      container.innerHTML = items.map(item => `
        <article class="product-card">
          <div class="product-card-img-wrap">
            <a href="/product/${escapeHTML(item.slug)}">
              <img src="${escapeHTML(item.primary_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80')}" alt="${escapeHTML(item.name)}" loading="lazy" />
            </a>
            ${!item.in_stock ? `<span class="badge badge-stock-out" style="position: absolute; top: 10px; left: 10px;">Out of Stock</span>` : ''}
            <button class="remove-wishlist-btn" data-product-id="${item.product_id}" title="Remove from Wishlist" style="position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; border-radius: 50%; background: white; border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--error);">
              &times;
            </button>
          </div>
          <div class="product-card-body">
            <div class="product-card-category">${escapeHTML(item.category_name || 'Design Object')}</div>
            <h4 class="product-card-title">
              <a href="/product/${escapeHTML(item.slug)}">${escapeHTML(item.name)}</a>
            </h4>
            <div class="product-card-price-row">
              <span class="price-current">Rs. ${parseFloat(item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="product-card-action">
              <button class="btn btn-primary btn-full btn-sm move-to-bag-btn" data-product-id="${item.product_id}" ${!item.in_stock ? 'disabled' : ''}>
                ${item.in_stock ? 'Move to Shopping Bag' : 'Sold Out'}
              </button>
            </div>
          </div>
        </article>
      `).join('');

      // Move to bag handler
      container.querySelectorAll('.move-to-bag-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const prodId = btn.getAttribute('data-product-id');
          try {
            await window.api.post(`/wishlist/move-to-cart/${prodId}`);
            showToast('Moved to Bag', 'Item added to your shopping bag.', 'success');
            window.dispatchEvent(new CustomEvent('cart-updated'));
            window.dispatchEvent(new CustomEvent('wishlist-updated'));
            await loadWishlist();
          } catch (err) {
            showToast('Error', err.message, 'error');
          }
        });
      });

      // Remove handler
      container.querySelectorAll('.remove-wishlist-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const prodId = btn.getAttribute('data-product-id');
          try {
            await window.api.delete(`/wishlist/${prodId}`);
            showToast('Removed', 'Item removed from your wishlist.', 'info');
            window.dispatchEvent(new CustomEvent('wishlist-updated'));
            await loadWishlist();
          } catch (err) {
            showToast('Error', err.message, 'error');
          }
        });
      });
    }
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3 class="empty-state-title">Unable to Load Wishlist</h3>
        <p class="empty-state-desc">${escapeHTML(err.message)}</p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('wishlist-grid')) {
    initWishlistPage();
  }
});

