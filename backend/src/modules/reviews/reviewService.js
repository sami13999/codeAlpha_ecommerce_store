const db = require('../../config/database');

class ReviewService {
  async getProductReviews(productId) {
    const [reviews] = await db.query(
      `SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.full_name AS customer_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ? AND r.status = 'APPROVED'
       ORDER BY r.created_at DESC`,
      [productId]
    );

    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating
       FROM reviews
       WHERE product_id = ? AND status = 'APPROVED'`,
      [productId]
    );

    const total = stats[0].total_reviews || 0;
    const avg = total > 0 ? parseFloat(parseFloat(stats[0].average_rating).toFixed(1)) : 0;

    return {
      reviews,
      summary: {
        total_reviews: total,
        average_rating: avg
      }
    };
  }

  async submitReview(userId, { productId, rating, comment, orderId = null }) {
    const rate = parseInt(rating, 10);
    if (isNaN(rate) || rate < 1 || rate > 5) {
      const err = new Error('Rating must be an integer between 1 and 5.');
      err.statusCode = 422;
      throw err;
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 5) {
      const err = new Error('Comment must be at least 5 characters long.');
      err.statusCode = 422;
      throw err;
    }

    const [prods] = await db.query('SELECT id FROM products WHERE id = ? LIMIT 1', [productId]);
    if (!prods || prods.length === 0) {
      const err = new Error('Product not found.');
      err.statusCode = 404;
      throw err;
    }

    // Insert review as APPROVED so customer reviews display immediately in the internship demo
    const [res] = await db.query(
      `INSERT INTO reviews (user_id, product_id, order_id, rating, comment, status)
       VALUES (?, ?, ?, ?, ?, 'APPROVED')`,
      [userId, productId, orderId || null, rate, comment.trim()]
    );

    return {
      id: res.insertId,
      product_id: productId,
      rating: rate,
      comment: comment.trim(),
      status: 'APPROVED'
    };
  }
}

module.exports = new ReviewService();
