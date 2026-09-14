const emailService = require('./emailService');
const pushService = require('./pushService');

let poolInstance = null;

function initNotificationService(pool) {
  poolInstance = pool;
  pushService.initPushService(pool);
}

/**
 * 1. createNotification
 * Inserts a single notification into notifications table and optionally sends email & push.
 */
async function createNotification({
  userId,
  title,
  message,
  type = 'system',
  relatedLeaveId = null,
  sendEmail = false,
  emailData = null,
  sendPush = true,
  pushData = null,
}) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!userId || !title || !message) {
    throw new Error('createNotification missing required fields: userId, title, message');
  }

  const [result] = await poolInstance.query(
    `INSERT INTO notifications (user_id, title, message, type, is_read, related_leave_id, created_at)
     VALUES (?, ?, ?, ?, FALSE, ?, NOW())`,
    [userId, title, message, type, relatedLeaveId || null]
  );

  const insertedId = result?.insertId || (Array.isArray(result) && result[0]?.id) || (result?.rows && result.rows[0]?.id) || null;

  // Asynchronously dispatch Email if requested
  if (sendEmail && emailData) {
    (async () => {
      try {
        if (emailData.type === 'leave_request') {
          await emailService.sendLeaveRequestEmail(emailData);
        } else if (emailData.type === 'leave_approved') {
          await emailService.sendLeaveApprovedEmail(emailData);
        } else if (emailData.type === 'leave_rejected') {
          await emailService.sendLeaveRejectedEmail(emailData);
        } else if (emailData.to && emailData.subject && emailData.html) {
          await emailService.sendEmail(emailData);
        }
      } catch (err) {
        console.error(`Error sending email for notification ${insertedId}:`, err.message);
      }
    })();
  }

  // Asynchronously dispatch Browser Push via FCM
  if (sendPush) {
    (async () => {
      try {
        await pushService.sendPushNotification(userId, {
          title,
          body: message.replace(/[*_#]/g, ''), // Strip markdown for plain notification body
          data: pushData || { type, relatedLeaveId: relatedLeaveId ? String(relatedLeaveId) : '' },
        });
      } catch (err) {
        console.error(`Error sending push for notification ${insertedId}:`, err.message);
      }
    })();
  }

  return {
    id: insertedId,
    user_id: userId,
    title,
    message,
    type,
    is_read: false,
    related_leave_id: relatedLeaveId,
    created_at: new Date().toISOString(),
  };
}

/**
 * 2. createBulkNotification
 * Inserts multiple notifications (e.g. for company announcements, holiday alerts).
 */
async function createBulkNotification(notificationsList = []) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!Array.isArray(notificationsList) || notificationsList.length === 0) return [];

  const created = [];
  for (const notif of notificationsList) {
    try {
      const res = await createNotification(notif);
      created.push(res);
    } catch (e) {
      console.error(`Bulk notification failed for user ${notif.userId}:`, e.message);
    }
  }
  return created;
}

/**
 * 3. markAsRead
 */
async function markAsRead(notificationId, userId) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  let query = `UPDATE notifications SET is_read = TRUE WHERE id = ?`;
  const params = [notificationId];

  if (userId) {
    query += ` AND user_id = ?`;
    params.push(userId);
  }

  await poolInstance.query(query, params);
  return { success: true };
}

/**
 * 4. markAllAsRead
 */
async function markAllAsRead(userId) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!userId) throw new Error('userId is required for markAllAsRead');

  await poolInstance.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`,
    [userId]
  );
  return { success: true };
}

/**
 * 5. getUnreadCount
 */
async function getUnreadCount(userId) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!userId) return 0;

  const [rows] = await poolInstance.query(
    `SELECT COUNT(*)::int as count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
    [userId]
  );
  return rows[0]?.count || 0;
}

/**
 * 6. getNotifications (Paginated with filtering)
 */
async function getNotifications(userId, { limit = 50, offset = 0, type = null, unreadOnly = false } = {}) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!userId) return [];

  let query = `SELECT * FROM notifications WHERE user_id = ?`;
  const params = [userId];

  if (unreadOnly) {
    query += ` AND is_read = FALSE`;
  }

  if (type && type !== 'all') {
    if (type === 'leave') {
      query += ` AND type IN ('leave', 'approval', 'leave_approval', 'status_update')`;
    } else {
      query += ` AND type = ?`;
      params.push(type);
    }
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await poolInstance.query(query, params);
  return rows || [];
}

/**
 * 7. deleteNotification
 */
async function deleteNotification(notificationId, userId) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  let query = `DELETE FROM notifications WHERE id = ?`;
  const params = [notificationId];

  if (userId) {
    query += ` AND user_id = ?`;
    params.push(userId);
  }

  await poolInstance.query(query, params);
  return { success: true };
}

module.exports = {
  initNotificationService,
  createNotification,
  createBulkNotification,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getNotifications,
  deleteNotification,
};
