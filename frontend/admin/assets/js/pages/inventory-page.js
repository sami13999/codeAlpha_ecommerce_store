/**
 * Inventory Management Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  let currentLevelsPage = 1;
  let currentMovementsPage = 1;
  const limit = 10;

  let activeTab = 'levels'; // 'levels' | 'movements'
  let allProducts = [];

  const tabLevelsBtn = document.getElementById('tab-levels-btn');
  const tabMovementsBtn = document.getElementById('tab-movements-btn');
  const tabLevelsPane = document.getElementById('tab-levels-pane');
  const tabMovementsPane = document.getElementById('tab-movements-pane');

  const invSearch = document.getElementById('inv-search');
  const invStatus = document.getElementById('inv-filter-status');
  const invReset = document.getElementById('inv-reset-btn');

  const modal = document.getElementById('adjust-stock-modal');
  const openAdjustBtn = document.getElementById('open-adjust-modal-btn');
  const modalClose = document.getElementById('adjust-modal-close');
  const modalCancel = document.getElementById('adjust-modal-cancel');
  const adjustForm = document.getElementById('adjust-stock-form');
  const productSelect = document.getElementById('adjust-product-select');
  const typeSelect = document.getElementById('adjust-type-select');
  const qtyInput = document.getElementById('adjust-quantity-input');
  const notesInput = document.getElementById('adjust-notes-input');

  // Tab switching
  tabLevelsBtn.addEventListener('click', () => {
    activeTab = 'levels';
    tabLevelsBtn.classList.add('active');
    tabMovementsBtn.classList.remove('active');
    tabLevelsPane.style.display = 'block';
    tabMovementsPane.style.display = 'none';
  });

  tabMovementsBtn.addEventListener('click', () => {
    activeTab = 'movements';
    tabMovementsBtn.classList.add('active');
    tabLevelsBtn.classList.remove('active');
    tabLevelsPane.style.display = 'none';
    tabMovementsPane.style.display = 'block';
    loadMovements(1);
  });

  // Filters
  invSearch.addEventListener('input', DataTableUtils.debounce(() => {
    loadInventoryLevels(1);
  }, 350));

  invStatus.addEventListener('change', () => loadInventoryLevels(1));
  invReset.addEventListener('click', () => {
    invSearch.value = '';
    invStatus.value = '';
    loadInventoryLevels(1);
  });

  // Modal handlers
  openAdjustBtn.addEventListener('click', () => openAdjustModal());
  modalClose.addEventListener('click', () => modal.classList.remove('active'));
  modalCancel.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  // Initial load
  await loadInventoryLevels(1);
  await loadProductsForSelect();

  async function loadProductsForSelect() {
    try {
      const res = await AdminAPI.request('/api/admin/products?limit=100');
      if (res && res.data && res.data.products) {
        allProducts = res.data.products;
        let opts = '<option value="">Select a product...</option>';
        allProducts.forEach(p => {
          opts += `<option value="${p.id}">${p.title} (SKU: ${p.sku || 'N/A'}) - Current: ${p.stock_quantity}</option>`;
        });
        productSelect.innerHTML = opts;
      }
    } catch (e) {
      console.error('Failed to load products for dropdown', e);
    }
  }

  function openAdjustModal(productId = null) {
    if (productId) {
      productSelect.value = productId;
    }
    typeSelect.value = 'STOCK_IN';
    qtyInput.value = '10';
    notesInput.value = '';
    modal.classList.add('active');
  }

  async function loadInventoryLevels(page = 1) {
    currentLevelsPage = page;
    const tbody = document.getElementById('inv-levels-tbody');
    tbody.innerHTML = DataTableUtils.getLoadingRowHtml(7, 'Loading inventory stock...');

    const params = new URLSearchParams({ page, limit });
    if (invSearch.value.trim()) params.append('search', invSearch.value.trim());
    if (invStatus.value) params.append('status', invStatus.value);

    try {
      const res = await AdminAPI.request(`/api/admin/inventory?${params.toString()}`);
      if (!res.success || !res.data) throw new Error('Failed to load inventory');

      renderLevelsTable(res.data.products);
      renderLevelsPagination(res.data.pagination);
    } catch (err) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(7, 'Error loading inventory', err.message);
      AdminToast.error(err.message || 'Error loading inventory');
    }
  }

  function renderLevelsTable(products) {
    const tbody = document.getElementById('inv-levels-tbody');
    if (!products || products.length === 0) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(7, 'No products found', 'Try adjusting your search criteria.');
      return;
    }

    let html = '';
    products.forEach(p => {
      const stock = parseInt(p.stock_quantity, 10);
      const threshold = parseInt(p.low_stock_threshold || 5, 10);
      const isOut = stock <= 0;
      const isLow = !isOut && stock <= threshold;
      const badgeCls = isOut ? 'badge-danger' : (isLow ? 'badge-warning' : 'badge-success');
      const healthTxt = isOut ? 'OUT OF STOCK' : (isLow ? 'LOW STOCK' : 'HEALTHY');

      const img = p.primary_image || '/assets/images/placeholder-product.svg';

      html += `
        <tr>
          <td>
            <img src="${img}" alt="${p.title}" class="admin-table-thumb" onerror="this.src='/assets/images/placeholder-product.svg'">
          </td>
          <td>
            <div style="font-weight: 600; color: var(--admin-text-primary);">${p.title}</div>
            <div style="font-size: var(--admin-font-xs); color: var(--admin-text-muted); font-family: var(--admin-font-mono);">
              SKU: ${p.sku || '—'}
            </div>
          </td>
          <td><span class="admin-badge badge-neutral">${p.category_name || 'Unassigned'}</span></td>
          <td>
            <strong style="font-size: var(--admin-font-base); color: ${isOut ? 'var(--admin-danger)' : (isLow ? 'var(--admin-warning)' : 'inherit')};">
              ${stock}
            </strong>
          </td>
          <td style="color: var(--admin-text-muted); font-size: var(--admin-font-sm);">
            ${threshold}
          </td>
          <td><span class="admin-badge ${badgeCls}">${healthTxt}</span></td>
          <td style="text-align: right;">
            <button class="admin-btn admin-btn-xs admin-btn-primary quick-restock-btn" data-id="${p.id}">
              + Adjust Stock
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    tbody.querySelectorAll('.quick-restock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openAdjustModal(btn.dataset.id);
      });
    });
  }

  function renderLevelsPagination(pagination) {
    const container = document.getElementById('inv-pagination-container');
    container.innerHTML = '';
    const el = DataTableUtils.renderPagination(pagination, (newPage) => {
      loadInventoryLevels(newPage);
    });
    if (el) container.appendChild(el);
  }

  // Movements Audit Trail
  async function loadMovements(page = 1) {
    currentMovementsPage = page;
    const tbody = document.getElementById('inv-movements-tbody');
    tbody.innerHTML = DataTableUtils.getLoadingRowHtml(6, 'Loading movement audit logs...');

    try {
      const res = await AdminAPI.request(`/api/admin/inventory/movements?page=${page}&limit=${limit}`);
      if (!res.success || !res.data) throw new Error('Failed to load movements');

      renderMovementsTable(res.data.movements);
      renderMovementsPagination(res.data.pagination);
    } catch (err) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(6, 'Error loading movements', err.message);
      AdminToast.error(err.message || 'Error loading movements');
    }
  }

  function renderMovementsTable(movements) {
    const tbody = document.getElementById('inv-movements-tbody');
    if (!movements || movements.length === 0) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(6, 'No Movement Logs', 'No stock changes have been recorded yet.');
      return;
    }

    let html = '';
    movements.forEach(m => {
      const badgeCls = AdminAPI.getBadgeClass(m.movement_type);
      const isPos = m.quantity > 0;
      const qtyClass = isPos ? 'var(--admin-success)' : 'var(--admin-danger)';
      const qtySign = isPos ? `+${m.quantity}` : `${m.quantity}`;

      html += `
        <tr>
          <td style="font-size: var(--admin-font-xs); color: var(--admin-text-secondary);">
            ${AdminAPI.formatDate(m.created_at, true)}
          </td>
          <td>
            <div style="font-weight: 600;">${m.product_title || `Product #${m.product_id}`}</div>
            <div style="font-size: var(--admin-font-xs); color: var(--admin-text-muted); font-family: var(--admin-font-mono);">
              SKU: ${m.sku || '—'}
            </div>
          </td>
          <td><span class="admin-badge ${badgeCls}">${m.movement_type}</span></td>
          <td>
            <span style="font-weight: 700; color: ${qtyClass};">
              ${qtySign} units
            </span>
          </td>
          <td style="font-size: var(--admin-font-xs); font-family: var(--admin-font-mono);">
            ${m.reference_type || 'MANUAL'} ${m.reference_id ? `#${m.reference_id}` : ''}
          </td>
          <td style="font-size: var(--admin-font-sm); color: var(--admin-text-secondary);">
            ${m.notes || '—'}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  function renderMovementsPagination(pagination) {
    const container = document.getElementById('movements-pagination-container');
    container.innerHTML = '';
    const el = DataTableUtils.renderPagination(pagination, (newPage) => {
      loadMovements(newPage);
    });
    if (el) container.appendChild(el);
  }

  // Adjust Form Submit
  adjustForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const product_id = parseInt(productSelect.value, 10);
    const movement_type = typeSelect.value;
    const quantity = parseInt(qtyInput.value, 10);
    const notes = notesInput.value.trim();

    if (!product_id) {
      AdminToast.error('Please choose a product to adjust');
      return;
    }
    if (!quantity || quantity <= 0) {
      AdminToast.error('Please enter a positive quantity');
      return;
    }

    try {
      const res = await AdminAPI.request('/api/admin/inventory/adjust', {
        method: 'POST',
        body: { product_id, movement_type, quantity, notes }
      });

      AdminToast.success(res.message || 'Inventory adjusted successfully');
      modal.classList.remove('active');
      loadInventoryLevels(currentLevelsPage);
      loadProductsForSelect();
      AdminSidebar.updateBadges();
    } catch (err) {
      AdminToast.error(err.message || 'Adjustment failed');
    }
  });
});
