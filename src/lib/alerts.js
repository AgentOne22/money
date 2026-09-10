/**
 * Budget-Alerts: E-Mail/Push-Benachrichtigungen bei Budget-Überschreitung
 * Unterstützt: In-App, E-Mail (SMTP), Push (Web Push API)
 */

export const ALERT_TYPES = {
  WARNING: 'warning',   // 80% erreicht
  EXCEEDED: 'exceeded', // 100% überschritten
  CRITICAL: 'critical'  // 120%+ überschritten
};

export const ALERT_CHANNELS = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  PUSH: 'push'
};

/**
 * Prüft ob ein Alert ausgelöst werden soll
 */
export function checkBudgetAlert(budgetItem, previousStatus = null) {
  if (!budgetItem) return null;

  const { percentage, category, spent, limit } = budgetItem;

  let alertType = null;

  if (percentage >= 120) {
    alertType = ALERT_TYPES.CRITICAL;
  } else if (percentage >= 100) {
    alertType = ALERT_TYPES.EXCEEDED;
  } else if (percentage >= 80) {
    alertType = ALERT_TYPES.WARNING;
  }

  if (!alertType) return null;

  // Nur auslösen wenn Status sich geändert hat
  if (previousStatus && previousStatus === alertType) return null;

  return createAlert(alertType, budgetItem);
}

/**
 * Erstellt ein Alert-Objekt
 */
export function createAlert(type, budgetItem) {
  const messages = {
    [ALERT_TYPES.WARNING]: {
      title: `⚠️ Budget-Warnung: ${budgetItem.category}`,
      body: `Du hast ${budgetItem.percentage}% deines Budgets für ${budgetItem.category} verbraucht (${formatCurrency(budgetItem.spent)} von ${formatCurrency(budgetItem.limit)})`,
      priority: 'normal'
    },
    [ALERT_TYPES.EXCEEDED]: {
      title: `� Budget überschritten: ${budgetItem.category}`,
      body: `Dein Budget für ${budgetItem.category} wurde überschritten! (${formatCurrency(budgetItem.spent)} von ${formatCurrency(budgetItem.limit)})`,
      priority: 'high'
    },
    [ALERT_TYPES.CRITICAL]: {
      title: `🚨 Kritisch: ${budgetItem.category}`,
      body: `Dein Budget für ${budgetItem.category} ist um ${budgetItem.percentage - 100}% überschritten! (${formatCurrency(budgetItem.spent)} von ${formatCurrency(budgetItem.limit)})`,
      priority: 'urgent'
    }
  };

  const msg = messages[type] || messages[ALERT_TYPES.WARNING];

  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    category: budgetItem.category,
    percentage: budgetItem.percentage,
    spent: budgetItem.spent,
    limit: budgetItem.limit,
    ...msg,
    timestamp: new Date().toISOString(),
    read: false,
    channels: []
  };
}

/**
 * Prüft alle Budgets und gibt neue Alerts zurück
 */
export function checkAllBudgets(budgetProgress, previousAlerts = []) {
  const newAlerts = [];
  const previousMap = new Map(previousAlerts.map(a => [a.category, a.type]));

  for (const item of budgetProgress) {
    const previousStatus = previousMap.get(item.category) || null;
    const alert = checkBudgetAlert(item, previousStatus);
    if (alert) {
      newAlerts.push(alert);
    }
  }

  return newAlerts;
}

/**
 * E-Mail Alert Template generieren
 */
export function generateEmailAlert(alert) {
  const templates = {
    [ALERT_TYPES.WARNING]: {
      subject: `💰 Budget-Warnung: ${alert.category}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">⚠️ Budget-Warnung</h2>
          <p>Hallo,</p>
          <p>du hast <strong>${alert.percentage}%</strong> deines Budgets für <strong>${alert.category}</strong> verbraucht.</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Ausgaben:</strong> ${formatCurrency(alert.spent)}</p>
            <p><strong>Budget:</strong> ${formatCurrency(alert.limit)}</p>
            <p><strong>Verbleibend:</strong> ${formatCurrency(alert.limit - alert.spent)}</p>
          </div>
          <p>Bitte überprüfe deine Ausgaben.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Money App — Dein Finanz-Tracker</p>
        </div>
      `
    },
    [ALERT_TYPES.EXCEEDED]: {
      subject: `� Budget überschritten: ${alert.category}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">� Budget überschritten!</h2>
          <p>Hallo,</p>
          <p>dein Budget für <strong>${alert.category}</strong> wurde überschritten.</p>
          <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ef4444;">
            <p><strong>Ausgaben:</strong> ${formatCurrency(alert.spent)}</p>
            <p><strong>Budget:</strong> ${formatCurrency(alert.limit)}</p>
            <p><strong>Überschreitung:</strong> ${formatCurrency(alert.spent - alert.limit)}</p>
          </div>
          <p>Empfehlung: Reduziere deine Ausgaben in dieser Kategorie.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Money App — Dein Finanz-Tracker</p>
        </div>
      `
    },
    [ALERT_TYPES.CRITICAL]: {
      subject: `🚨 Kritische Budget-Überschreitung: ${alert.category}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🚨 Kritische Budget-Überschreitung!</h2>
          <p>Hallo,</p>
          <p>dein Budget für <strong>${alert.category}</strong> ist um <strong>${alert.percentage - 100}%</strong> überschritten!</p>
          <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;">
            <p><strong>Ausgaben:</strong> ${formatCurrency(alert.spent)}</p>
            <p><strong>Budget:</strong> ${formatCurrency(alert.limit)}</p>
            <p><strong>Überschreitung:</strong> ${formatCurrency(alert.spent - alert.limit)}</p>
          </div>
          <p><strong>Handlungsempfehlung:</strong> Überprüfe dringend deine Ausgaben und passe dein Budget an.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Money App — Dein Finanz-Tracker</p>
        </div>
      `
    }
  };

  return templates[alert.type] || templates[ALERT_TYPES.WARNING];
}

/**
 * Web Push Notification Payload erstellen
 */
export function createPushPayload(alert) {
  return {
    title: alert.title,
    body: alert.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: `budget-${alert.category}-${alert.type}`,
    requireInteraction: alert.type === ALERT_TYPES.CRITICAL,
    data: {
      alertId: alert.id,
      category: alert.category,
      type: alert.type,
      url: `/budgets#${alert.category}`
    },
    actions: alert.type === ALERT_TYPES.WARNING
      ? [{ action: 'view', title: 'Anzeigen' }]
      : [
          { action: 'view', title: 'Anzeigen' },
          { action: 'dismiss', title: 'Später' }
        ]
  };
}

/**
 * Alert History verwalten
 */
export class AlertHistory {
  constructor(maxSize = 100) {
    this.alerts = [];
    this.maxSize = maxSize;
  }

  add(alert) {
    this.alerts.unshift(alert);
    if (this.alerts.length > this.maxSize) {
      this.alerts = this.alerts.slice(0, this.maxSize);
    }
  }

  getByCategory(category) {
    return this.alerts.filter(a => a.category === category);
  }

  getUnread() {
    return this.alerts.filter(a => !a.read);
  }

  markAsRead(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) alert.read = true;
  }

  markAllAsRead() {
    this.alerts.forEach(a => { a.read = true; });
  }

  clear() {
    this.alerts = [];
  }

  toJSON() {
    return this.alerts;
  }

  static fromJSON(data) {
    const history = new AlertHistory();
    history.alerts = Array.isArray(data) ? data : [];
    return history;
  }
}

/**
 * Alert-Einstellungen verwalten
 */
export function createAlertSettings(overrides = {}) {
  return {
    enabled: true,
    channels: [ALERT_CHANNELS.IN_APP],
    thresholds: {
      warning: 80,
      exceeded: 100,
      critical: 120
    },
    emailAddress: null,
    pushSubscription: null,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    ...overrides
  };
}

/**
 * Prüft ob aktuell "Ruhezeit" ist
 */
export function isQuietHours(settings) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
  const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Über Mitternacht (z.B. 22:00 - 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * SMTP E-Mail versenden (Mock für MVP)
 */
export async function sendEmailAlert(alert, emailAddress, smtpConfig = null) {
  const emailContent = generateEmailAlert(alert);

  // In Produktion: nodemailer oder ähnlich verwenden
  console.log(`[Mock Email] To: ${emailAddress}`);
  console.log(`[Mock Email] Subject: ${emailContent.subject}`);

  return {
    success: true,
    messageId: `mock_${Date.now()}`,
    to: emailAddress,
    subject: emailContent.subject,
    timestamp: new Date().toISOString()
  };
}

/**
 * Push Notification versenden (Mock für MVP)
 */
export async function sendPushAlert(alert, pushSubscription) {
  const payload = createPushPayload(alert);

  // In Produktion: web-push Bibliothek verwenden
  console.log(`[Mock Push] Sending to: ${pushSubscription?.endpoint || 'no-sub'}`);

  return {
    success: true,
    endpoint: pushSubscription?.endpoint || 'mock',
    timestamp: new Date().toISOString()
  };
}

/**
 * Hilfsfunktion: Währung formatieren
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}
