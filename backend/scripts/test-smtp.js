#!/usr/bin/env node
/**
 * Test SMTP de bout en bout.
 * Usage :
 *   node scripts/test-smtp.js              # verify() uniquement
 *   node scripts/test-smtp.js --to=vous@exemple.com   # verify + envoi réel
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { verifySmtp, sendMail, isSmtpConfigured, smtpMetaForLogs, passwordResetEmailEnabled } = require('../utils/mail');

async function main() {
  const toArg = process.argv.find((a) => a.startsWith('--to='));
  const to = toArg ? toArg.slice('--to='.length).trim() : '';

  console.log('SMTP configuré :', isSmtpConfigured());
  console.log('Reset MDP e-mail :', passwordResetEmailEnabled());
  console.log('Meta :', smtpMetaForLogs());

  const v = await verifySmtp();
  if (!v.ok) {
    console.error('VERIFY FAIL:', v.error);
    process.exit(1);
  }
  console.log('VERIFY OK');

  if (!to) {
    console.log('Pas d’envoi (ajoutez --to=adresse@domaine.com pour un test réel).');
    process.exit(0);
  }

  const ok = await sendMail({
    to,
    subject: 'Test SMTP UniPortail',
    text: 'Ceci est un e-mail de test UniPortail. Si vous le recevez, SMTP fonctionne.',
    html: '<p>Ceci est un e-mail de test <strong>UniPortail</strong>. Si vous le recevez, SMTP fonctionne.</p>',
  });
  if (!ok) {
    console.error('SEND FAIL — voir logs ci-dessus');
    process.exit(1);
  }
  console.log('SEND OK →', to);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
