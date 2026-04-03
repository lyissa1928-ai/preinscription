const db = require('../database/db');

function createUserNotification(userId, payload) {
  try {
    const id = db.nextId('notifications');
    const now = new Date().toISOString();
    const item = {
      id,
      user_id: Number(userId),
      type: String(payload?.type || 'info'),
      title: String(payload?.title || 'Notification'),
      message: String(payload?.message || ''),
      link: payload?.link || null,
      meta: payload?.meta || null,
      read_at: null,
      created_at: now,
    };
    db.get('notifications').push(item).write();
    return item;
  } catch {
    return null;
  }
}

module.exports = { createUserNotification };

