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
  scope = null,
}) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!userId || !title || !message) {
    throw new Error('createNotification missing required fields: userId, title, message');
  }

  const isTeam = scope === 'team' || (
    type === 'leave_approval' || 
    (type === 'status_update' && title.includes(':')) || 
    title.startsWith('Leave Approved:') ||
    title.startsWith('Leave Rejected:') ||
    title.startsWith('New Leave Request') ||
    title.startsWith('Leave Request:') ||
    title.startsWith('Irregular Clock-In') || 
    title.startsWith('Leave Final Approval Required') ||
    title.startsWith('Leave Approval Required') ||
    title.toLowerCase().includes('anomaly') ||
    title.toLowerCase().includes('requires your approval') ||
    title.toLowerCase().includes('need your approval') ||
    message.includes("'s request for") ||
    message.includes("submitted a Leave Request") ||
    message.toLowerCase().includes("requires your approval")
  );

  const finalScope = scope || (isTeam ? 'team' : 'personal');

  const [result] = await poolInstance.query(
    `INSERT INTO notifications (user_id, title, message, type, is_read, related_leave_id, scope, created_at)
     VALUES (?, ?, ?, ?, FALSE, ?, ?, NOW())`,
    [userId, title, message, type, relatedLeaveId || null, finalScope]
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
          data: pushData || { type, scope: finalScope, relatedLeaveId: relatedLeaveId ? String(relatedLeaveId) : '' },
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
    scope: finalScope,
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

const TEAM_SCOPE_CLAUSE = `(
  scope = 'team' 
  OR type = 'leave_approval' 
  OR title LIKE 'Leave Approved:%' 
  OR title LIKE 'Leave Rejected:%' 
  OR title LIKE 'New Leave Request%' 
  OR title LIKE 'Leave Request:%' 
  OR title LIKE '%Need Your Approval%' 
  OR title LIKE 'Irregular Clock-In%'
  OR title LIKE 'Leave Final Approval Required%'
  OR title LIKE 'Leave Approval Required%'
  OR message LIKE '%''s request for%' 
  OR message LIKE '% request for % is now %'
  OR message LIKE '%submitted a Leave Request%'
)`;

const MY_SCOPE_CLAUSE = `(
  (scope = 'personal' OR scope IS NULL)
  AND type != 'leave_approval'
  AND title NOT LIKE 'Leave Approved:%'
  AND title NOT LIKE 'Leave Rejected:%'
  AND title NOT LIKE 'New Leave Request%'
  AND title NOT LIKE 'Leave Request:%'
  AND title NOT LIKE '%Need Your Approval%'
  AND title NOT LIKE 'Irregular Clock-In%'
  AND title NOT LIKE 'Leave Final Approval Required%'
  AND title NOT LIKE 'Leave Approval Required%'
  AND message NOT LIKE '%''s request for%'
  AND message NOT LIKE '% request for % is now %'
  AND message NOT LIKE '%submitted a Leave Request%'
)`;

/**
 * 4. markAllAsRead
 */
async function markAllAsRead(userId, scope = null) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!userId) throw new Error('userId is required for markAllAsRead');

  let query = `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`;
  const params = [userId];

  if (scope === 'my' || scope === 'personal') {
    query += ` AND ${MY_SCOPE_CLAUSE}`;
  } else if (scope === 'team') {
    query += ` AND ${TEAM_SCOPE_CLAUSE}`;
  }

  await poolInstance.query(query, params);
  return { success: true };
}

/**
 * 5. getUnreadCount
 */
async function getUnreadCount(userId) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!userId) return { count: 0, total: 0, my: 0, team: 0 };

  const [rows] = await poolInstance.query(
    `SELECT 
       COUNT(*)::int as total,
       COUNT(*) FILTER (WHERE ${MY_SCOPE_CLAUSE})::int as my,
       COUNT(*) FILTER (WHERE ${TEAM_SCOPE_CLAUSE})::int as team
     FROM notifications 
     WHERE user_id = ? AND is_read = FALSE`,
    [userId]
  );
  const total = rows[0]?.total || 0;
  const my = rows[0]?.my || 0;
  const team = rows[0]?.team || 0;
  return { count: total, total, my, team };
}

/**
 * 6. getNotifications (Paginated with filtering and scoping)
 */
async function getNotifications(userId, { limit = 50, offset = 0, type = null, unreadOnly = false, scope = null } = {}) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!userId) return [];

  let query = `SELECT * FROM notifications WHERE user_id = ?`;
  const params = [userId];

  if (scope === 'my' || scope === 'personal') {
    query += ` AND ${MY_SCOPE_CLAUSE}`;
  } else if (scope === 'team') {
    query += ` AND ${TEAM_SCOPE_CLAUSE}`;
  }

  if (unreadOnly) {
    query += ` AND is_read = FALSE`;
  }

  if (type && type !== 'all') {
    if (type === 'leave') {
      query += ` AND type IN ('leave', 'approval', 'leave_approval', 'status_update')`;
    } else if (type === 'assignment') {
      query += ` AND type IN ('assignment', 'outstation')`;
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
