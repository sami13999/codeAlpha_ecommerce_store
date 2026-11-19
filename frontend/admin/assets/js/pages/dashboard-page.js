/**
 * Admin Dashboard Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  const refreshBtn = document.getElementById('refresh-dashboard-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadDashboardData();
    });
  }

  await loadDashboardData();
});

async function loadDashboardData() {
  try {
    const res = await AdminAPI.request('/api/admin/dashboard');
    if (!res.success || !res.data) {
      throw new Error('Failed to retrieve dashboard data');
    }

    const { metrics, salesTrend, statusDistribution, recentOrders, lowStockProducts } = res.data;

    // Render Metrics
    renderMetrics(metrics);

    // Render Sales Trend Chart
    renderSalesChart(salesTrend);

    // Render Status Distribution
    renderStatusDistribution(statusDistribution);

    // Render Recent Orders
    renderRecentOrders(recentOrders);

    // Render Low Stock
    renderLowStock(lowStockProducts);

  } catch (err) {
    AdminToast.error(err.message || 'Error loading dashboard');
  }
}

function renderMetrics(m) {
  if (!m) return;

  const revEl = document.getElementById('metric-revenue');
  const todayRevEl = document.getElementById('val-today-rev');
  const ordersEl = document.getElementById('metric-orders');
  const todayOrdersEl = document.getElementById('val-today-orders');
  const pendingEl = document.getElementById('metric-pending');
  const custEl = document.getElementById('metric-customers');
  const prodEl = document.getElementById('metric-products');
  const lowEl = document.getElementById('metric-lowstock');

  if (revEl) revEl.textContent = AdminAPI.formatCurrency(m.total_revenue);
  if (todayRevEl) todayRevEl.textContent = AdminAPI.formatCurrency(m.today_revenue);
  if (ordersEl) ordersEl.textContent = Number(m.total_orders).toLocaleString();
  if (todayOrdersEl) todayOrdersEl.textContent = `${Number(m.today_orders)} today`;
  if (pendingEl) pendingEl.textContent = Number(m.pending_orders).toLocaleString();
  if (custEl) custEl.textContent = Number(m.total_customers).toLocaleString();
  if (prodEl) prodEl.textContent = Number(m.total_products).toLocaleString();
  if (lowEl) lowEl.textContent = Number(m.low_stock_items).toLocaleString();
}

function renderSalesChart(data) {
  const svg = document.getElementById('sales-svg');
  const tooltip = document.getElementById('chart-tooltip');
  if (!svg || !data || data.length === 0) return;

  const width = svg.parentElement.clientWidth || 500;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.innerHTML = '';

  const maxVal = Math.max(...data.map(d => parseFloat(d.daily_revenue || 0)), 100);
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    const val = maxVal - (maxVal / 4) * i;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', padding.left);
    line.setAttribute('y1', y);
    line.setAttribute('x2', width - padding.right);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', 'rgba(255,255,255,0.06)');
    line.setAttribute('stroke-dasharray', '3 3');
    svg.appendChild(line);

    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', padding.left - 8);
    txt.setAttribute('y', y + 4);
    txt.setAttribute('fill', 'var(--admin-text-muted)');
    txt.setAttribute('font-size', '10px');
    txt.setAttribute('text-anchor', 'end');
    txt.textContent = `$${Math.round(val)}`;
    svg.appendChild(txt);
  }

  // Calculate Points
  const stepX = chartW / (data.length - 1 || 1);
  const points = data.map((d, idx) => {
    const x = padding.left + idx * stepX;
    const rev = parseFloat(d.daily_revenue || 0);
    const y = padding.top + chartH - (rev / maxVal) * chartH;
    return { x, y, data: d };
  });

  // Area Path
  let areaD = `M ${points[0].x} ${points[0].y}`;
  points.forEach(p => { areaD += ` L ${p.x} ${p.y}`; });
  areaD += ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--admin-primary)" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="var(--admin-primary)" stop-opacity="0.0"/>
    </linearGradient>
  `;
  svg.appendChild(defs);

  const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  area.setAttribute('d', areaD);
  area.setAttribute('fill', 'url(#salesGrad)');
  svg.appendChild(area);

  // Line Path
  let lineD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    lineD += ` L ${points[i].x} ${points[i].y}`;
  }
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', lineD);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'var(--admin-primary)');
  path.setAttribute('stroke-width', '2.5');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);

  // Points & Labels
  points.forEach((p, idx) => {
    // Circle
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', p.x);
    c.setAttribute('cy', p.y);
    c.setAttribute('r', '4');
    c.setAttribute('fill', 'var(--admin-bg-surface)');
    c.setAttribute('stroke', 'var(--admin-primary)');
    c.setAttribute('stroke-width', '2');
    c.style.cursor = 'pointer';

    c.addEventListener('mouseenter', (e) => {
      c.setAttribute('r', '6');
      c.setAttribute('fill', 'var(--admin-primary)');
      if (tooltip) {
        tooltip.innerHTML = `
          <strong>${p.data.order_date}</strong><br>
          Revenue: ${AdminAPI.formatCurrency(p.data.daily_revenue)}<br>
          Orders: ${p.data.daily_orders}
        `;
        tooltip.style.display = 'block';
        tooltip.style.left = `${p.x - 40}px`;
        tooltip.style.top = `${p.y - 50}px`;
      }
    });

    c.addEventListener('mouseleave', () => {
      c.setAttribute('r', '4');
      c.setAttribute('fill', 'var(--admin-bg-surface)');
      if (tooltip) tooltip.style.display = 'none';
    });

    svg.appendChild(c);

    // Show date label on every 2nd or 3rd point
    if (idx % 2 === 0 || idx === points.length - 1) {
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('x', p.x);
      lbl.setAttribute('y', height - 10);
      lbl.setAttribute('fill', 'var(--admin-text-muted)');
      lbl.setAttribute('font-size', '9px');
      lbl.setAttribute('text-anchor', 'middle');
      const parts = (p.data.order_date || '').split('-');
      lbl.textContent = parts.length === 3 ? `${parts[1]}/${parts[2]}` : p.data.order_date;
      svg.appendChild(lbl);
    }
  });
}

function renderStatusDistribution(dist) {
  const box = document.getElementById('status-distribution-box');
  if (!box) return;

  if (!dist || dist.length === 0) {
    box.innerHTML = '<div class="admin-empty-state"><div class="empty-desc">No order data yet</div></div>';
    return;
  }

  const total = dist.reduce((acc, curr) => acc + parseInt(curr.count, 10), 0) || 1;

  let html = '<div style="display: flex; flex-direction: column; gap: 14px; padding-top: 8px;">';
  dist.forEach(item => {
    const count = parseInt(item.count, 10);
    const pct = Math.round((count / total) * 100);
    const badgeCls = AdminAPI.getBadgeClass(item.order_status);

    html += `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="admin-badge ${badgeCls}">${item.order_status}</span>
          </div>
          <span style="font-size: var(--admin-font-sm); font-weight: 600; color: var(--admin-text-primary);">
            ${count} <span style="font-weight: normal; color: var(--admin-text-muted);">(${pct}%)</span>
          </span>
        </div>
        <div style="width: 100%; height: 6px; background: var(--admin-bg-surface-elevated); border-radius: 999px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: var(--admin-primary); border-radius: 999px;"></div>
        </div>
      </div>
    `;
  });
  html += '</div>';

  box.innerHTML = html;
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('recent-orders-tbody');
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = DataTableUtils.getEmptyRowHtml(6, 'No Orders Yet', 'New customer orders will appear here.');
    return;
  }

  let html = '';
  orders.forEach(o => {
    const custName = o.first_name ? `${o.first_name} ${o.last_name || ''}`.trim() : (o.email || 'Customer');
    const statusBadge = AdminAPI.getBadgeClass(o.order_status);

    html += `
      <tr>
        <td>
          <a href="/admin/orders/${o.id}" style="font-family: var(--admin-font-mono); font-weight: 600; color: var(--admin-primary);">
            ${o.order_number}
          </a>
        </td>
        <td>
          <div style="font-weight: 500;">${custName}</div>
          <div style="font-size: var(--admin-font-xs); color: var(--admin-text-muted);">${o.email || ''}</div>
        </td>
        <td style="font-weight: 600;">${AdminAPI.formatCurrency(o.total_amount)}</td>
        <td><span class="admin-badge ${statusBadge}">${o.order_status}</span></td>
        <td style="font-size: var(--admin-font-xs); color: var(--admin-text-secondary);">${AdminAPI.formatDate(o.created_at)}</td>
        <td>
          <a href="/admin/orders/${o.id}" class="admin-btn admin-btn-xs admin-btn-outline">View</a>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function renderLowStock(products) {
  const tbody = document.getElementById('low-stock-tbody');
  if (!tbody) return;

  if (!products || products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 24px; color: var(--admin-success);">
          ✓ All products are healthy above low stock thresholds!
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  products.forEach(p => {
    const isOut = p.stock_quantity <= 0;
    const badgeCls = isOut ? 'badge-danger' : 'badge-warning';
    const statusTxt = isOut ? 'Out of Stock' : 'Low Stock';

    html += `
      <tr>
        <td>
          <div style="font-weight: 500;">${p.title}</div>
          <div style="font-size: var(--admin-font-xs); color: var(--admin-text-muted);">${p.category_name || ''}</div>
        </td>
        <td style="font-family: var(--admin-font-mono); font-size: var(--admin-font-xs);">${p.sku}</td>
        <td>
          <span style="font-weight: 700; color: ${isOut ? 'var(--admin-danger)' : 'var(--admin-warning)'};">
            ${p.stock_quantity}
          </span>
          <span style="font-size: var(--admin-font-xs); color: var(--admin-text-muted);">/ min ${p.low_stock_threshold || 5}</span>
        </td>
        <td><span class="admin-badge ${badgeCls}">${statusTxt}</span></td>
        <td>
          <a href="/admin/inventory" class="admin-btn admin-btn-xs admin-btn-primary">Restock</a>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}
