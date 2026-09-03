/**
 * Planificateur rapport Excel hebdomadaire (Directeur).
 * Défaut : chaque lundi à 06:00 (heure serveur).
 */
const { generateWeeklyRapportsForAllEtabs } = require('./weeklyRapportExcel');

let timer = null;
let lastRunKey = null;

function msUntilNextMonday6am(now = new Date()) {
  const target = new Date(now);
  const day = target.getDay(); // 0=dim … 1=lun
  let add = (1 - day + 7) % 7;
  target.setHours(6, 0, 0, 0);
  if (add === 0 && now >= target) add = 7;
  target.setDate(target.getDate() + add);
  return Math.max(60_000, target.getTime() - now.getTime());
}

async function runWeeklyJob() {
  const key = new Date().toISOString().slice(0, 10);
  if (lastRunKey === key) return;
  lastRunKey = key;
  try {
    const meta = await generateWeeklyRapportsForAllEtabs(new Date());
    console.log(
      `[RAPPORT-HEBDO] ${meta.files?.length || 0} fichier(s) généré(s), erreurs=${meta.errors?.length || 0}`,
    );
  } catch (e) {
    console.warn('[RAPPORT-HEBDO] échec:', e.message);
  }
}

function startWeeklyRapportScheduler() {
  if (process.env.DISABLE_WEEKLY_RAPPORT === '1') return null;

  const tick = () => {
    const now = new Date();
    // Lundi (1) entre 06:00 et 06:15
    if (now.getDay() === 1 && now.getHours() === 6 && now.getMinutes() < 15) {
      runWeeklyJob();
    }
  };

  // Vérification toutes les 10 min
  timer = setInterval(tick, 10 * 60 * 1000);
  if (typeof timer.unref === 'function') timer.unref();

  // Option : génération immédiate au démarrage (dev / forçage)
  if (process.env.WEEKLY_RAPPORT_ON_START === '1') {
    setTimeout(() => runWeeklyJob().catch(() => {}), 5000);
  }

  console.log(
    `[RAPPORT-HEBDO] planifié (lundi 06h). Prochain créneau théorique dans ~${Math.round(msUntilNextMonday6am() / 3600000)} h`,
  );
  return timer;
}

function stopWeeklyRapportScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = {
  startWeeklyRapportScheduler,
  stopWeeklyRapportScheduler,
  runWeeklyJob,
  msUntilNextMonday6am,
};
