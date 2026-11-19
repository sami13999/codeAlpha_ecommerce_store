/**
 * Product Form (Add & Edit) Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  // Extract ID from path e.g. /admin/products/edit/5 or search param ?id=5
  const pathParts = window.location.pathname.split('/');
  let editId = null;
  if (pathParts.includes('edit')) {
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && !isNaN(parseInt(lastPart, 10))) {
      editId = parseInt(lastPart, 10);
    }
  }
  if (!editId) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) editId = parseInt(params.get('id'), 10);
  }

  const isEdit = !!editId;
  const pageTitle = document.getElementById('page-title');
  const formModeCrumb = document.getElementById('form-mode-crumb');
  const saveTopBtn = document.getElementById('save-product-top-btn');
  const form = document.getElementById('product-form');
  const catSelect = document.getElementById('product-category');
  const titleInput = document.getElementById('product-title');
  const slugInput = document.getElementById('product-slug');
  const imageInputsContainer = document.getElementById('image-inputs-container');
  const addImageBtn = document.getElementById('add-image-url-btn');

  let slugManual = false;
  slugInput.addEventListener('input', () => {
    slugManual = slugInput.value.length > 0;
  });

  titleInput.addEventListener('input', () => {
    if (!slugManual && !isEdit) {
      slugInput.value = titleInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  });

  if (saveTopBtn) {
    saveTopBtn.addEventListener('click', () => {
      form.requestSubmit();
    });
  }

  addImageBtn.addEventListener('click', () => {
    addImageRow();
  });

  // Load categories
  await loadCategories();

  if (isEdit) {
    if (pageTitle) pageTitle.textContent = `Edit Product #${editId}`;
    if (formModeCrumb) formModeCrumb.textContent = `Edit #${editId}`;
    await loadProductData(editId);
  } else {
    // Add one default empty image row
    addImageRow('', true);
  }

  async function loadCategories() {
    try {
      const res = await AdminAPI.request('/api/admin/categories');
      if (res && res.data) {
        let opts = '<option value="">Select Category</option>';
        res.data.forEach(c => {
          opts += `<option value="${c.id}">${c.name}</option>`;
        });
        catSelect.innerHTML = opts;
      }
    } catch (e) {
      AdminToast.error('Failed to load categories');
    }
  }

  function addImageRow(url = '', isPrimary = false) {
    const rowId = 'img-row-' + Math.random().toString(36).substring(2, 9);
    const div = document.createElement('div');
    div.className = 'image-preview-item';
    div.id = rowId;

    div.innerHTML = `
      <img src="${url || '/assets/images/placeholder-product.svg'}" class="image-thumb-box" alt="Preview" onerror="this.src='/assets/images/placeholder-product.svg'">
      <div style="flex: 1;">
        <input type="url" class="admin-input image-url-input" placeholder="https://example.com/image.jpg" value="${url}">
      </div>
      <label class="admin-checkbox-label" style="margin: 0; white-space: nowrap;">
        <input type="radio" name="primary_image_radio" class="primary-radio" ${isPrimary ? 'checked' : ''}>
        <span style="font-size: var(--admin-font-xs);">Primary</span>
      </label>
      <button type="button" class="admin-btn admin-btn-xs admin-btn-danger remove-img-btn" title="Remove image">&times;</button>
    `;

    imageInputsContainer.appendChild(div);

    const input = div.querySelector('.image-url-input');
    const thumb = div.querySelector('.image-thumb-box');
    const removeBtn = div.querySelector('.remove-img-btn');

    input.addEventListener('input', () => {
      thumb.src = input.value.trim() || '/assets/images/placeholder-product.svg';
    });

    removeBtn.addEventListener('click', () => {
      div.remove();
      // Ensure at least one primary remains if any rows exist
      const remaining = imageInputsContainer.querySelectorAll('.primary-radio');
      const hasChecked = Array.from(remaining).some(r => r.checked);
      if (!hasChecked && remaining.length > 0) {
        remaining[0].checked = true;
      }
    });

    // If first row, make it primary
    const allRadios = imageInputsContainer.querySelectorAll('.primary-radio');
    if (allRadios.length === 1) {
      allRadios[0].checked = true;
    }
  }

  async function loadProductData(id) {
    try {
      const res = await AdminAPI.request(`/api/admin/products/${id}`);
      if (!res.success || !res.data) throw new Error('Product not found');

      const p = res.data;
      titleInput.value = p.title || '';
      slugInput.value = p.slug || '';
      slugManual = true;
      document.getElementById('product-sku').value = p.sku || '';
      document.getElementById('product-description').value = p.description || '';
      document.getElementById('product-stock').value = p.stock_quantity ?? 0;
      document.getElementById('product-low-threshold').value = p.low_stock_threshold ?? 5;
      catSelect.value = p.category_id || '';
      document.getElementById('product-brand').value = p.brand || '';
      document.getElementById('product-price').value = p.price || '';
      document.getElementById('product-compare-price').value = p.compare_at_price || '';
      document.getElementById('product-cost-price').value = p.cost_price || '';
      document.getElementById('product-active').checked = !!p.is_active;
      document.getElementById('product-featured').checked = !!p.is_featured;

      // Images
      imageInputsContainer.innerHTML = '';
      if (p.images && p.images.length > 0) {
        p.images.forEach(img => {
          addImageRow(img.image_url, !!img.is_primary);
        });
      } else {
        addImageRow('', true);
      }
    } catch (err) {
      AdminToast.error(err.message || 'Error fetching product');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const category_id = parseInt(catSelect.value, 10);
    const price = parseFloat(document.getElementById('product-price').value);

    if (!title) {
      AdminToast.error('Please enter a product title');
      return;
    }
    if (!category_id) {
      AdminToast.error('Please select a category');
      return;
    }
    if (isNaN(price) || price < 0) {
      AdminToast.error('Please enter a valid price');
      return;
    }

    // Collect images
    const images = [];
    const rows = imageInputsContainer.querySelectorAll('.image-preview-item');
    rows.forEach(row => {
      const url = row.querySelector('.image-url-input').value.trim();
      const isPrimary = row.querySelector('.primary-radio').checked;
      if (url) {
        images.push({ image_url: url, is_primary: isPrimary ? 1 : 0 });
      }
    });

    // Ensure at least one is primary if images exist
    if (images.length > 0 && !images.some(img => img.is_primary === 1)) {
      images[0].is_primary = 1;
    }

    const payload = {
      title,
      slug: slugInput.value.trim() || undefined,
      sku: document.getElementById('product-sku').value.trim() || undefined,
      description: document.getElementById('product-description').value.trim() || undefined,
      category_id,
      brand: document.getElementById('product-brand').value.trim() || undefined,
      price,
      compare_at_price: document.getElementById('product-compare-price').value ? parseFloat(document.getElementById('product-compare-price').value) : null,
      cost_price: document.getElementById('product-cost-price').value ? parseFloat(document.getElementById('product-cost-price').value) : null,
      stock_quantity: parseInt(document.getElementById('product-stock').value, 10) || 0,
      low_stock_threshold: parseInt(document.getElementById('product-low-threshold').value, 10) || 5,
      is_active: document.getElementById('product-active').checked ? 1 : 0,
      is_featured: document.getElementById('product-featured').checked ? 1 : 0,
      images
    };

    try {
      const endpoint = isEdit ? `/api/admin/products/${editId}` : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await AdminAPI.request(endpoint, {
        method,
        body: payload
      });

      AdminToast.success(res.message || (isEdit ? 'Product updated successfully' : 'Product created successfully'));
      setTimeout(() => {
        window.location.href = '/admin/products';
      }, 700);
    } catch (err) {
      AdminToast.error(err.message || 'Failed to save product');
    }
  });
});
