/**
 * Business Reports & Analytics Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  const startDateInput = document.getElementById('report-start-date');
  const endDateInput = document.getElementById('report-end-date');
  const applyBtn = document.getElementById('apply-date-filter-btn');
  const exportBtn = document.getElementById('export-report-btn');

  // Set default dates: 30 days ago to today
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  endDateInput.value = today.toISOString().substring(0, 10);
  startDateInput.value = thirtyDaysAgo.toISOString().substring(0, 10);

  // Tabs
  const tabSalesBtn = document.getElementById('tab-sales-btn');
  const tabProductsBtn = document.getElementById('tab-products-btn');
  const tabCustomersBtn = document.getElementById('tab-customers-btn');

  const tabSalesPane = document.getElementById('tab-sales-pane');
  const tabProductsPane = document.getElementById('tab-products-pane');
  const tabCustomersPane = document.getElementById('tab-customers-pane');

  tabSalesBtn.addEventListener('click', () => switchTab('sales'));
  tabProductsBtn.addEventListener('click', () => switchTab('products'));
  tabCustomersBtn.addEventListener('click', () => switchTab('customers'));

  function switchTab(tab) {
    [tabSalesBtn, tabProductsBtn, tabCustomersBtn].forEach(b => b.classList.remove('active'));
    [tabSalesPane, tabProductsPane, tabCustomersPane].forEach(p => p.style.display = 'none');

    if (tab === 'sales') {
      tabSalesBtn.classList.add('active');
      tabSalesPane.style.display = 'block';
    } else if (tab === 'products') {
      tabProductsBtn.classList.add('active');
      tabProductsPane.style.display = 'block';
      loadProductsReport();
    } else if (tab === 'customers') {
      tabCustomersBtn.classList.add('active');
      tabCustomersPane.style.display = 'block';
      loadCustomersReport();
    }
  }

  applyBtn.addEventListener('click', () => {
    loadSalesReport();
  });

  exportBtn.addEventListener('click', handleExportReport);

  // Initial load
  await loadSalesReport();

  async function loadSalesReport() {
    const start = startDateInput.value;
    const end = endDateInput.value;

    const tbody = document.getElementById('timeline-tbody');
    tbody.innerHTML = DataTableUtils.getLoadingRowHtml(4, 'Computing sales performance...');

    try {
      const res = await AdminAPI.request(`/api/admin/reports/sales?start_date=${start}&end_date=${end}`);
      if (!res.success || !res.data) throw new Error('Failed to load sales report');

      const { summary, timeline } = res.data;

      // Summary
      const rev = parseFloat(summary.total_revenue || 0);
      const orders = parseInt(summary.total_orders || 0, 10);
      const discount = parseFloat(summary.total_discount || 0);
      const aov = orders > 0 ? rev / orders : 0;

      document.getElementById('rep-period-revenue').textContent = AdminAPI.formatCurrency(rev);
      document.getElementById('rep-period-orders').textContent = orders;
      document.getElementById('rep-period-aov').textContent = AdminAPI.formatCurrency(aov);
      document.getElementById('rep-period-discount').textContent = AdminAPI.formatCurrency(discount);

      // Timeline
      if (!timeline || timeline.length === 0) {
        tbody.innerHTML = DataTableUtils.getEmptyRowHtml(4, 'No Sales in Period', 'Try expanding the date range.');
        return;
      }

      let html = '';
      timeline.forEach(row => {
        const dRev = parseFloat(row.daily_revenue || 0);
        const dOrders = parseInt(row.daily_orders || 0, 10);
        const dAov = dOrders > 0 ? dRev / dOrders : 0;

        html += `
          <tr>
            <td><strong>${row.order_date}</strong></td>
            <td>${dOrders} orders</td>
            <td style="font-weight: 600; color: var(--admin-primary);">${AdminAPI.formatCurrency(dRev)}</td>
            <td>${AdminAPI.formatCurrency(dAov)}</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;

    } catch (err) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(4, 'Error Loading Report', err.message);
      AdminToast.error(err.message || 'Failed to load report');
    }
  }

  async function loadProductsReport() {
    const tbody = document.getElementById('top-products-tbody');
    tbody.innerHTML = DataTableUtils.getLoadingRowHtml(4, 'Analyzing product sales...');

    try {
      const res = await AdminAPI.request('/api/admin/reports/products');
      if (!res.success || !res.data) throw new Error('Failed to load product performance');

      const products = res.data;
      if (!products || products.length === 0) {
        tbody.innerHTML = DataTableUtils.getEmptyRowHtml(4, 'No Product Sales Data', 'Products with fulfilled orders will appear here.');
        return;
      }

      let html = '';
      products.forEach(p => {
        html += `
          <tr>
            <td>
              <div style="font-weight: 600;">${p.title}</div>
            </td>
            <td><code>${p.sku || '—'}</code></td>
            <td><strong style="color: var(--admin-text-primary);">${p.total_units_sold}</strong> units</td>
            <td style="font-weight: 600; color: var(--admin-primary);">${AdminAPI.formatCurrency(p.total_revenue)}</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    } catch (err) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(4, 'Error', err.message);
    }
  }

  async function loadCustomersReport() {
    const tbody = document.getElementById('top-customers-tbody');
    tbody.innerHTML = DataTableUtils.getLoadingRowHtml(4, 'Calculating top customer spend...');

    try {
      const res = await AdminAPI.request('/api/admin/reports/customers');
      if (!res.success || !res.data) throw new Error('Failed to load customer performance');

      const customers = res.data;
      if (!customers || customers.length === 0) {
        tbody.innerHTML = DataTableUtils.getEmptyRowHtml(4, 'No Customer Spend Data', 'Customers with completed orders will appear here.');
        return;
      }

      let html = '';
      customers.forEach(c => {
        const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Customer';
        html += `
          <tr>
            <td>
              <a href="/admin/customers/${c.id}" style="font-weight: 600; color: var(--admin-primary);">${name}</a>
            </td>
            <td>${c.email}</td>
            <td><span class="admin-badge badge-primary">${c.orders_count} orders</span></td>
            <td style="font-weight: 700; color: var(--admin-primary);">${AdminAPI.formatCurrency(c.total_spend)}</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    } catch (err) {
      tbody.innerHTML = DataTableUtils.getEmptyRowHtml(4, 'Error', err.message);
    }
  }

  async function handleExportReport() {
    try {
      AdminToast.info('Generating Sales CSV...');
      const start = startDateInput.value;
      const end = endDateInput.value;
      const token = AdminAPI.getToken();

      const res = await fetch(`/api/admin/reports/export?start_date=${start}&end_date=${end}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_report_${start}_to_${end}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      AdminToast.success('Sales report exported successfully');
    } catch (e) {
      AdminToast.error(e.message || 'Export error');
    }
  }
});
