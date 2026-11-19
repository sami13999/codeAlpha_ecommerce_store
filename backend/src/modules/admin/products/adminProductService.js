const db = require('../../../config/database');

class AdminProductService {
  /**
   * List products with admin filters, search, and pagination
   */
  async getProducts(params = {}) {
    const page = Math.max(parseInt(params.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const values = [];

    if (params.search && params.search.trim()) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)');
      const term = `%${params.search.trim()}%`;
      values.push(term, term, term);
    }

    if (params.category_id) {
      conditions.push('p.category_id = ?');
      values.push(parseInt(params.category_id, 10));
    }

    if (params.is_active !== undefined && params.is_active !== null && params.is_active !== '') {
      conditions.push('p.is_active = ?');
      values.push(parseInt(params.is_active, 10) === 1 ? 1 : 0);
    }

    if (params.stock_status === 'low') {
      conditions.push('p.stock_quantity <= p.low_stock_threshold AND p.stock_quantity > 0');
    } else if (params.stock_status === 'out') {
      conditions.push('p.stock_quantity = 0');
    } else if (params.stock_status === 'in') {
      conditions.push('p.stock_quantity > p.low_stock_threshold');
    }

    // Sort order
    let sortClause = 'p.created_at DESC';
    if (params.sort === 'price_asc') sortClause = 'p.price ASC';
    else if (params.sort === 'price_desc') sortClause = 'p.price DESC';
    else if (params.sort === 'stock_asc') sortClause = 'p.stock_quantity ASC';
    else if (params.sort === 'stock_desc') sortClause = 'p.stock_quantity DESC';
    else if (params.sort === 'name_asc') sortClause = 'p.name ASC';

    const whereSql = conditions.join(' AND ');

    // Total count
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM products p WHERE ${whereSql}`,
      values
    );
    const total = parseInt(countRows[0].total, 10);

    // Data rows with primary image
    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.name AS title,
        p.slug,
        p.sku,
        p.price,
        p.compare_at_price,
        p.stock_quantity,
        p.low_stock_threshold,
        p.brand,
        p.weight,
        p.is_featured,
        p.is_active,
        p.created_at,
        p.category_id,
        c.name AS category_name,
        (
          SELECT image_url 
          FROM product_images 
          WHERE product_id = p.id 
          ORDER BY is_primary DESC, sort_order ASC, id ASC 
          LIMIT 1
        ) AS primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${whereSql}
      ORDER BY ${sortClause}
      LIMIT ? OFFSET ?
    `, [...values, limit, offset]);

    return {
      products: rows.map(r => ({
        ...r,
        price: parseFloat(r.price),
        compare_at_price: r.compare_at_price ? parseFloat(r.compare_at_price) : null
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
   * Get single product with full image gallery and audit logs
   */
  async getProductById(id) {
    const prodId = parseInt(id, 10);
    const [rows] = await db.query(`
      SELECT 
        p.*,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
      LIMIT 1
    `, [prodId]);

    if (!rows || rows.length === 0) {
      const err = new Error('Product not found.');
      err.statusCode = 404;
      throw err;
    }

    const product = rows[0];
    product.title = product.name;
    product.price = parseFloat(product.price);
    product.compare_at_price = product.compare_at_price ? parseFloat(product.compare_at_price) : null;

    // Fetch images
    const [images] = await db.query(`
      SELECT id, image_url, alt_text, is_primary, sort_order
      FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, sort_order ASC, id ASC
    `, [prodId]);

    product.images = images;
    return product;
  }

  /**
   * Create a new product with images and initial stock movement inside a transaction
   */
  async createProduct(data, adminUserId) {
    return await db.withTransaction(async (conn) => {
      // 1. Validation & Slug / SKU collision check
      const name = String(data.name || data.title || '').trim();
      if (!name) {
        const err = new Error('Product title/name is required.');
        err.statusCode = 400;
        throw err;
      }

      let slug = data.slug ? String(data.slug).trim() : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const sku = String(data.sku || `SKU-${Date.now().toString(36).toUpperCase()}`).trim();

      const [existing] = await conn.query(
        'SELECT id, slug, sku FROM products WHERE slug = ? OR sku = ? LIMIT 1',
        [slug, sku]
      );
      if (existing.length > 0) {
        if (existing[0].sku === sku) {
          const err = new Error(`SKU "${sku}" is already assigned to another artifact.`);
          err.statusCode = 409;
          throw err;
        }
        // Append unique suffix to slug
        slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const price = parseFloat(data.price);
      if (isNaN(price) || price < 0) {
        const err = new Error('Price must be a valid non-negative number.');
        err.statusCode = 400;
        throw err;
      }

      const comparePrice = data.compare_at_price ? parseFloat(data.compare_at_price) : null;
      const initialStock = Math.max(parseInt(data.stock_quantity, 10) || 0, 0);
      const lowThreshold = Math.max(parseInt(data.low_stock_threshold, 10) || 5, 1);
      const categoryId = data.category_id ? parseInt(data.category_id, 10) : null;
      const isFeatured = data.is_featured ? 1 : 0;
      const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1;

      // 2. Insert into products
      const [insertRes] = await conn.query(`
        INSERT INTO products (
          category_id, name, slug, sku, short_description, description,
          price, compare_at_price, stock_quantity, low_stock_threshold,
          brand, weight, is_featured, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        categoryId,
        name,
        slug,
        sku,
        data.short_description || null,
        data.description || null,
        price,
        comparePrice,
        initialStock,
        lowThreshold,
        data.brand || null,
        data.weight ? parseFloat(data.weight) : null,
        isFeatured,
        isActive
      ]);

      const productId = insertRes.insertId;

      // 3. Insert images if provided
      if (Array.isArray(data.images) && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          const img = data.images[i];
          const imgUrl = typeof img === 'string' ? img : img.image_url;
          if (imgUrl && imgUrl.trim()) {
            await conn.query(`
              INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
              VALUES (?, ?, ?, ?, ?)
            `, [
              productId,
              imgUrl.trim(),
              (typeof img === 'object' && img.alt_text) ? img.alt_text : name,
              i === 0 ? 1 : ((typeof img === 'object' && img.is_primary) ? 1 : 0),
              i
            ]);
          }
        }
      }

      // 4. Record initial stock in inventory_movements if > 0
      if (initialStock > 0) {
        await conn.query(`
          INSERT INTO inventory_movements (
            product_id, movement_type, quantity, previous_stock, new_stock,
            reference_type, reference_id, note, created_by
          ) VALUES (?, 'STOCK_IN', ?, 0, ?, 'INITIAL_CATALOG', ?, 'Initial product inventory enrollment', ?)
        `, [
          productId,
          initialStock,
          initialStock,
          productId,
          adminUserId || null
        ]);
      }

      return {
        id: productId,
        name,
        slug,
        sku,
        price,
        stock_quantity: initialStock
      };
    });
  }

  /**
   * Update existing product
   */
  async updateProduct(id, data) {
    return await db.withTransaction(async (conn) => {
      const prodId = parseInt(id, 10);
      const [existing] = await conn.query('SELECT * FROM products WHERE id = ? LIMIT 1', [prodId]);
      if (!existing || existing.length === 0) {
        const err = new Error('Product not found.');
        err.statusCode = 404;
        throw err;
      }

      const p = existing[0];

      // Collision checks for SKU
      if (data.sku && data.sku.trim() !== p.sku) {
        const [skuCheck] = await conn.query(
          'SELECT id FROM products WHERE sku = ? AND id != ? LIMIT 1',
          [data.sku.trim(), prodId]
        );
        if (skuCheck.length > 0) {
          const err = new Error(`SKU "${data.sku}" is already assigned to another artifact.`);
          err.statusCode = 409;
          throw err;
        }
      }

      const updatedName = (data.name !== undefined || data.title !== undefined) ? String(data.name || data.title).trim() : p.name;
      const updatedSlug = data.slug !== undefined ? String(data.slug).trim() : p.slug;
      const updatedSku = data.sku !== undefined ? String(data.sku).trim() : p.sku;
      const updatedPrice = data.price !== undefined ? parseFloat(data.price) : parseFloat(p.price);
      const updatedCompare = data.compare_at_price !== undefined ? (data.compare_at_price ? parseFloat(data.compare_at_price) : null) : p.compare_at_price;
      const updatedCat = data.category_id !== undefined ? (data.category_id ? parseInt(data.category_id, 10) : null) : p.category_id;
      const updatedLow = data.low_stock_threshold !== undefined ? parseInt(data.low_stock_threshold, 10) : p.low_stock_threshold;
      const updatedActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : p.is_active;
      const updatedFeatured = data.is_featured !== undefined ? (data.is_featured ? 1 : 0) : p.is_featured;

      await conn.query(`
        UPDATE products SET
          category_id = ?,
          name = ?,
          slug = ?,
          sku = ?,
          short_description = ?,
          description = ?,
          price = ?,
          compare_at_price = ?,
          low_stock_threshold = ?,
          brand = ?,
          weight = ?,
          is_featured = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        updatedCat,
        updatedName,
        updatedSlug,
        updatedSku,
        data.short_description !== undefined ? data.short_description : p.short_description,
        data.description !== undefined ? data.description : p.description,
        updatedPrice,
        updatedCompare,
        updatedLow,
        data.brand !== undefined ? data.brand : p.brand,
        data.weight !== undefined ? (data.weight ? parseFloat(data.weight) : null) : p.weight,
        updatedFeatured,
        updatedActive,
        prodId
      ]);

      // If new images provided, sync them
      if (Array.isArray(data.images)) {
        await conn.query('DELETE FROM product_images WHERE product_id = ?', [prodId]);
        for (let i = 0; i < data.images.length; i++) {
          const img = data.images[i];
          const imgUrl = typeof img === 'string' ? img : img.image_url;
          if (imgUrl && imgUrl.trim()) {
            await conn.query(`
              INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
              VALUES (?, ?, ?, ?, ?)
            `, [
              prodId,
              imgUrl.trim(),
              (typeof img === 'object' && img.alt_text) ? img.alt_text : updatedName,
              i === 0 ? 1 : ((typeof img === 'object' && img.is_primary) ? 1 : 0),
              i
            ]);
          }
        }
      }

      return { id: prodId, name: updatedName, slug: updatedSlug, sku: updatedSku };
    });
  }

  /**
   * Delete product if unreferenced by orders, or soft deactivate
   */
  async deleteProduct(id) {
    const prodId = parseInt(id, 10);
    const [orders] = await db.query(
      'SELECT id FROM order_items WHERE product_id = ? LIMIT 1',
      [prodId]
    );

    if (orders.length > 0) {
      // Historical references exist - perform soft deactivation
      await db.query('UPDATE products SET is_active = 0 WHERE id = ?', [prodId]);
      return {
        deactivated: true,
        message: 'Product has historical purchase records and cannot be permanently deleted. It has been deactivated instead.'
      };
    }

    // Completely unreferenced - delete cleanly
    await db.query('DELETE FROM product_images WHERE product_id = ?', [prodId]);
    await db.query('DELETE FROM cart_items WHERE product_id = ?', [prodId]);
    await db.query('DELETE FROM wishlist_items WHERE product_id = ?', [prodId]);
    await db.query('DELETE FROM inventory_movements WHERE product_id = ?', [prodId]);
    await db.query('DELETE FROM products WHERE id = ?', [prodId]);

    return {
      deleted: true,
      message: 'Product permanently purged from catalog.'
    };
  }

  /**
   * Toggle active status
   */
  async toggleStatus(id) {
    const prodId = parseInt(id, 10);
    const [rows] = await db.query('SELECT is_active FROM products WHERE id = ? LIMIT 1', [prodId]);
    if (!rows || rows.length === 0) {
      const err = new Error('Product not found.');
      err.statusCode = 404;
      throw err;
    }

    const nextState = rows[0].is_active ? 0 : 1;
    await db.query('UPDATE products SET is_active = ? WHERE id = ?', [nextState, prodId]);
    return { is_active: nextState };
  }
}

module.exports = new AdminProductService();
