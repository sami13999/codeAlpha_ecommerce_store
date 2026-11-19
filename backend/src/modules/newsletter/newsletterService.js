const db = require('../../config/database');

class NewsletterService {
  async subscribe(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      const err = new Error('A valid email address is required.');
      err.statusCode = 422;
      throw err;
    }

    const trimmed = email.trim().toLowerCase();

    const [existing] = await db.query(
      'SELECT id, status FROM newsletter_subscribers WHERE email = ? LIMIT 1',
      [trimmed]
    );

    if (existing && existing.length > 0) {
      if (existing[0].status === 'SUBSCRIBED') {
        return { message: 'You are already subscribed to our newsletter!' };
      } else {
        await db.query(
          'UPDATE newsletter_subscribers SET status = "SUBSCRIBED", subscribed_at = NOW() WHERE id = ?',
          [existing[0].id]
        );
        return { message: 'Welcome back! Your newsletter subscription has been renewed.' };
      }
    }

    await db.query(
      'INSERT INTO newsletter_subscribers (email, status) VALUES (?, "SUBSCRIBED")',
      [trimmed]
    );

    return { message: 'Thank you for subscribing to our newsletter! Invitations await.' };
  }
}

module.exports = new NewsletterService();
