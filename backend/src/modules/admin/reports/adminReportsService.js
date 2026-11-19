const db = require('../../../config/database');

class AdminReportsService {
  /**
   * Sales report with period grouping and date boundaries
   */
  async getSalesReport(params = {}) {
    const conditions = ["order_status NOT IN ('CANCELLED', 'RETURNED')"];
    const values = [];

    if (params.date_from) {
      conditions.push('created_at >= ?');
      values.push(params.date_from);
    }
    if (params.date_to) {
      conditions.push('created_at <= ?');
      values.push(params.date_to + ' 23:59:59');
    }

    const whereSql = conditions.join(' AND ');

    // Aggregates
    const [aggRows] = await db.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COUNT(*) AS total_orders,
        COALESCE(AVG(total_amount), 0) AS average_order_value,
        COALESCE(SUM(discount_amount), 0) AS total_discounts,
        COALESCE(SUM(delivery_fee), 0) AS total_delivery_fees
      FROM orders
      WHERE ${whereSql}
    `, values);

    const agg = aggRows[0];

    // Grouping by day
    const [timelineRows] = await db.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') AS period,
        COALESCE(SUM(total_amount), 0) AS revenue,
        COUNT(*) AS orders_count,
        COALESCE(AVG(total_amount), 0) AS aov
      FROM orders
      WHERE ${whereSql}
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY period ASC
    `, values);

    return {
      summary: {
        total_revenue: parseFloat(agg.total_revenue),
        total_orders: parseInt(agg.total_orders, 10),
        average_order_value: parseFloat(agg.average_order_value),
        total_discounts: parseFloat(agg.total_discounts),
        total_delivery_fees: parseFloat(agg.total_delivery_fees)
      },
      timeline: timelineRows.map(r => ({
        period: r.period,
        revenue: parseFloat(r.revenue),
        orders: parseInt(r.orders_count, 10),
        aov: parseFloat(r.aov)
      }))
    };
  }

  /**
   * Product performance report
   */
  async getProductPerformance(limit = 15) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 15, 1), 50);
    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.price,
        p.stock_quantity,
        c.name AS category_name,
        COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
        COALESCE(SUM(oi.line_total), 0) AS total_gross_sales
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.order_status NOT IN ('CANCELLED', 'RETURNED')
      GROUP BY p.id
      ORDER BY total_units_sold DESC, total_gross_sales DESC
      LIMIT ?
    `, [lim]);

    return rows.map(r => ({
      ...r,
      price: parseFloat(r.price),
      total_units_sold: parseInt(r.total_units_sold, 10),
      total_gross_sales: parseFloat(r.total_gross_sales)
    }));
  }

  /**
   * Customer acquisition and spend performance
   */
  async getCustomerPerformance(limit = 15) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 15, 1), 50);
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.status,
        u.created_at,
        COUNT(o.id) AS orders_count,
        COALESCE(SUM(o.total_amount), 0) AS total_spend
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.order_status NOT IN ('CANCELLED', 'RETURNED')
      WHERE u.role = 'CUSTOMER'
      GROUP BY u.id
      ORDER BY total_spend DESC, orders_count DESC
      LIMIT ?
    `, [lim]);

    return rows.map(r => ({
      ...r,
      orders_count: parseInt(r.orders_count, 10),
      total_spend: parseFloat(r.total_spend)
    }));
  }

  /**
   * Export sales report to CSV
   */
  async exportSalesCsv(params = {}) {
    const report = await this.getSalesReport(params);
    let csv = 'Period Date,Orders Count,Revenue (PKR),Average Order Value (PKR)\r\n';
    report.timeline.forEach(row => {
      csv += `"${row.period}",${row.orders},${row.revenue.toFixed(2)},${row.aov.toFixed(2)}\r\n`;
    });
    csv += `\r\nSummary,Total Orders: ${report.summary.total_orders},Total Revenue: ${report.summary.total_revenue.toFixed(2)},Overall AOV: ${report.summary.average_order_value.toFixed(2)}\r\n`;
    return csv;
  }
}

module.exports = new AdminReportsService();
