const db = require('../../../config/database');

class AdminInventoryService {
  /**
   * Get inventory status across products
   */
  async getInventory(params = {}) {
    const page = Math.max(parseInt(params.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const conditions = ['p.is_active = 1'];
    const values = [];

    if (params.search && params.search.trim()) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
      const t = `%${params.search.trim()}%`;
      values.push(t, t);
    }

    if (params.stock_status === 'out') {
      conditions.push('p.stock_quantity = 0');
    } else if (params.stock_status === 'low') {
      conditions.push('p.stock_quantity <= p.low_stock_threshold AND p.stock_quantity > 0');
    } else if (params.stock_status === 'in') {
      conditions.push('p.stock_quantity > p.low_stock_threshold');
    }

    const whereSql = conditions.join(' AND ');

    const [countRows] = await db.query(
      `SELECT COUNT(*) as total FROM products p WHERE ${whereSql}`,
      values
    );
    const total = parseInt(countRows[0].total, 10);

    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.stock_quantity,
        p.low_stock_threshold,
        p.price,
        c.name AS category_name,
        (
          SELECT movement_type 
          FROM inventory_movements 
          WHERE product_id = p.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) AS last_movement_type,
        (
          SELECT created_at 
          FROM inventory_movements 
          WHERE product_id = p.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) AS last_movement_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${whereSql}
      ORDER BY 
        CASE 
          WHEN p.stock_quantity = 0 THEN 1 
          WHEN p.stock_quantity <= p.low_stock_threshold THEN 2 
          ELSE 3 
        END,
        p.stock_quantity ASC
      LIMIT ? OFFSET ?
    `, [...values, limit, offset]);

    return {
      inventory: rows.map(r => ({
        ...r,
        price: parseFloat(r.price)
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Adjust or restock product inventory with strict ACID transaction & audit logging
   */
  async adjustStock(productId, data, adminUserId) {
    if (typeof productId === 'object' && productId !== null) {
      data = productId;
      productId = data.productId || data.product_id;
      adminUserId = data.userId || data.adminUserId || adminUserId;
    }

    return await db.withTransaction(async (conn) => {
      const prodId = parseInt(productId, 10);
      const [rows] = await conn.query(
        'SELECT id, name, sku, stock_quantity, low_stock_threshold FROM products WHERE id = ? FOR UPDATE',
        [prodId]
      );

      if (!rows || rows.length === 0) {
        const err = new Error('Product not found.');
        err.statusCode = 404;
        throw err;
      }

      const product = rows[0];
      const previousStock = product.stock_quantity;
      const type = String(data.type || data.movement_type || 'STOCK_IN').toUpperCase(); // STOCK_IN, STOCK_OUT, ADJUSTMENT
      const note = String(data.note || data.notes || 'Manual admin inventory update').trim();

      let quantity = parseInt(data.quantity, 10);
      if (isNaN(quantity) || quantity < 0) {
        const err = new Error('Quantity must be a valid non-negative integer.');
        err.statusCode = 400;
        throw err;
      }

      let newStock = previousStock;
      let recordedMovementType = 'ADJUSTMENT';

      if (type === 'STOCK_IN' || type === 'RESTOCK') {
        newStock = previousStock + quantity;
        recordedMovementType = 'STOCK_IN';
      } else if (type === 'STOCK_OUT') {
        if (previousStock < quantity) {
          const err = new Error(`Cannot subtract ${quantity} items. Current stock is only ${previousStock}. Negative inventory is not permitted.`);
          err.statusCode = 400;
          throw err;
        }
        newStock = previousStock - quantity;
        recordedMovementType = 'STOCK_OUT';
      } else if (type === 'SET' || type === 'ADJUSTMENT') {
        newStock = quantity;
        recordedMovementType = 'ADJUSTMENT';
      } else {
        const err = new Error(`Invalid adjustment type "${type}". Allowed: STOCK_IN, STOCK_OUT, ADJUSTMENT`);
        err.statusCode = 400;
        throw err;
      }

      // Update product stock
      await conn.query('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStock, prodId]);

      // Record movement audit log
      const [movementRes] = await conn.query(`
        INSERT INTO inventory_movements (
          product_id, movement_type, quantity, previous_stock, new_stock,
          reference_type, reference_id, note, created_by
        ) VALUES (?, ?, ?, ?, ?, 'MANUAL_ADJUSTMENT', NULL, ?, ?)
      `, [
        prodId,
        recordedMovementType,
        Math.abs(newStock - previousStock),
        previousStock,
        newStock,
        note,
        adminUserId || null
      ]);

      return {
        product_id: prodId,
        name: product.name,
        sku: product.sku,
        previous_stock: previousStock,
        new_stock: newStock,
        movement_type: recordedMovementType,
        movement_id: movementRes.insertId
      };
    });
  }

  /**
   * Get inventory movement audit history
   */
  async getMovements(params = {}) {
    const page = Math.max(parseInt(params.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 15, 1), 100);
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const values = [];

    if (params.product_id) {
      conditions.push('im.product_id = ?');
      values.push(parseInt(params.product_id, 10));
    }

    if (params.movement_type) {
      conditions.push('im.movement_type = ?');
      values.push(params.movement_type);
    }

    if (params.search && params.search.trim()) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR im.note LIKE ?)');
      const t = `%${params.search.trim()}%`;
      values.push(t, t, t);
    }

    const whereSql = conditions.join(' AND ');

    const [countRows] = await db.query(`
      SELECT COUNT(*) as total 
      FROM inventory_movements im
      LEFT JOIN products p ON im.product_id = p.id
      WHERE ${whereSql}
    `, values);
    const total = parseInt(countRows[0].total, 10);

    const [rows] = await db.query(`
      SELECT 
        im.id,
        im.product_id,
        im.movement_type,
        im.quantity,
        im.previous_stock,
        im.new_stock,
        im.reference_type,
        im.reference_id,
        im.note,
        im.created_at,
        p.name AS product_name,
        p.sku AS product_sku,
        u.full_name AS admin_name
      FROM inventory_movements im
      LEFT JOIN products p ON im.product_id = p.id
      LEFT JOIN users u ON im.created_by = u.id
      WHERE ${whereSql}
      ORDER BY im.created_at DESC
      LIMIT ? OFFSET ?
    `, [...values, limit, offset]);

    return {
      movements: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new AdminInventoryService();
