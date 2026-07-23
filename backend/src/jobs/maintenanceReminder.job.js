const { processDueMaintenanceReminders } = require('../services/maintenanceReminder.service');

let timer = null;
let running = false;

/**
 * Daily-ish reminder scheduler using setInterval (no node-cron dependency).
 * Default: every 24h, first run after 45s so DB can connect.
 *
 * Env:
 * - REMINDER_CRON_ENABLED=true|false (default true)
 * - REMINDER_INTERVAL_MS (default 86400000 = 24h)
 * - REMINDER_LOOKBACK_DAYS (default 7)
 */
function startMaintenanceReminderScheduler() {
  const enabled = String(process.env.REMINDER_CRON_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('📅 Maintenance reminder scheduler is disabled (REMINDER_CRON_ENABLED=false)');
    return;
  }

  if (timer) return;

  const intervalMs = Number(process.env.REMINDER_INTERVAL_MS || 24 * 60 * 60 * 1000);
  const initialDelayMs = Number(process.env.REMINDER_INITIAL_DELAY_MS || 45000);

  const run = async () => {
    if (running) {
      console.log('📅 Reminder job already running — skip overlapping tick');
      return;
    }
    running = true;
    try {
      const result = await processDueMaintenanceReminders({ triggeredBy: 'CRON' });
      console.log(
        `📅 Maintenance reminders: due=${result.due_count} sent=${result.sent} failed=${result.failed} skipped=${result.skipped}`
      );
    } catch (error) {
      console.error('📅 Maintenance reminder job failed:', error.message || error);
    } finally {
      running = false;
    }
  };

  console.log(
    `📅 Maintenance reminder scheduler started (first run in ${Math.round(initialDelayMs / 1000)}s, then every ${Math.round(intervalMs / 3600000)}h)`
  );

  setTimeout(() => {
    run();
    timer = setInterval(run, intervalMs);
    if (typeof timer.unref === 'function') timer.unref();
  }, initialDelayMs);
}

function stopMaintenanceReminderScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  startMaintenanceReminderScheduler,
  stopMaintenanceReminderScheduler
};
