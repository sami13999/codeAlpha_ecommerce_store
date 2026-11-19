/**
 * Newsletter Subscribers Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  let currentPage = 1;
  const limit = 15;

  const tbody = document.getElementById('subscribers-tbody');
  const searchInput = document.getElementById('subscriber-search');
  const statusSelect = document.getElementById('subscriber-status');
  const exportBtn = document.getElementById('export-subscribers-btn');

  searchInput.addEventListener('input', DataTableUtils.debounce(() => loadSubscribers(1), 350));
  statusSelect.addEventListener('change', () => loadSubscribers(1));

  exportBtn.addEventListener('click', handleExportCsv);

  await loadSubscribers(1);

  async function loadSubscribers(page = 1) {
    currentPage = page;
    tbody.innerHTML = DataTableUtils.getLoadingRowHtml(4, 'Loading newsletter subscribers...');

    const params = new URLSearchParams({ page, limit });
    if (searchInput.value.trim()) params.append('search', searchInput.value.trim());
    if (statusSelect.value) params.append('status', statusSelect.value);

    try {
      const res = await AdminAPI.request(`/api/admin/newsletter?${params.toString()}`);
      if (!res.success || !res.data) throw new Error('Failed to load subscribers');

      renderTable(res.data.subscribers);
      renderPagination(res.data.pagination);
    } catch (err) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(4, 'Error loading subscribers', err.message);
      AdminToast.error(err.message || 'Error loading subscribers');
    }
  }

  function renderTable(subscribers) {
    if (!subscribers || subscribers.length === 0) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(4, 'No Subscribers Found', 'No records match your criteria.');
      return;
    }

    let html = '';
    subscribers.forEach(s => {
      const isSub = s.status === 'SUBSCRIBED';
      const badgeCls = isSub ? 'badge-success' : 'badge-neutral';

      html += `
        <tr>
          <td style="font-family: var(--admin-font-mono); color: var(--admin-text-muted);">${s.id}</td>
          <td>
            <a href="mailto:${s.email}" style="font-weight: 600; color: var(--admin-text-primary);">
              ${s.email}
            </a>
          </td>
          <td>
            <span class="admin-badge ${badgeCls}">${s.status}</span>
          </td>
          <td style="font-size: var(--admin-font-xs); color: var(--admin-text-secondary);">
            ${AdminAPI.formatDate(s.created_at, true)}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  function renderPagination(pagination) {
    const container = document.getElementById('subscribers-pagination-container');
    container.innerHTML = '';
    const el = DataTableUtils.renderPagination(pagination, (newPage) => {
      loadSubscribers(newPage);
    });
    if (el) container.appendChild(el);
  }

  async function handleExportCsv() {
    try {
      AdminToast.info('Preparing CSV export...');
      const token = AdminAPI.getToken();
      const res = await fetch('/api/admin/newsletter/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to download CSV');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter_subscribers_${new Date().toISOString().substring(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      AdminToast.success('Subscribers CSV exported successfully');
    } catch (err) {
      AdminToast.error(err.message || 'Failed to export CSV');
    }
  }
});
