/**
 * MAISON & CO. — PRODUCTS CATALOG SCRIPT
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

async function initProductCatalog() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('category')) currentQuery.category = urlParams.get('category');
  if (urlParams.get('search')) currentQuery.search = urlParams.get('search');
  if (urlParams.get('sort')) currentQuery.sort = urlParams.get('sort');
  if (urlParams.get('page')) currentQuery.page = parseInt(urlParams.get('page'), 10) || 1;

  // Load Categories for filter pills
  await loadCategoryPills();

  // Load and render products
  await loadProducts();

  // Setup event listeners
  setupCatalogControls();
}

async function loadCategoryPills() {
  const container = document.getElementById('category-filter-pills');
  if (!container) return;

  try {
    const res = await window.api.get('/products/categories');
    if (res.success && res.data && res.data.all) {
      const categories = res.data.all;
      let html = `
        <button class="filter-pill ${!currentQuery.category ? 'active' : ''}" data-category="">
          All Objects
        </button>
      `;

      categories.forEach(cat => {
        const isActive = currentQuery.category === cat.slug ? 'active' : '';
        html += `
          <button class="filter-pill ${isActive}" data-category="${escapeHTML(cat.slug)}">
            ${escapeHTML(cat.name)} (${cat.product_count})
          </button>
        `;
      });

      container.innerHTML = html;

      // Attach click handlers
      container.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentQuery.category = btn.getAttribute('data-category');
          currentQuery.page = 1;
          loadProducts();
        });
      });
    }
  } catch (err) {
    console.error('Error loading category pills:', err);
  }
}

async function loadProducts() {
  const grid = document.getElementById('products-grid');
  const paginationContainer = document.getElementById('products-pagination');
  const countIndicator = document.getElementById('products-count-indicator');

  if (!grid) return;

  // Render skeleton loading
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
            <div class="empty-state-icon">
              <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <h3 class="empty-state-title">No Matching Artifacts Found</h3>
            <p class="empty-state-desc">We couldn't find items matching your search or filters. Try clearing your search or switching categories.</p>
            <button class="btn btn-outline" id="clear-filters-btn">Clear All Filters</button>
          </div>
        `;
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
          clearBtn.addEventListener('click', () => {
            currentQuery = { page: 1, limit: 12, category: '', search: '', sort: 'featured' };
            const searchInput = document.getElementById('catalog-search-input');
            if (searchInput) searchInput.value = '';
            loadCategoryPills();
            loadProducts();
          });
        }
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
      }

      // Render product cards
      grid.innerHTML = products.map(prod => renderProductCard(prod)).join('');

      // Attach add-to-cart handlers
      grid.querySelectorAll('.quick-add-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const prodId = btn.getAttribute('data-product-id');
          await handleQuickAddToCart(prodId, btn);
        });
      });

      // Render Pagination
      renderPagination(paginationContainer, meta);
    }
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3 class="empty-state-title">Unable to Load Products</h3>
        <p class="empty-state-desc">${escapeHTML(err.message)}</p>
        <button class="btn btn-primary" onclick="loadProducts()">Try Again</button>
      </div>
    `;
  }
}

function renderProductCard(prod) {
  const defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
  const imgUrl = prod.primary_image || defaultImg;
  const isOutOfStock = prod.stock_quantity <= 0;

  let badgesHtml = '';
  if (isOutOfStock) {
    badgesHtml += `<span class="badge badge-stock-out">Out of Stock</span>`;
  } else if (prod.discount_percent > 0) {
    badgesHtml += `<span class="badge badge-discount">-${prod.discount_percent}%</span>`;
  }
  if (prod.is_featured && !isOutOfStock) {
    badgesHtml += `<span class="badge badge-featured">Featured</span>`;
  }

  const priceFormatted = `Rs. ${parseFloat(prod.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const comparePriceFormatted = prod.compare_at_price 
    ? `<span class="price-compare">Rs. ${parseFloat(prod.compare_at_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>` 
    : '';

  return `
    <article class="product-card">
      <a href="/pages/product.html?slug=${escapeHTML(prod.slug)}" class="product-card-img-wrap">
        <img src="${escapeHTML(imgUrl)}" alt="${escapeHTML(prod.name)}" loading="lazy" />
        <div class="product-badge-stack">
          ${badgesHtml}
        </div>
      </a>
      <div class="product-card-body">
        <div class="product-card-category">${escapeHTML(prod.category_name || 'Design Object')}</div>
        <h4 class="product-card-title">
          <a href="/pages/product.html?slug=${escapeHTML(prod.slug)}">${escapeHTML(prod.name)}</a>
        </h4>
        <div class="product-card-price-row">
          <span class="price-current">${priceFormatted}</span>
          ${comparePriceFormatted}
        </div>
        <div class="product-card-action">
          <button 
            class="btn btn-outline btn-full btn-sm quick-add-btn" 
            data-product-id="${prod.id}"
            ${isOutOfStock ? 'disabled' : ''}
          >
            ${isOutOfStock ? 'Sold Out' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </article>
  `;
}

async function handleQuickAddToCart(productId, buttonElement) {
  if (!window.api.isAuthenticated()) {
    showToast('Sign In Required', 'Please log in to add items to your cart.', 'info');
    setTimeout(() => {
      window.location.href = `/auth.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }, 1200);
    return;
  }

  const originalContent = buttonElement.innerHTML;
  buttonElement.disabled = true;
  buttonElement.innerHTML = `<span class="spinner"></span> Adding...`;

  try {
    const res = await window.api.post('/cart', {
      productId: parseInt(productId, 10),
      quantity: 1
    });

    if (res.success) {
      showToast('Added to Cart', 'Item successfully added to your shopping bag.', 'success');
      window.dispatchEvent(new CustomEvent('cart-updated'));
    }
  } catch (err) {
    showToast('Cart Error', err.message, 'error');
  } finally {
    buttonElement.disabled = false;
    buttonElement.innerHTML = originalContent;
  }
}

function renderPagination(container, meta) {
  if (!container || meta.totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = `
    <button class="pagination-btn" id="pg-prev" ${meta.page <= 1 ? 'disabled' : ''}>
      &larr;
    </button>
  `;

  for (let i = 1; i <= meta.totalPages; i++) {
    html += `
      <button class="pagination-btn ${i === meta.page ? 'active' : ''}" data-page="${i}">
        ${i}
      </button>
    `;
  }

  html += `
    <button class="pagination-btn" id="pg-next" ${meta.page >= meta.totalPages ? 'disabled' : ''}>
      &rarr;
    </button>
  `;

  container.innerHTML = html;

  // Handlers
  const prevBtn = document.getElementById('pg-prev');
  if (prevBtn && meta.page > 1) {
    prevBtn.addEventListener('click', () => {
      currentQuery.page--;
      loadProducts();
      window.scrollTo({ top: document.getElementById('shop-section').offsetTop - 90, behavior: 'smooth' });
    });
  }

  const nextBtn = document.getElementById('pg-next');
  if (nextBtn && meta.page < meta.totalPages) {
    nextBtn.addEventListener('click', () => {
      currentQuery.page++;
      loadProducts();
      window.scrollTo({ top: document.getElementById('shop-section').offsetTop - 90, behavior: 'smooth' });
    });
  }

  container.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentQuery.page = parseInt(btn.getAttribute('data-page'), 10);
      loadProducts();
      window.scrollTo({ top: document.getElementById('shop-section').offsetTop - 90, behavior: 'smooth' });
    });
  });
}

function setupCatalogControls() {
  const sortSelect = document.getElementById('catalog-sort-select');
  if (sortSelect) {
    sortSelect.value = currentQuery.sort;
    sortSelect.addEventListener('change', () => {
      currentQuery.sort = sortSelect.value;
      currentQuery.page = 1;
      loadProducts();
    });
  }

  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput) {
    searchInput.value = currentQuery.search;
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentQuery.search = searchInput.value.trim();
        currentQuery.page = 1;
        loadProducts();
      }, 350);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('products-grid')) {
    initProductCatalog();
  }
});

