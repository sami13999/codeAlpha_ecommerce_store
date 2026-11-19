/**
 * Categories Management Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  const tbody = document.getElementById('categories-tbody');
  const modal = document.getElementById('category-modal');
  const modalTitle = document.getElementById('cat-modal-title');
  const form = document.getElementById('category-form');
  const idInput = document.getElementById('cat-id');
  const nameInput = document.getElementById('cat-name');
  const slugInput = document.getElementById('cat-slug');
  const parentSelect = document.getElementById('cat-parent');
  const descInput = document.getElementById('cat-description');
  const activeInput = document.getElementById('cat-active');
  const openAddBtn = document.getElementById('open-add-cat-btn');
  const closeBtn = document.getElementById('cat-modal-close');
  const cancelBtn = document.getElementById('cat-modal-cancel');

  let categoriesList = [];

  // Auto slug generator
  let slugManual = false;
  slugInput.addEventListener('input', () => { slugManual = slugInput.value.length > 0; });
  nameInput.addEventListener('input', () => {
    if (!slugManual && !idInput.value) {
      slugInput.value = nameInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  });

  openAddBtn.addEventListener('click', () => {
    openModalForCreate();
  });

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  await loadCategories();

  async function loadCategories() {
    tbody.innerHTML = DataTableUtils.getLoadingRowHtml(7, 'Loading categories...');
    try {
      const res = await AdminAPI.request('/api/admin/categories');
      if (!res.success || !res.data) throw new Error('Failed to load categories');

      categoriesList = res.data;
      renderTable(categoriesList);
      updateParentSelectOptions();
    } catch (err) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(7, 'Error loading categories', err.message);
      AdminToast.error(err.message || 'Error loading categories');
    }
  }

  function renderTable(categories) {
    if (!categories || categories.length === 0) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(7, 'No categories found', 'Click "+ Add Category" above to create one.');
      return;
    }

    let html = '';
    categories.forEach(c => {
      const prodCount = parseInt(c.product_count, 10) || 0;

      html += `
        <tr>
          <td style="font-family: var(--admin-font-mono); color: var(--admin-text-muted);">${c.id}</td>
          <td>
            <div style="font-weight: 600; color: var(--admin-text-primary);">${c.name}</div>
            ${c.description ? `<div style="font-size: var(--admin-font-xs); color: var(--admin-text-muted);">${c.description}</div>` : ''}
          </td>
          <td>
            <code style="font-size: var(--admin-font-xs); color: var(--admin-primary);">${c.slug}</code>
          </td>
          <td>
            ${c.parent_name ? `<span class="admin-badge badge-neutral">${c.parent_name}</span>` : '<span style="color: var(--admin-text-muted); font-size: var(--admin-font-xs);">Top Level</span>'}
          </td>
          <td>
            <span class="admin-badge ${prodCount > 0 ? 'badge-primary' : 'badge-neutral'}">
              ${prodCount} products
            </span>
          </td>
          <td>
            <span class="admin-badge ${c.is_active ? 'badge-success' : 'badge-neutral'}">
              ${c.is_active ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td style="text-align: right;">
            <div class="admin-action-group">
              <button class="admin-btn admin-btn-xs admin-btn-outline edit-cat-btn" data-id="${c.id}">
                ✏️ Edit
              </button>
              <button class="admin-btn admin-btn-xs admin-btn-danger delete-cat-btn" data-id="${c.id}" data-name="${c.name}" data-count="${prodCount}">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Attach Edit Handlers
    tbody.querySelectorAll('.edit-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const cat = categoriesList.find(item => item.id === id);
        if (cat) openModalForEdit(cat);
      });
    });

    // Attach Delete Handlers
    tbody.querySelectorAll('.delete-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const count = parseInt(btn.dataset.count, 10);

        if (count > 0) {
          AdminToast.warning(`Cannot delete "${name}": It has ${count} products assigned. Reassign or delete the products first.`);
          return;
        }

        AdminConfirm.show({
          title: 'Delete Category',
          message: `Are you sure you want to delete category "${name}"?`,
          confirmText: 'Delete Category',
          confirmVariant: 'danger',
          onConfirm: async () => {
            try {
              const res = await AdminAPI.request(`/api/admin/categories/${id}`, { method: 'DELETE' });
              AdminToast.success(res.message || 'Category deleted');
              loadCategories();
            } catch (err) {
              AdminToast.error(err.message || 'Failed to delete category');
            }
          }
        });
      });
    });
  }

  function updateParentSelectOptions(excludeId = null) {
    let opts = '<option value="">None (Top-Level Category)</option>';
    categoriesList.forEach(c => {
      if (!excludeId || c.id !== excludeId) {
        opts += `<option value="${c.id}">${c.name}</option>`;
      }
    });
    parentSelect.innerHTML = opts;
  }

  function openModalForCreate() {
    modalTitle.textContent = 'Add Category';
    idInput.value = '';
    nameInput.value = '';
    slugInput.value = '';
    slugManual = false;
    descInput.value = '';
    activeInput.checked = true;
    updateParentSelectOptions();
    modal.classList.add('active');
    nameInput.focus();
  }

  function openModalForEdit(cat) {
    modalTitle.textContent = `Edit Category: ${cat.name}`;
    idInput.value = cat.id;
    nameInput.value = cat.name;
    slugInput.value = cat.slug;
    slugManual = true;
    descInput.value = cat.description || '';
    activeInput.checked = !!cat.is_active;
    updateParentSelectOptions(cat.id);
    parentSelect.value = cat.parent_id || '';
    modal.classList.add('active');
    nameInput.focus();
  }

  function closeModal() {
    modal.classList.remove('active');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = idInput.value;
    const name = nameInput.value.trim();
    if (!name) {
      AdminToast.error('Please enter a category name');
      return;
    }

    const payload = {
      name,
      slug: slugInput.value.trim() || undefined,
      parent_id: parentSelect.value ? parseInt(parentSelect.value, 10) : null,
      description: descInput.value.trim() || null,
      is_active: activeInput.checked ? 1 : 0
    };

    try {
      const endpoint = id ? `/api/admin/categories/${id}` : '/api/admin/categories';
      const method = id ? 'PUT' : 'POST';

      const res = await AdminAPI.request(endpoint, {
        method,
        body: payload
      });

      AdminToast.success(res.message || 'Category saved successfully');
      closeModal();
      loadCategories();
    } catch (err) {
      AdminToast.error(err.message || 'Failed to save category');
    }
  });
});
