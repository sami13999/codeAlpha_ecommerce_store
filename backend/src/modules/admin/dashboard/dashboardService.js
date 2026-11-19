const db = require('../../../config/database');

class AdminDashboardService {
  /**
   * Aggregate high-level store KPI metrics
   */
  async getMetrics() {
    // 1. Total Revenue (excluding CANCELLED and RETURNED)
    const [revRows] = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS total_revenue
      FROM orders
      WHERE order_status NOT IN ('CANCELLED', 'RETURNED')
    `);
    const totalRevenue = parseFloat(revRows[0].total_revenue || 0);

    // 2. Total Orders
    const [ordRows] = await db.query('SELECT COUNT(*) AS total_orders FROM orders');
    const totalOrders = parseInt(ordRows[0].total_orders, 10);

    // 3. Total Customers
    const [custRows] = await db.query("SELECT COUNT(*) AS total_customers FROM users WHERE role = 'CUSTOMER'");
    const totalCustomers = parseInt(custRows[0].total_customers, 10);

    // 4. Total Products
    const [prodRows] = await db.query('SELECT COUNT(*) AS total_products FROM products WHERE is_active = 1');
    const totalProducts = parseInt(prodRows[0].total_products, 10);

    // 5. Pending Orders
    const [pendRows] = await db.query("SELECT COUNT(*) AS pending_orders FROM orders WHERE order_status = 'PENDING'");
    const pendingOrders = parseInt(pendRows[0].pending_orders, 10);

    // 6. Low Stock Products
    const [lowRows] = await db.query(`
      SELECT COUNT(*) AS low_stock_products 
      FROM products 
      WHERE stock_quantity <= low_stock_threshold AND is_active = 1
    `);
    const lowStockProducts = parseInt(lowRows[0].low_stock_products, 10);

    return {
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      total_customers: totalCustomers,
      total_products: totalProducts,
      pending_orders: pendingOrders,
      low_stock_products: lowStockProducts
    };
  }

  /**
   * Revenue and orders trend over recent time window
   */
  async getSalesTrends(days = 14) {
    const numDays = Math.min(Math.max(parseInt(days, 10) || 14, 7), 90);
    const [rows] = await db.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') AS date_label,
        COALESCE(SUM(total_amount), 0) AS revenue,
        COUNT(*) AS orders_count
      FROM orders
      WHERE order_status NOT IN ('CANCELLED', 'RETURNED')
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY date_label ASC
    `, [numDays]);

    return rows.map(r => ({
      date: r.date_label,
      revenue: parseFloat(r.revenue || 0),
      orders: parseInt(r.orders_count || 0, 10)
    }));
  }

  /**
   * Order status distribution
   */
  async getStatusDistribution() {
    const [rows] = await db.query(`
      SELECT order_status, COUNT(*) as count 
      FROM orders 
      GROUP BY order_status
    `);
    return rows.map(r => ({
      status: r.order_status,
      count: parseInt(r.count, 10)
    }));
  }

  /**
   * Recent orders widget
   */
  async getRecentOrders(limit = 6) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 20);
    const [rows] = await db.query(`
      SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.shipping_name,
        o.total_amount,
        o.order_status,
        o.payment_method,
        o.payment_status,
        o.created_at,
        u.email as customer_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT ?
    `, [lim]);

    return rows.map(r => ({
      ...r,
      total_amount: parseFloat(r.total_amount)
    }));
  }

  /**
   * Low stock alerts widget
   */
  async getLowStockAlerts(limit = 6) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 20);
    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.sku,
        p.price,
        p.stock_quantity,
        p.low_stock_threshold,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.stock_quantity <= p.low_stock_threshold AND p.is_active = 1
      ORDER BY p.stock_quantity ASC
      LIMIT ?
    `, [lim]);

    return rows;
  }

  /**
   * Top selling products
   */
  async getTopSellingProducts(limit = 5) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 20);
    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.sku,
        p.price,
        p.stock_quantity,
        COALESCE(SUM(oi.quantity), 0) AS units_sold,
        COALESCE(SUM(oi.line_total), 0) AS total_sales
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.order_status NOT IN ('CANCELLED', 'RETURNED')
      GROUP BY p.id
      ORDER BY units_sold DESC
      LIMIT ?
    `, [lim]);

    return rows.map(r => ({
      ...r,
      price: parseFloat(r.price),
      units_sold: parseInt(r.units_sold, 10),
      total_sales: parseFloat(r.total_sales)
    }));
  }
}

module.exports = new AdminDashboardService();
