/**
 * MAISON & CO. — PRODUCT DETAILS & REVIEWS SCRIPT
 */

let activeProduct = null;
let currentQuantity = 1;

async function initProductDetailsPage() {
  const container = document.getElementById('product-detail-container');
  if (!container) return;

  // Resolve slug from path e.g. /product/krono-apex or search query ?slug=...
  let slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) {
    const segments = window.location.pathname.split('/').filter(Boolean);
    if (segments.length >= 2 && segments[0] === 'product') {
      slug = segments[1];
    }
  }

  if (!slug) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-state-title">No Artifact Specified</h3>
        <p class="empty-state-desc">Please choose an item from our shop catalog.</p>
        <a href="/shop" class="btn btn-primary">Browse Catalog</a>
      </div>
    `;
    return;
  }

  try {
    const res = await window.api.get(`/products/${encodeURIComponent(slug)}`);
    if (res.success && res.data) {
      activeProduct = res.data;
      document.title = `${activeProduct.name} — Maison & Co.`;
      const bCrumb = document.getElementById('breadcrumb-title');
      if (bCrumb) bCrumb.textContent = activeProduct.name;

      renderProductDetails(activeProduct);
      renderRelatedProducts(activeProduct.related_products);
      await loadReviews(activeProduct.id);
      setupReviewForm(activeProduct.id);
    }
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-state-title">Artifact Not Found</h3>
        <p class="empty-state-desc">${escapeHTML(err.message)}</p>
        <a href="/shop" class="btn btn-primary">Return to Shop</a>
      </div>
    `;
  }
}

function renderProductDetails(prod) {
  const container = document.getElementById('product-detail-container');
  if (!container) return;

  const isOutOfStock = prod.stock_quantity <= 0;
  const isLowStock = prod.stock_quantity > 0 && prod.stock_quantity <= prod.low_stock_threshold;

  let stockHtml = '';
  if (isOutOfStock) {
    stockHtml = `<span class="badge badge-stock-out">Out of Stock</span>`;
  } else if (isLowStock) {
    stockHtml = `<span class="badge" style="background:#FFF3CD; color:#856404;">Low Inventory: Only ${prod.stock_quantity} remaining</span>`;
  } else {
    stockHtml = `<span class="badge" style="background:#E8F5E9; color:#2E7D32;">In Stock & Ready for Dispatch</span>`;
  }

  const priceFormatted = `Rs. ${parseFloat(prod.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const compareFormatted = prod.compare_at_price 
    ? `<span class="price-compare" style="font-size:1.15rem;">Rs. ${parseFloat(prod.compare_at_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>` 
    : '';

  const discountBadge = prod.discount_percent > 0 
    ? `<span class="badge badge-discount">Save ${prod.discount_percent}%</span>` 
    : '';

  const mainImage = prod.images && prod.images.length > 0 ? prod.images[0].image_url : prod.primary_image;

  const thumbnailsHtml = (prod.images || []).map((img, idx) => `
    <button class="thumb-btn ${idx === 0 ? 'active' : ''}" data-img-url="${escapeHTML(img.image_url)}" style="width: 80px; height: 80px; border-radius: var(--radius-xs); overflow: hidden; border: 2px solid ${idx === 0 ? 'var(--accent)' : 'transparent'}; background: var(--bg-surface); cursor: pointer; padding:0;">
      <img src="${escapeHTML(img.image_url)}" alt="${escapeHTML(prod.name)}" style="width:100%; height:100%; object-fit: cover;" />
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
            <a href="/shop?category=${encodeURIComponent(prod.category_slug)}" class="subheading-label">${escapeHTML(prod.category_name || 'Design Object')}</a>
            ${prod.brand ? `<span style="color:var(--text-muted); font-size: 0.8rem;">• ${escapeHTML(prod.brand)}</span>` : ''}
          </div>
          <h1 class="heading-section" style="font-size: 2.25rem;">${escapeHTML(prod.name)}</h1>
          <div style="font-size: 0.825rem; color: var(--text-muted); margin-top: 0.35rem;">SKU: ${escapeHTML(prod.sku)}</div>
        </div>

        <div style="display: flex; align-items: baseline; gap: 1rem; padding: 1.25rem 0; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle);">
          <span class="price-current" style="font-size: 2rem;">${priceFormatted}</span>
          ${compareFormatted}
          ${discountBadge}
        </div>

        <div>
          <div style="margin-bottom: 0.75rem;">${stockHtml}</div>
          <p style="color: var(--text-secondary); font-size: 1.05rem; line-height: 1.6;">${escapeHTML(prod.short_description || '')}</p>
        </div>

        <!-- Add to Cart & Wishlist Actions -->
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 1.25rem;">
            <div class="qty-control" style="display: inline-flex; align-items: center; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: var(--bg-surface);">
              <button class="qty-btn" id="qty-minus" style="padding: 0.75rem 1rem; font-size: 1.1rem; color: var(--text-primary);">-</button>
              <span id="qty-display" style="min-width: 44px; text-align: center; font-weight: 600; font-size: 1rem;">1</span>
              <button class="qty-btn" id="qty-plus" style="padding: 0.75rem 1rem; font-size: 1.1rem; color: var(--text-primary);">+</button>
            </div>

            <button id="detail-add-to-cart-btn" class="btn btn-primary btn-lg" style="flex: 1;" ${isOutOfStock ? 'disabled' : ''}>
              ${isOutOfStock ? 'Sold Out' : 'Add to Shopping Bag'}
            </button>

            <button id="detail-wishlist-btn" class="icon-btn" title="Save to Wishlist" style="width: 52px; height: 52px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm);">
              <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 1.5rem; font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">
            <span>✓ Cash on Delivery (COD)</span>
            <span>✓ Insured Courier Transit</span>
            <span>✓ Material Provenance Guarantee</span>
          </div>
        </div>

        <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-subtle); padding-top: 1.5rem;">
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">Design Architecture &amp; Specifications</h4>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; white-space: pre-line;">${escapeHTML(prod.description || '')}</p>
        </div>

      </div>

    </div>
  `;

  // Gallery switching
  container.querySelectorAll('.thumb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.thumb-btn').forEach(b => b.style.borderColor = 'transparent');
      btn.style.borderColor = 'var(--accent)';
      const url = btn.getAttribute('data-img-url');
      const mainImg = document.getElementById('main-product-img');
      if (mainImg) mainImg.src = url;
    });
  });

  // Quantity controls
  const minus = document.getElementById('qty-minus');
  const plus = document.getElementById('qty-plus');
  const display = document.getElementById('qty-display');

  if (minus && plus && display) {
    minus.addEventListener('click', () => {
      if (currentQuantity > 1) {
        currentQuantity--;
        display.textContent = currentQuantity;
      }
    });

    plus.addEventListener('click', () => {
      if (currentQuantity < prod.stock_quantity) {
        currentQuantity++;
        display.textContent = currentQuantity;
      } else {
        showToast('Max Stock', `Only ${prod.stock_quantity} available.`, 'info');
      }
    });
  }

  // Add to cart
  const addBtn = document.getElementById('detail-add-to-cart-btn');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      if (!window.api.isAuthenticated()) {
        showToast('Sign In Required', 'Please sign in to add items to your cart.', 'info');
        setTimeout(() => {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }, 1000);
        return;
      }

      addBtn.disabled = true;
      const orig = addBtn.innerHTML;
      addBtn.innerHTML = `<span class="spinner"></span> Adding...`;

      try {
        const res = await window.api.post('/cart', {
          productId: prod.id,
          quantity: currentQuantity
        });
        if (res.success) {
          showToast('Added to Bag', `${currentQuantity}x "${prod.name}" added to shopping bag.`, 'success');
          window.dispatchEvent(new CustomEvent('cart-updated'));
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      } finally {
        addBtn.disabled = false;
        addBtn.innerHTML = orig;
      }
    });
  }

  // Add to wishlist
  const wishBtn = document.getElementById('detail-wishlist-btn');
  if (wishBtn) {
    wishBtn.addEventListener('click', async () => {
      if (!window.api.isAuthenticated()) {
        showToast('Sign In Required', 'Please sign in to save items to your wishlist.', 'info');
        setTimeout(() => {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }, 1000);
        return;
      }

      try {
        const res = await window.api.post('/wishlist', { productId: prod.id });
        if (res.success) {
          showToast('Wishlist', 'Artifact saved to your wishlist.', 'success');
          wishBtn.style.color = '#C45A30';
          window.dispatchEvent(new CustomEvent('wishlist-updated'));
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    });
  }
}

async function loadReviews(productId) {
  const container = document.getElementById('reviews-list');
  const countEl = document.getElementById('reviews-count-badge');
  const avgEl = document.getElementById('reviews-avg-rating');
  if (!container) return;

  try {
    const res = await window.api.get(`/reviews/product/${productId}`);
    if (res.success && res.data) {
      const { reviews, summary } = res.data;
      if (countEl) countEl.textContent = `(${summary.total_reviews})`;
      if (avgEl) avgEl.textContent = summary.average_rating > 0 ? `${summary.average_rating} / 5` : 'No reviews yet';

      if (reviews.length === 0) {
        container.innerHTML = `
          <div style="color: var(--text-muted); font-size: 0.95rem; padding: 1.5rem 0;">
            No client reviews have been recorded for this artifact yet. Be the first to submit a commentary below.
          </div>
        `;
        return;
      }

      container.innerHTML = reviews.map(r => `
        <div style="border-bottom: 1px solid var(--border-subtle); padding: 1.25rem 0;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
            <strong>${escapeHTML(r.customer_name)}</strong>
            <div style="color: #D97706; font-size: 0.9rem;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
          </div>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;">${escapeHTML(r.comment)}</p>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">
            Verified Acquisition • ${new Date(r.created_at).toLocaleDateString()}
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    container.innerHTML = `<div style="color: var(--text-muted);">Reviews temporarily unavailable.</div>`;
  }
}

function setupReviewForm(productId) {
  const form = document.getElementById('submit-review-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!window.api.isAuthenticated()) {
      showToast('Sign In Required', 'Please sign in to submit a review.', 'info');
      setTimeout(() => {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }, 1000);
      return;
    }

    const rating = form.querySelector('select[name="rating"]').value;
    const comment = form.querySelector('textarea[name="comment"]').value;
    const btn = form.querySelector('button[type="submit"]');

    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'Submitting...';

    try {
      const res = await window.api.post('/reviews', {
        productId,
        rating: parseInt(rating, 10),
        comment
      });

      if (res.success) {
        showToast('Review Published', 'Your commentary has been successfully recorded.', 'success');
        form.reset();
        await loadReviews(productId);
      }
    } catch (err) {
      showToast('Review Error', err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  });
}

function renderRelatedProducts(products = []) {
  const container = document.getElementById('related-products-grid');
  if (!container) return;

  if (!products || products.length === 0) {
    const sec = document.getElementById('related-products-section');
    if (sec) sec.style.display = 'none';
    return;
  }

  container.innerHTML = products.map(prod => `
    <article class="product-card">
      <div class="product-card-img-wrap">
        <a href="/product/${escapeHTML(prod.slug)}">
          <img src="${escapeHTML(prod.primary_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80')}" alt="${escapeHTML(prod.name)}" loading="lazy" />
        </a>
      </div>
      <div class="product-card-body">
        <h4 class="product-card-title">
          <a href="/product/${escapeHTML(prod.slug)}">${escapeHTML(prod.name)}</a>
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
    initProductDetailsPage();
  }
});

