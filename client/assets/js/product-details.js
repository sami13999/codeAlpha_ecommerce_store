/**
 * MAISON & CO. — PRODUCT DETAILS SCRIPT
 */

let activeProduct = null;
let currentQuantity = 1;

async function initProductDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  const container = document.getElementById('product-detail-container');
  if (!container) return;

  if (!slug) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-state-title">No Product Specified</h3>
        <p class="empty-state-desc">Please choose an item from our catalog collection.</p>
        <a href="/index.html#shop-section" class="btn btn-primary">Browse Collection</a>
      </div>
    `;
    return;
  }

  try {
    const res = await window.api.get(`/products/${encodeURIComponent(slug)}`);
    if (res.success && res.data) {
      activeProduct = res.data;
      document.title = `${activeProduct.name} — Maison & Co.`;
      renderProductDetails(activeProduct);
      renderRelatedProducts(activeProduct.related_products);
    }
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-state-title">Product Not Found</h3>
        <p class="empty-state-desc">${escapeHTML(err.message)}</p>
        <a href="/index.html#shop-section" class="btn btn-primary">Return to Catalog</a>
      </div>
    `;
  }
}

function renderProductDetails(prod) {
  const container = document.getElementById('product-detail-container');
  if (!container) return;

  const isOutOfStock = prod.stock_quantity <= 0;
  const isLowStock = prod.stock_quantity > 0 && prod.stock_quantity <= prod.low_stock_threshold;

  let stockBadgeHtml = '';
  if (isOutOfStock) {
    stockBadgeHtml = `<span class="badge badge-stock-out">Out of Stock</span>`;
  } else if (isLowStock) {
    stockBadgeHtml = `<span class="badge" style="background:#FFF3CD; color:#856404;">Only ${prod.stock_quantity} remaining</span>`;
  } else {
    stockBadgeHtml = `<span class="badge" style="background:#E8F5E9; color:#2E7D32;">In Stock & Ready to Ship</span>`;
  }

  const priceFormatted = `Rs. ${parseFloat(prod.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const comparePriceFormatted = prod.compare_at_price 
    ? `<span class="price-compare" style="font-size:1.15rem;">Rs. ${parseFloat(prod.compare_at_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>` 
    : '';

  const discountBadge = prod.discount_percent > 0 
    ? `<span class="badge badge-discount">Save ${prod.discount_percent}%</span>` 
    : '';

  const mainImage = prod.images && prod.images.length > 0 ? prod.images[0].image_url : prod.primary_image;

  const thumbnailsHtml = (prod.images || []).map((img, idx) => `
    <button class="thumb-btn ${idx === 0 ? 'active' : ''}" data-img-url="${escapeHTML(img.image_url)}">
      <img src="${escapeHTML(img.image_url)}" alt="${escapeHTML(prod.name)}" />
    </button>
  `).join('');

  container.innerHTML = `
    <div class="product-detail-grid" style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 3.5rem; align-items: start;">
      
      <!-- Gallery Column -->
      <div class="product-gallery">
        <div class="main-image-wrap" style="position: relative; border-radius: var(--radius-md); overflow: hidden; background: var(--bg-surface); border: 1px solid var(--border-subtle); padding-top: 100%;">
          <img id="main-product-img" src="${escapeHTML(mainImage)}" alt="${escapeHTML(prod.name)}" style="position: absolute; top:0; left:0; width:100%; height:100%; object-fit: cover;" />
        </div>
        
        ${prod.images && prod.images.length > 1 ? `
          <div class="thumbnails-track" style="display: flex; gap: 1rem; margin-top: 1.25rem; overflow-x: auto;">
            ${thumbnailsHtml}
          </div>
        ` : ''}
      </div>

      <!-- Info Column -->
      <div class="product-info-wrap" style="display: flex; flex-direction: column; gap: 1.5rem;">
        
        <div>
          <div style="display:flex; align-items:center; gap: 0.75rem; margin-bottom: 0.5rem;">
            <span class="subheading-label">${escapeHTML(prod.category_name || 'Design Object')}</span>
            ${prod.brand ? `<span style="color:var(--text-muted); font-size: 0.8rem;">• ${escapeHTML(prod.brand)}</span>` : ''}
          </div>
          <h1 class="heading-section" style="font-size: 2.25rem;">${escapeHTML(prod.name)}</h1>
          <div style="font-size: 0.825rem; color: var(--text-muted); margin-top: 0.35rem;">SKU: ${escapeHTML(prod.sku)}</div>
        </div>

        <div style="display: flex; align-items: baseline; gap: 1rem; padding: 1.25rem 0; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle);">
          <span class="price-current" style="font-size: 2rem;">${priceFormatted}</span>
          ${comparePriceFormatted}
          ${discountBadge}
        </div>

        <div>
          <div style="margin-bottom: 0.75rem;">${stockBadgeHtml}</div>
          <p style="color: var(--text-secondary); font-size: 1.05rem; line-height: 1.6;">${escapeHTML(prod.short_description || '')}</p>
        </div>

        <!-- Add to Cart Form -->
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 1.25rem;">
            <div class="qty-control" style="display: inline-flex; align-items: center; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: var(--bg-surface);">
              <button class="qty-btn" id="qty-minus" style="padding: 0.75rem 1rem; font-size: 1.1rem; color: var(--text-primary);">-</button>
              <span id="qty-display" style="min-width: 44px; text-align: center; font-weight: 600; font-size: 1rem;">1</span>
              <button class="qty-btn" id="qty-plus" style="padding: 0.75rem 1rem; font-size: 1.1rem; color: var(--text-primary);">+</button>
            </div>

            <button 
              id="detail-add-to-cart-btn" 
              class="btn btn-primary btn-lg" 
              style="flex: 1;" 
              ${isOutOfStock ? 'disabled' : ''}
            >
              ${isOutOfStock ? 'Sold Out' : 'Add to Shopping Bag'}
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 1.5rem; font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">
            <span>✓ Cash on Delivery (COD)</span>
            <span>✓ 3-5 Business Days Delivery</span>
            <span>✓ Verified Quality Guarantee</span>
          </div>
        </div>

        <!-- Specifications Tab / Accordion -->
        <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-subtle); padding-top: 1.5rem;">
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">Product Architecture & Details</h4>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; white-space: pre-line;">${escapeHTML(prod.description || '')}</p>
        </div>

      </div>

    </div>
  `;

  // Gallery thumbnail switching
  container.querySelectorAll('.thumb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.thumb-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const url = btn.getAttribute('data-img-url');
      const mainImg = document.getElementById('main-product-img');
      if (mainImg) mainImg.src = url;
    });
  });

  // Quantity controls
  const minusBtn = document.getElementById('qty-minus');
  const plusBtn = document.getElementById('qty-plus');
  const qtyDisplay = document.getElementById('qty-display');
  const addBtn = document.getElementById('detail-add-to-cart-btn');

  if (minusBtn && plusBtn && qtyDisplay) {
    minusBtn.addEventListener('click', () => {
      if (currentQuantity > 1) {
        currentQuantity--;
        qtyDisplay.textContent = currentQuantity;
      }
    });

    plusBtn.addEventListener('click', () => {
      if (currentQuantity < prod.stock_quantity) {
        currentQuantity++;
        qtyDisplay.textContent = currentQuantity;
      } else {
        showToast('Max Stock Reached', `Only ${prod.stock_quantity} units available.`, 'info');
      }
    });
  }

  // Add to cart click
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      if (!window.api.isAuthenticated()) {
        showToast('Sign In Required', 'Please sign in to add items to your cart.', 'info');
        setTimeout(() => {
          window.location.href = `/auth.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }, 1200);
        return;
      }

      addBtn.disabled = true;
      const originalText = addBtn.innerHTML;
      addBtn.innerHTML = `<span class="spinner"></span> Adding to Bag...`;

      try {
        const res = await window.api.post('/cart', {
          productId: prod.id,
          quantity: currentQuantity
        });

        if (res.success) {
          showToast('Added to Cart', `${currentQuantity}x "${prod.name}" added to your bag.`, 'success');
          window.dispatchEvent(new CustomEvent('cart-updated'));
        }
      } catch (err) {
        showToast('Cart Error', err.message, 'error');
      } finally {
        addBtn.disabled = false;
        addBtn.innerHTML = originalText;
      }
    });
  }
}

function renderRelatedProducts(products = []) {
  const container = document.getElementById('related-products-grid');
  if (!container) return;

  if (!products || products.length === 0) {
    const section = document.getElementById('related-products-section');
    if (section) section.style.display = 'none';
    return;
  }

  container.innerHTML = products.map(prod => `
    <article class="product-card">
      <a href="/pages/product.html?slug=${escapeHTML(prod.slug)}" class="product-card-img-wrap">
        <img src="${escapeHTML(prod.primary_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80')}" alt="${escapeHTML(prod.name)}" loading="lazy" />
      </a>
      <div class="product-card-body">
        <h4 class="product-card-title">
          <a href="/pages/product.html?slug=${escapeHTML(prod.slug)}">${escapeHTML(prod.name)}</a>
        </h4>
        <div class="product-card-price-row">
          <span class="price-current">Rs. ${parseFloat(prod.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </article>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-detail-container')) {
    initProductDetails();
  }
});

