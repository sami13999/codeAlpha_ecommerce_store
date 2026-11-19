const db = require('../../../config/database');

class AdminCategoryService {
  async getCategories(params = {}) {
    let sql = `
      SELECT 
        c.id,
        c.parent_id,
        c.name,
        c.slug,
        c.description,
        c.image_url,
        c.is_active,
        c.sort_order,
        c.created_at,
        p.name AS parent_name,
        (SELECT COUNT(*) FROM products prod WHERE prod.category_id = c.id) AS product_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
    `;

    const conditions = [];
    const values = [];

    if (params.search && params.search.trim()) {
      conditions.push('(c.name LIKE ? OR c.slug LIKE ?)');
      const t = `%${params.search.trim()}%`;
      values.push(t, t);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY c.sort_order ASC, c.name ASC';

    const [rows] = await db.query(sql, values);
    return rows;
  }

  async getCategoryById(id) {
    const catId = parseInt(id, 10);
    const [rows] = await db.query(`
      SELECT 
        c.*,
        p.name AS parent_name,
        (SELECT COUNT(*) FROM products prod WHERE prod.category_id = c.id) AS product_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = ?
      LIMIT 1
    `, [catId]);

    if (!rows || rows.length === 0) {
      const err = new Error('Category not found.');
      err.statusCode = 404;
      throw err;
    }

    return rows[0];
  }

  async createCategory(data) {
    const name = String(data.name || '').trim();
    if (!name) {
      const err = new Error('Category name is required.');
      err.statusCode = 400;
      throw err;
    }

    let slug = data.slug ? String(data.slug).trim() : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [existing] = await db.query('SELECT id FROM categories WHERE slug = ? LIMIT 1', [slug]);
    if (existing.length > 0) {
      slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const parentId = data.parent_id ? parseInt(data.parent_id, 10) : null;
    const sortOrder = parseInt(data.sort_order, 10) || 0;
    const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1;

    const [insertRes] = await db.query(`
      INSERT INTO categories (parent_id, name, slug, description, image_url, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      parentId,
      name,
      slug,
      data.description || null,
      data.image_url || null,
      isActive,
      sortOrder
    ]);

    return { id: insertRes.insertId, name, slug, parent_id: parentId };
  }

  async updateCategory(id, data) {
    const catId = parseInt(id, 10);
    const [existing] = await db.query('SELECT * FROM categories WHERE id = ? LIMIT 1', [catId]);
    if (!existing || existing.length === 0) {
      const err = new Error('Category not found.');
      err.statusCode = 404;
      throw err;
    }

    const current = existing[0];
    let parentId = data.parent_id !== undefined ? (data.parent_id ? parseInt(data.parent_id, 10) : null) : current.parent_id;

    // Prevent circular parenting
    if (parentId === catId) {
      const err = new Error('A department cannot be its own parent category.');
      err.statusCode = 400;
      throw err;
    }

    const name = data.name !== undefined ? String(data.name).trim() : current.name;
    const slug = data.slug !== undefined ? String(data.slug).trim() : current.slug;
    const sortOrder = data.sort_order !== undefined ? parseInt(data.sort_order, 10) : current.sort_order;
    const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : current.is_active;

    await db.query(`
      UPDATE categories SET
        parent_id = ?,
        name = ?,
        slug = ?,
        description = ?,
        image_url = ?,
        is_active = ?,
        sort_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      parentId,
      name,
      slug,
      data.description !== undefined ? data.description : current.description,
      data.image_url !== undefined ? data.image_url : current.image_url,
      isActive,
      sortOrder,
      catId
    ]);

    return { id: catId, name, slug, parent_id: parentId };
  }

  async deleteCategory(id) {
    const catId = parseInt(id, 10);

    // Check if products attached
    const [prods] = await db.query('SELECT id FROM products WHERE category_id = ? LIMIT 1', [catId]);
    if (prods.length > 0) {
      const err = new Error('Cannot delete department because products are currently assigned to it. Reassign or deactivate instead.');
      err.statusCode = 400;
      throw err;
    }

    // Check if child categories attached
    const [children] = await db.query('SELECT id FROM categories WHERE parent_id = ? LIMIT 1', [catId]);
    if (children.length > 0) {
      const err = new Error('Cannot delete category because subcategories exist under it. Delete or reassign child categories first.');
      err.statusCode = 400;
      throw err;
    }

    await db.query('DELETE FROM categories WHERE id = ?', [catId]);
    return { deleted: true, message: 'Category removed successfully.' };
  }
}

module.exports = new AdminCategoryService();
