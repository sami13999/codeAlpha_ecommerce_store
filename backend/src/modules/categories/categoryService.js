const db = require('../../config/database');

class CategoryService {
  async getCategories() {
    const [rows] = await db.query(
      `SELECT 
        c.id,
        c.parent_id,
        c.name,
        c.slug,
        c.description,
        c.image_url,
        c.sort_order,
        COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC`
    );

    const rootCategories = [];
    const categoryMap = {};

    rows.forEach(cat => {
      categoryMap[cat.id] = { ...cat, children: [] };
    });

    rows.forEach(cat => {
      if (cat.parent_id && categoryMap[cat.parent_id]) {
        categoryMap[cat.parent_id].children.push(categoryMap[cat.id]);
      } else {
        rootCategories.push(categoryMap[cat.id]);
      }
    });

    return {
      all: rows,
      tree: rootCategories
    };
  }

  async getCategoryBySlug(slug) {
    const [rows] = await db.query(
      `SELECT id, parent_id, name, slug, description, image_url, sort_order
       FROM categories
       WHERE slug = ? AND is_active = 1
       LIMIT 1`,
      [slug]
    );

    if (!rows || rows.length === 0) {
      const err = new Error('Category not found');
      err.statusCode = 404;
      throw err;
    }

    const category = rows[0];

    // Fetch children if parent
    const [children] = await db.query(
      `SELECT c.id, c.name, c.slug, c.description, c.image_url, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
       WHERE c.parent_id = ? AND c.is_active = 1
       GROUP BY c.id
       ORDER BY c.sort_order ASC`,
      [category.id]
    );
    category.children = children;

    return category;
  }
}

module.exports = new CategoryService();
