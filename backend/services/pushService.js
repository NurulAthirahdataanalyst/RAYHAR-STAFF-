const axios = require('axios');

let poolInstance = null;

function initPushService(pool) {
  poolInstance = pool;
  // Create user_push_tokens table if it doesn't exist yet
  if (poolInstance) {
    poolInstance.query(`
      CREATE TABLE IF NOT EXISTS user_push_tokens (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        token TEXT NOT NULL UNIQUE,
        platform VARCHAR(32) DEFAULT 'web',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_push_user_id ON user_push_tokens(user_id);
    `).catch(err => console.warn('⚠️ Push tokens table init notice:', err.message));
  }
}

/**
 * Register or update FCM push token for a user
 */
async function registerPushToken(userId, token, platform = 'web') {
  if (!poolInstance || !userId || !token) return false;
  try {
    await poolInstance.query(
      `INSERT INTO user_push_tokens (user_id, token, platform, updated_at)
       VALUES (?, ?, ?, NOW())
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = NOW()`,
      [userId, token, platform]
    );
    return true;
  } catch (err) {
    console.error('Failed to save push token:', err.message);
    return false;
  }
}

/**
 * Send Firebase Cloud Messaging push notification to a user
 */
async function sendPushNotification(userId, { title, body, data = {} }) {
  if (!poolInstance || !userId) return;

  try {
    const [rows] = await poolInstance.query(
      `SELECT token FROM user_push_tokens WHERE user_id = ?`,
      [userId]
    );

    if (!rows || rows.length === 0) return;

    const serverKey = process.env.FIREBASE_SERVER_KEY;
    if (!serverKey) {
      // Firebase server key not configured yet
      return;
    }

    for (const r of rows) {
      try {
        await axios.post(
          'https://fcm.googleapis.com/fcm/send',
          {
            to: r.token,
            notification: {
              title,
              body,
              icon: '/favicon.ico',
            },
            data,
          },
          {
            headers: {
              'Authorization': `key=${serverKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          }
        );
      } catch (pushErr) {
        // If token expired / invalid, remove it
        if (pushErr.response && (pushErr.response.status === 400 || pushErr.response.status === 404)) {
          await poolInstance.query(`DELETE FROM user_push_tokens WHERE token = ?`, [r.token]).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error(`Error sending push notification to ${userId}:`, err.message);
  }
}

module.exports = {
  initPushService,
  registerPushToken,
  sendPushNotification,
};
