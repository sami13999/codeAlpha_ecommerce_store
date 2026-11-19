const db = require('../../../config/database');

class AdminReviewService {
  async getReviews(params = {}) {
    const page = Math.max(parseInt(params.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const values = [];

    if (params.status) {
      conditions.push('r.status = ?');
      values.push(params.status);
    }

    if (params.search && params.search.trim()) {
      conditions.push('(p.name LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR r.comment LIKE ?)');
      const t = `%${params.search.trim()}%`;
      values.push(t, t, t, t);
    }

    const whereSql = conditions.join(' AND ');

    const [countRows] = await db.query(
      `SELECT COUNT(*) as total 
       FROM reviews r 
       JOIN products p ON r.product_id = p.id
       JOIN users u ON r.user_id = u.id
       WHERE ${whereSql}`,
      values
    );
    const total = parseInt(countRows[0].total, 10);

    const [rows] = await db.query(`
      SELECT 
        r.id,
        r.user_id,
        r.product_id,
        r.rating,
        r.comment,
        r.status,
        r.created_at,
        p.name AS product_name,
        p.slug AS product_slug,
        u.full_name AS customer_name,
        u.email AS customer_email
      FROM reviews r
      JOIN products p ON r.product_id = p.id
      JOIN users u ON r.user_id = u.id
      WHERE ${whereSql}
      ORDER BY 
        CASE WHEN r.status = 'PENDING' THEN 1 ELSE 2 END,
        r.created_at DESC
      LIMIT ? OFFSET ?
    `, [...values, limit, offset]);

    return {
      reviews: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateReviewStatus(id, newStatus) {
    const valid = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!valid.includes(newStatus)) {
      const err = new Error(`Invalid status. Allowed: ${valid.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const reviewId = parseInt(id, 10);
    const [rows] = await db.query('SELECT id FROM reviews WHERE id = ? LIMIT 1', [reviewId]);
    if (!rows || rows.length === 0) {
      const err = new Error('Review not found.');
      err.statusCode = 404;
      throw err;
    }

    await db.query('UPDATE reviews SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, reviewId]);
    return { id: reviewId, status: newStatus };
  }
}

module.exports = new AdminReviewService();
