/**
 * Products Management Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  let currentPage = 1;
  const limit = 10;

  const searchInput = document.getElementById('filter-search');
  const catSelect = document.getElementById('filter-category');
  const stockSelect = document.getElementById('filter-stock');
  const statusSelect = document.getElementById('filter-status');
  const resetBtn = document.getElementById('filter-reset-btn');

  // Load categories into filter dropdown
  await loadCategoryOptions();

  // Load products
  await loadProducts(1);

  // Search input debounced
  searchInput.addEventListener('input', DataTableUtils.debounce(() => {
    currentPage = 1;
    loadProducts(1);
  }, 350));

  catSelect.addEventListener('change', () => { currentPage = 1; loadProducts(1); });
  stockSelect.addEventListener('change', () => { currentPage = 1; loadProducts(1); });
  statusSelect.addEventListener('change', () => { currentPage = 1; loadProducts(1); });

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    catSelect.value = '';
    stockSelect.value = '';
    statusSelect.value = '';
    currentPage = 1;
    loadProducts(1);
  });

  async function loadCategoryOptions() {
    try {
      const res = await AdminAPI.request('/api/admin/categories');
      if (res && res.data) {
        let opts = '<option value="">All Categories</option>';
        res.data.forEach(c => {
          opts += `<option value="${c.id}">${c.name}</option>`;
        });
        catSelect.innerHTML = opts;
      }
    } catch (e) {
      console.error('Error loading category options:', e);
    }
  }

  async function loadProducts(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = DataTableUtils.getLoadingRowHtml(7, 'Loading products catalog...');

    const params = new URLSearchParams({
      page,
      limit
    });

    if (searchInput.value.trim()) params.append('search', searchInput.value.trim());
    if (catSelect.value) params.append('category_id', catSelect.value);
    if (stockSelect.value) params.append('stock_status', stockSelect.value);
    if (statusSelect.value !== '') params.append('is_active', statusSelect.value);

    try {
      const res = await AdminAPI.request(`/api/admin/products?${params.toString()}`);
      if (!res.success || !res.data) throw new Error('Failed to load products');

      renderTable(res.data.products);
      renderPagination(res.data.pagination);
    } catch (err) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(7, 'Failed to Load Products', err.message);
      AdminToast.error(err.message || 'Error loading products');
    }
  }

  function renderTable(products) {
    const tbody = document.getElementById('products-tbody');
    if (!products || products.length === 0) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(7, 'No Products Found', 'Try clearing your search or filter options.');
      return;
    }

    let html = '';
    products.forEach(p => {
      const isOut = p.stock_quantity <= 0;
      const isLow = !isOut && p.stock_quantity <= (p.low_stock_threshold || 5);
      const stockBadge = isOut ? 'badge-danger' : (isLow ? 'badge-warning' : 'badge-success');
      const stockText = isOut ? '0 (Out)' : (isLow ? `${p.stock_quantity} (Low)` : `${p.stock_quantity} in stock`);

      const imgUrl = p.primary_image || '/assets/images/placeholder-product.svg';

      html += `
        <tr>
          <td>
            <img src="${imgUrl}" alt="${p.title}" class="admin-table-thumb" onerror="this.src='/assets/images/placeholder-product.svg'">
          </td>
          <td>
            <div style="font-weight: 600; color: var(--admin-text-primary);">${p.title}</div>
            <div style="font-size: var(--admin-font-xs); color: var(--admin-text-muted); font-family: var(--admin-font-mono);">
              SKU: ${p.sku || '—'} ${p.brand ? `• Brand: ${p.brand}` : ''}
            </div>
          </td>
          <td>
            <span class="admin-badge badge-neutral">${p.category_name || 'Unassigned'}</span>
          </td>
          <td>
            <div style="font-weight: 600;">${AdminAPI.formatCurrency(p.price)}</div>
            ${p.compare_at_price ? `<div style="font-size: var(--admin-font-xs); color: var(--admin-text-muted); text-decoration: line-through;">${AdminAPI.formatCurrency(p.compare_at_price)}</div>` : ''}
          </td>
          <td>
            <span class="admin-badge ${stockBadge}">${stockText}</span>
          </td>
          <td>
            <button class="admin-badge ${p.is_active ? 'badge-success' : 'badge-neutral'} toggle-status-btn" 
                    data-id="${p.id}" 
                    style="cursor: pointer; border: none;"
                    title="Click to toggle status">
              ${p.is_active ? 'Active' : 'Inactive'}
            </button>
          </td>
          <td style="text-align: right;">
            <div class="admin-action-group">
              <a href="/admin/products/edit/${p.id}" class="admin-btn admin-btn-xs admin-btn-outline" title="Edit Product">
                ✏️ Edit
              </a>
              <button class="admin-btn admin-btn-xs admin-btn-danger delete-product-btn" 
                      data-id="${p.id}" 
                      data-title="${p.title}"
                      title="Delete Product">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Attach Toggle Status Event
    tbody.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          const res = await AdminAPI.request(`/api/admin/products/${id}/toggle-status`, { method: 'PATCH' });
          AdminToast.success(res.message || 'Product status updated');
          loadProducts(currentPage);
        } catch (e) {
          AdminToast.error(e.message || 'Failed to toggle status');
        }
      });
    });

    // Attach Delete Event
    tbody.querySelectorAll('.delete-product-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const title = btn.dataset.title;

        AdminConfirm.show({
          title: 'Delete Product',
          message: `Are you sure you want to delete product "${title}"? This action cannot be undone. (Products with historical orders will be safely marked inactive instead).`,
          confirmText: 'Delete Product',
          confirmVariant: 'danger',
          onConfirm: async () => {
            try {
              const res = await AdminAPI.request(`/api/admin/products/${id}`, { method: 'DELETE' });
              AdminToast.success(res.message || 'Product removed successfully');
              loadProducts(currentPage);
            } catch (e) {
              AdminToast.error(e.message || 'Failed to delete product');
            }
          }
        });
      });
    });
  }

  function renderPagination(pagination) {
    const container = document.getElementById('products-pagination-container');
    container.innerHTML = '';
    const el = DataTableUtils.renderPagination(pagination, (newPage) => {
      loadProducts(newPage);
    });
    if (el) container.appendChild(el);
  }
});
