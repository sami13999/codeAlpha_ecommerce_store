const db = require('../../../config/database');

class AdminSettingsService {
  async getSettings() {
    const [rows] = await db.query('SELECT setting_key, setting_value, description, updated_at FROM store_settings');
    const settingsMap = {};
    rows.forEach(r => {
      settingsMap[r.setting_key] = {
        value: r.setting_value,
        description: r.description,
        updated_at: r.updated_at
      };
    });
    return settingsMap;
  }

  async updateSettings(settingsMap = {}) {
    return await db.withTransaction(async (conn) => {
      const keys = Object.keys(settingsMap);
      for (const key of keys) {
        const val = String(settingsMap[key]);
        const [existing] = await conn.query('SELECT id FROM store_settings WHERE setting_key = ? LIMIT 1', [key]);
        if (existing.length > 0) {
          await conn.query(
            'UPDATE store_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
            [val, key]
          );
        } else {
          await conn.query(
            'INSERT INTO store_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
            [key, val, `Setting for ${key}`]
          );
        }
      }
      return settingsMap;
    });
  }
}

module.exports = new AdminSettingsService();
