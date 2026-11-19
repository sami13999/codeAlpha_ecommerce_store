const db = require('../../../config/database');

class AdminNewsletterService {
  async getSubscribers(params = {}) {
    const page = Math.max(parseInt(params.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 15, 1), 100);
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const values = [];

    if (params.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }

    if (params.search && params.search.trim()) {
      conditions.push('email LIKE ?');
      values.push(`%${params.search.trim()}%`);
    }

    const whereSql = conditions.join(' AND ');

    const [countRows] = await db.query(`SELECT COUNT(*) as total FROM newsletter_subscribers WHERE ${whereSql}`, values);
    const total = parseInt(countRows[0].total, 10);

    const [rows] = await db.query(`
      SELECT id, email, status, subscribed_at, unsubscribed_at
      FROM newsletter_subscribers
      WHERE ${whereSql}
      ORDER BY subscribed_at DESC
      LIMIT ? OFFSET ?
    `, [...values, limit, offset]);

    return {
      subscribers: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async exportCsv() {
    const [rows] = await db.query('SELECT id, email, status, subscribed_at, unsubscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC');
    let csv = 'ID,Email,Status,Subscribed At,Unsubscribed At\r\n';
    rows.forEach(r => {
      csv += `${r.id},"${r.email}",${r.status},"${r.subscribed_at || ''}","${r.unsubscribed_at || ''}"\r\n`;
    });
    return csv;
  }
}

module.exports = new AdminNewsletterService();
