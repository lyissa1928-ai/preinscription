/**
 * Déverrouille un compte utilisateur (après échecs de connexion).
 * Usage : node backend/scripts/unlock-user.js adama.diop@esebat.com
 */
process.env.SKIP_DB_AUTOSTART_BACKUP = '1';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('../database/db');
const { clearAccountLockOnSuccess } = require('../utils/accountLock');

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: node backend/scripts/unlock-user.js EMAIL');
  process.exit(1);
}

const user = db.get('utilisateurs').find({ email }).value();
if (!user) {
  console.error(`Utilisateur introuvable : ${email}`);
  process.exit(1);
}

clearAccountLockOnSuccess(user.id);
const updated = db.get('utilisateurs').find({ id: user.id }).value();
console.log(JSON.stringify({
  ok: true,
  id: updated.id,
  email: updated.email,
  role: updated.role,
  is_locked: updated.is_locked,
  lock_until: updated.lock_until,
  login_attempts: updated.login_attempts,
}, null, 2));
