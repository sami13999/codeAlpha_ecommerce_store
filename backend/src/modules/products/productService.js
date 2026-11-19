const db = require('../../config/database');

class ProductService {
  async getProducts({
    page = 1,
    limit = 12,
    search = '',
    category = '',
    minPrice = null,
    maxPrice = null,
    featured = null,
    sort = 'newest'
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['p.is_active = 1'];
    const params = [];

    if (search && search.trim()) {
      conditions.push('(p.name LIKE ? OR p.short_description LIKE ? OR p.brand LIKE ? OR p.sku LIKE ?)');
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    if (category && category.trim()) {
      if (/^\d+$/.test(category.trim())) {
        conditions.push('(p.category_id = ? OR c.parent_id = ?)');
        const catId = parseInt(category.trim(), 10);
        params.push(catId, catId);
      } else {
        conditions.push('(c.slug = ? OR parent_c.slug = ?)');
        const catSlug = category.trim();
        params.push(catSlug, catSlug);
      }
    }

    if (minPrice !== null && minPrice !== '' && !isNaN(minPrice)) {
      conditions.push('p.price >= ?');
      params.push(parseFloat(minPrice));
    }

    if (maxPrice !== null && maxPrice !== '' && !isNaN(maxPrice)) {
      conditions.push('p.price <= ?');
      params.push(parseFloat(maxPrice));
    }

    if (featured === 'true' || featured === true || featured === '1') {
      conditions.push('p.is_featured = 1');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderByClause = 'ORDER BY p.created_at DESC';
    switch (sort) {
      case 'price_asc':
        orderByClause = 'ORDER BY p.price ASC';
        break;
      case 'price_desc':
        orderByClause = 'ORDER BY p.price DESC';
        break;
      case 'name_asc':
        orderByClause = 'ORDER BY p.name ASC';
        break;
      case 'featured':
        orderByClause = 'ORDER BY p.is_featured DESC, p.created_at DESC';
        break;
      case 'newest':
      default:
        orderByClause = 'ORDER BY p.created_at DESC';
        break;
    }

    const countSql = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories parent_c ON c.parent_id = parent_c.id
      ${whereClause}
    `;
    const [countRows] = await db.query(countSql, params);
    const total = countRows[0] ? countRows[0].total : 0;

    const dataSql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.sku,
        p.short_description,
        p.price,
        p.compare_at_price,
        p.stock_quantity,
        p.low_stock_threshold,
        p.brand,
        p.is_featured,
        p.created_at,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        (
          SELECT image_url 
          FROM product_images 
          WHERE product_id = p.id 
          ORDER BY is_primary DESC, sort_order ASC, id ASC 
          LIMIT 1
        ) AS primary_image,
        (
          SELECT image_url 
          FROM product_images 
          WHERE product_id = p.id AND is_primary = 0
          ORDER BY sort_order ASC, id ASC 
          LIMIT 1
        ) AS secondary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories parent_c ON c.parent_id = parent_c.id
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, limitNum, offset];
    const [rows] = await db.query(dataSql, dataParams);

    const formattedRows = rows.map(prod => {
      let discount_percent = 0;
      if (prod.compare_at_price && prod.compare_at_price > prod.price) {
        discount_percent = Math.round(((prod.compare_at_price - prod.price) / prod.compare_at_price) * 100);
      }
      return {
        ...prod,
        in_stock: prod.stock_quantity > 0,
        discount_percent
      };
    });

    return {
      products: formattedRows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  async getProductBySlug(slug) {
    if (!slug || typeof slug !== 'string') {
      const error = new Error('Product slug is required.');
      error.statusCode = 400;
      throw error;
    }

    const [rows] = await db.query(
      `SELECT 
        p.id,
        p.category_id,
        p.name,
        p.slug,
        p.sku,
        p.short_description,
        p.description,
        p.price,
        p.compare_at_price,
        p.stock_quantity,
        p.low_stock_threshold,
        p.brand,
        p.weight,
        p.is_featured,
        p.is_active,
        p.created_at,
        c.name AS category_name,
        c.slug AS category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.is_active = 1
      LIMIT 1`,
      [slug.trim()]
    );

    if (!rows || rows.length === 0) {
      const error = new Error(`Product with slug '${slug}' not found.`);
      error.statusCode = 404;
      error.errors = ['Product not found'];
      throw error;
    }

    const product = rows[0];

    const [images] = await db.query(
      `SELECT id, image_url, alt_text, is_primary, sort_order
       FROM product_images
       WHERE product_id = ?
       ORDER BY is_primary DESC, sort_order ASC, id ASC`,
      [product.id]
    );

    product.images = images.length > 0 ? images : [
      {
        id: 0,
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
        alt_text: product.name,
        is_primary: 1
      }
    ];
    product.primary_image = product.images[0].image_url;

    let discount_percent = 0;
    if (product.compare_at_price && product.compare_at_price > product.price) {
      discount_percent = Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100);
    }
    product.discount_percent = discount_percent;
    product.in_stock = product.stock_quantity > 0;

    if (product.category_id) {
      const [related] = await db.query(
        `SELECT 
          p.id,
          p.name,
          p.slug,
          p.price,
          p.compare_at_price,
          p.stock_quantity,
          (
            SELECT image_url 
            FROM product_images 
            WHERE product_id = p.id 
            ORDER BY is_primary DESC, sort_order ASC, id ASC 
            LIMIT 1
          ) AS primary_image
        FROM products p
        WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1
        ORDER BY p.is_featured DESC, p.created_at DESC
        LIMIT 4`,
        [product.category_id, product.id]
      );
      product.related_products = related;
    } else {
      product.related_products = [];
    }

    return product;
  }
}

module.exports = new ProductService();
