/**
 * Reviews Moderation Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  let currentPage = 1;
  const limit = 10;

  const tbody = document.getElementById('reviews-tbody');
  const statusSelect = document.getElementById('filter-review-status');
  const refreshBtn = document.getElementById('review-refresh-btn');

  statusSelect.addEventListener('change', () => loadReviews(1));
  refreshBtn.addEventListener('click', () => loadReviews(currentPage));

  await loadReviews(1);

  async function loadReviews(page = 1) {
    currentPage = page;
    tbody.innerHTML = DataTableUtils.getLoadingRowHtml(7, 'Loading customer reviews...');

    const params = new URLSearchParams({ page, limit });
    if (statusSelect.value) params.append('status', statusSelect.value);

    try {
      const res = await AdminAPI.request(`/api/admin/reviews?${params.toString()}`);
      if (!res.success || !res.data) throw new Error('Failed to load reviews');

      renderTable(res.data.reviews);
      renderPagination(res.data.pagination);
    } catch (err) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(7, 'Error loading reviews', err.message);
      AdminToast.error(err.message || 'Error loading reviews');
    }
  }

  function renderTable(reviews) {
    if (!reviews || reviews.length === 0) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(7, 'No Reviews in this Queue', 'Select another status or check back later.');
      return;
    }

    let html = '';
    reviews.forEach(r => {
      const badgeCls = AdminAPI.getBadgeClass(r.status);
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const reviewer = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || 'Customer';

      html += `
        <tr>
          <td style="font-size: var(--admin-font-xs); color: var(--admin-text-secondary); white-space: nowrap;">
            ${AdminAPI.formatDate(r.created_at, false)}
          </td>
          <td>
            <a href="/admin/products/edit/${r.product_id}" style="font-weight: 600; color: var(--admin-primary);">
              ${r.product_title || `Product #${r.product_id}`}
            </a>
          </td>
          <td>
            <div style="font-weight: 500;">${reviewer}</div>
            <div style="font-size: var(--admin-font-xs); color: var(--admin-text-muted);">${r.email || ''}</div>
          </td>
          <td>
            <span style="color: #f59e0b; font-size: var(--admin-font-sm); letter-spacing: 2px;">
              ${stars}
            </span>
            <span style="font-size: var(--admin-font-xs); color: var(--admin-text-muted);">(${r.rating}/5)</span>
          </td>
          <td style="max-width: 320px;">
            ${r.title ? `<div style="font-weight: 600; margin-bottom: 2px;">${r.title}</div>` : ''}
            <div style="font-size: var(--admin-font-sm); color: var(--admin-text-secondary); line-height: 1.4;">
              ${r.comment || ''}
            </div>
          </td>
          <td>
            <span class="admin-badge ${badgeCls}">${r.status}</span>
          </td>
          <td style="text-align: right;">
            <div class="admin-action-group">
              ${r.status !== 'APPROVED' ? `
                <button class="admin-btn admin-btn-xs admin-btn-primary moderate-btn" data-id="${r.id}" data-action="APPROVED">
                  ✓ Approve
                </button>
              ` : ''}
              ${r.status !== 'REJECTED' ? `
                <button class="admin-btn admin-btn-xs admin-btn-danger moderate-btn" data-id="${r.id}" data-action="REJECTED">
                  ✕ Reject
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Attach Moderate Buttons
    tbody.querySelectorAll('.moderate-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const status = btn.dataset.action;
        try {
          const res = await AdminAPI.request(`/api/admin/reviews/${id}/status`, {
            method: 'PATCH',
            body: { status }
          });
          AdminToast.success(res.message || `Review marked as ${status}`);
          loadReviews(currentPage);
          AdminSidebar.updateBadges();
        } catch (err) {
          AdminToast.error(err.message || 'Failed to update review');
        }
      });
    });
  }

  function renderPagination(pagination) {
    const container = document.getElementById('reviews-pagination-container');
    container.innerHTML = '';
    const el = DataTableUtils.renderPagination(pagination, (newPage) => {
      loadReviews(newPage);
    });
    if (el) container.appendChild(el);
  }
});
