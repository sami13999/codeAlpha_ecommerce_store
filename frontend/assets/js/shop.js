/**
 * MAISON & CO. — SHOP & CATALOG SCRIPT
 */

let currentQuery = {
  page: 1,
  limit: 12,
  category: '',
  search: '',
  sort: 'featured',
  minPrice: '',
  maxPrice: ''
};

async function initShopPage() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('category')) currentQuery.category = urlParams.get('category');
  if (urlParams.get('search')) currentQuery.search = urlParams.get('search');
  if (urlParams.get('sort')) currentQuery.sort = urlParams.get('sort');
  if (urlParams.get('page')) currentQuery.page = parseInt(urlParams.get('page'), 10) || 1;

  await loadCategoriesFilter();
  await loadShopProducts();
  setupShopControls();
}

async function loadCategoriesFilter() {
  const container = document.getElementById('shop-category-filters');
  if (!container) return;

  try {
    const res = await window.api.get('/categories');
    if (res.success && res.data && res.data.all) {
      let html = `
        <label class="filter-radio-item">
          <input type="radio" name="shop_cat" value="" ${!currentQuery.category ? 'checked' : ''} />
          <span>All Departments</span>
        </label>
      `;

      res.data.all.forEach(cat => {
        const isChecked = currentQuery.category === cat.slug ? 'checked' : '';
        html += `
          <label class="filter-radio-item">
            <input type="radio" name="shop_cat" value="${escapeHTML(cat.slug)}" ${isChecked} />
            <span>${escapeHTML(cat.name)} (${cat.product_count})</span>
          </label>
        `;
      });

      container.innerHTML = html;

      container.querySelectorAll('input[name="shop_cat"]').forEach(input => {
        input.addEventListener('change', () => {
          currentQuery.category = input.value;
          currentQuery.page = 1;
          loadShopProducts();
        });
      });
    }
  } catch (err) {
    console.error('Error loading category filters:', err);
  }
}

async function loadShopProducts() {
  const grid = document.getElementById('shop-products-grid');
  const countIndicator = document.getElementById('shop-count-indicator');
  const paginationContainer = document.getElementById('shop-pagination');

  if (!grid) return;

  grid.innerHTML = Array(8).fill(0).map(() => `
    <div class="product-card skeleton" style="height: 380px;"></div>
  `).join('');

  try {
    const res = await window.api.get('/products', currentQuery);
    if (res.success && res.data) {
      const products = res.data;
      const meta = res.meta || { total: products.length, page: 1, totalPages: 1 };

      if (countIndicator) {
        countIndicator.textContent = `Showing ${products.length} of ${meta.total} artifacts`;
      }

      if (products.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <h3 class="empty-state-title">No Matching Artifacts</h3>
            <p class="empty-state-desc">Try clearing your price filters or search terms.</p>
            <button class="btn btn-outline" id="clear-all-filters-btn">Clear All Filters</button>
          </div>
        `;
        const clearBtn = document.getElementById('clear-all-filters-btn');
        if (clearBtn) {
          clearBtn.addEventListener('click', () => {
            currentQuery = { page: 1, limit: 12, category: '', search: '', sort: 'featured', minPrice: '', maxPrice: '' };
            const sInput = document.getElementById('shop-search-input');
            if (sInput) sInput.value = '';
            loadCategoriesFilter();
            loadShopProducts();
          });
        }
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
      }

      grid.innerHTML = products.map(prod => renderShopProductCard(prod)).join('');

      // Quick add to cart
      grid.querySelectorAll('.quick-add-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const prodId = btn.getAttribute('data-product-id');
          await handleAddToCart(prodId, btn);
        });
      });

      // Quick add to wishlist
      grid.querySelectorAll('.quick-wishlist-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const prodId = btn.getAttribute('data-product-id');
          await handleAddToWishlist(prodId, btn);
        });
      });

      renderShopPagination(paginationContainer, meta);
    }
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3 class="empty-state-title">Unable to Load Catalog</h3>
        <p class="empty-state-desc">${escapeHTML(err.message)}</p>
      </div>
    `;
  }
}

function renderShopProductCard(prod) {
  const defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80';
  const primaryImg = prod.primary_image || defaultImg;
  const secondaryImg = prod.secondary_image;
  const isOutOfStock = prod.stock_quantity <= 0;

  let badgesHtml = '';
  if (isOutOfStock) {
    badgesHtml += `<span class="badge badge-stock-out">Sold Out</span>`;
  } else if (prod.discount_percent > 0) {
    badgesHtml += `<span class="badge badge-discount">-${prod.discount_percent}%</span>`;
  }

  const priceFormatted = `Rs. ${parseFloat(prod.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const compareFormatted = prod.compare_at_price 
    ? `<span class="price-compare">Rs. ${parseFloat(prod.compare_at_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>` 
    : '';

  return `
    <article class="product-card reveal-item">
      <div class="product-card-img-wrap">
        <a href="/product/${escapeHTML(prod.slug)}" aria-label="${escapeHTML(prod.name)}">
          <img class="product-card-img-primary" src="${escapeHTML(primaryImg)}" alt="${escapeHTML(prod.name)}" loading="lazy" />
          ${secondaryImg ? `<img class="product-card-img-secondary" src="${escapeHTML(secondaryImg)}" alt="${escapeHTML(prod.name)} alternate view" loading="lazy" />` : ''}
        </a>
        <div class="product-badge-stack">${badgesHtml}</div>
        <button class="product-card-wishlist-btn quick-wishlist-btn" data-product-id="${prod.id}" title="Save to Wishlist" aria-label="Save to Wishlist">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
        <button class="product-card-quick-add quick-add-btn" data-product-id="${prod.id}" ${isOutOfStock ? 'disabled' : ''}>
          ${isOutOfStock ? 'Sold Out' : 'Quick Add +'}
        </button>
      </div>
      <div class="product-card-body">
        <div class="product-card-category">${escapeHTML(prod.category_name || 'Archive')}</div>
        <h4 class="product-card-title">
          <a href="/product/${escapeHTML(prod.slug)}">${escapeHTML(prod.name)}</a>
        </h4>
        <div class="product-card-price-row">
          <span class="price-current">${priceFormatted}</span>
          ${compareFormatted}
        </div>
      </div>
    </article>
  `;
}

async function handleAddToCart(productId, btn) {
  if (!window.api.isAuthenticated()) {
    showToast('Sign In Required', 'Please log in to add items to your shopping bag.', 'info');
    setTimeout(() => {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }, 1000);
    return;
  }

  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Adding...`;

  try {
    const res = await window.api.post('/cart', { productId: parseInt(productId, 10), quantity: 1 });
    if (res.success) {
      showToast('Added to Cart', 'Item added to your shopping bag.', 'success');
      window.dispatchEvent(new CustomEvent('cart-updated'));
      const badge = document.getElementById('cart-count-badge');
      if (badge && window.MotionManager) {
        window.MotionManager.popBadge(badge);
      }
    }
  } catch (err) {
    showToast('Cart Error', err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

async function handleAddToWishlist(productId, btn) {
  if (!window.api.isAuthenticated()) {
    showToast('Sign In Required', 'Please log in to save items to your wishlist.', 'info');
    setTimeout(() => {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }, 1000);
    return;
  }

  try {
    const res = await window.api.post('/wishlist', { productId: parseInt(productId, 10) });
    if (res.success) {
      showToast('Saved to Wishlist', 'Artifact saved to your wishlist.', 'success');
      window.dispatchEvent(new CustomEvent('wishlist-updated'));
      btn.style.color = 'var(--accent)';
      if (window.MotionManager) {
        window.MotionManager.heartBeat(btn);
      }
    }
  } catch (err) {
    showToast('Wishlist Error', err.message, 'error');
  }
}

function renderShopPagination(container, meta) {
  if (!container || meta.totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = `
    <button class="pagination-btn" id="shop-pg-prev" ${meta.page <= 1 ? 'disabled' : ''}>&larr;</button>
  `;

  for (let i = 1; i <= meta.totalPages; i++) {
    html += `
      <button class="pagination-btn ${i === meta.page ? 'active' : ''}" data-page="${i}">${i}</button>
    `;
  }

  html += `
    <button class="pagination-btn" id="shop-pg-next" ${meta.page >= meta.totalPages ? 'disabled' : ''}>&rarr;</button>
  `;

  container.innerHTML = html;

  const prev = document.getElementById('shop-pg-prev');
  if (prev && meta.page > 1) {
    prev.addEventListener('click', () => {
      currentQuery.page--;
      loadShopProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const next = document.getElementById('shop-pg-next');
  if (next && meta.page < meta.totalPages) {
    next.addEventListener('click', () => {
      currentQuery.page++;
      loadShopProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  container.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentQuery.page = parseInt(btn.getAttribute('data-page'), 10);
      loadShopProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function setupShopControls() {
  const sortSelect = document.getElementById('shop-sort-select');
  if (sortSelect) {
    sortSelect.value = currentQuery.sort;
    sortSelect.addEventListener('change', () => {
      currentQuery.sort = sortSelect.value;
      currentQuery.page = 1;
      loadShopProducts();
    });
  }

  const searchInput = document.getElementById('shop-search-input');
  if (searchInput) {
    searchInput.value = currentQuery.search;
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        currentQuery.search = searchInput.value.trim();
        currentQuery.page = 1;
        loadShopProducts();
      }, 350);
    });
  }

  const minPriceInput = document.getElementById('shop-min-price');
  const maxPriceInput = document.getElementById('shop-max-price');
  const applyPriceBtn = document.getElementById('shop-apply-price');

  if (applyPriceBtn) {
    applyPriceBtn.addEventListener('click', () => {
      currentQuery.minPrice = minPriceInput ? minPriceInput.value : '';
      currentQuery.maxPrice = maxPriceInput ? maxPriceInput.value : '';
      currentQuery.page = 1;
      loadShopProducts();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('shop-products-grid')) {
    initShopPage();
  }
});

