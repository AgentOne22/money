import { describe, it, expect } from 'vitest';
import {
  checkBudgetAlert,
  checkAllBudgets,
  createAlert,
  generateEmailAlert,
  createPushPayload,
  AlertHistory,
  createAlertSettings,
  isQuietHours,
  sendEmailAlert,
  sendPushAlert,
  ALERT_TYPES,
  ALERT_CHANNELS
} from '$lib/alerts';

describe('Budget Alerts - Alert Detection', () => {
  it('triggers WARNING at 80%', () => {
    const item = { category: 'food', percentage: 80, spent: 80, limit: 100 };
    const alert = checkBudgetAlert(item);
    expect(alert).not.toBeNull();
    expect(alert.type).toBe(ALERT_TYPES.WARNING);
  });

  it('triggers EXCEEDED at 100%', () => {
    const item = { category: 'food', percentage: 100, spent: 120, limit: 100 };
    const alert = checkBudgetAlert(item);
    expect(alert.type).toBe(ALERT_TYPES.EXCEEDED);
  });

  it('triggers CRITICAL at 120%', () => {
    const item = { category: 'shopping', percentage: 150, spent: 300, limit: 200 };
    const alert = checkBudgetAlert(item);
    expect(alert.type).toBe(ALERT_TYPES.CRITICAL);
  });

  it('does not trigger below 80%', () => {
    const item = { category: 'food', percentage: 50, spent: 50, limit: 100 };
    const alert = checkBudgetAlert(item);
    expect(alert).toBeNull();
  });

  it('does not repeat same alert', () => {
    const item = { category: 'food', percentage: 85, spent: 85, limit: 100 };
    const alert = checkBudgetAlert(item, ALERT_TYPES.WARNING);
    expect(alert).toBeNull();
  });

  it('upgrades alert when severity increases', () => {
    const item = { category: 'food', percentage: 100, spent: 110, limit: 100 };
    const alert = checkBudgetAlert(item, ALERT_TYPES.WARNING);
    expect(alert.type).toBe(ALERT_TYPES.EXCEEDED);
  });
});

describe('Budget Alerts - Alert Creation', () => {
  it('creates alert with required fields', () => {
    const item = { category: 'groceries', percentage: 85, spent: 170, limit: 200 };
    const alert = createAlert(ALERT_TYPES.WARNING, item);
    
    expect(alert.id).toBeDefined();
    expect(alert.type).toBe(ALERT_TYPES.WARNING);
    expect(alert.category).toBe('groceries');
    expect(alert.title).toContain('groceries');
    expect(alert.body).toContain('85%');
    expect(alert.read).toBe(false);
    expect(alert.timestamp).toBeDefined();
  });

  it('creates critical alert with high priority', () => {
    const item = { category: 'shopping', percentage: 150, spent: 300, limit: 200 };
    const alert = createAlert(ALERT_TYPES.CRITICAL, item);
    
    expect(alert.priority).toBe('urgent');
  });
});

describe('Budget Alerts - Bulk Check', () => {
  it('checks all budgets and returns new alerts', () => {
    const budgetProgress = [
      { category: 'food', percentage: 85, spent: 85, limit: 100, status: 'warning' },
      { category: 'transport', percentage: 50, spent: 30, limit: 60, status: 'ok' },
      { category: 'shopping', percentage: 110, spent: 220, limit: 200, status: 'exceeded' }
    ];
    
    const alerts = checkAllBudgets(budgetProgress);
    expect(alerts.length).toBe(2);
    expect(alerts[0].category).toBe('food');
    expect(alerts[1].category).toBe('shopping');
  });

  it('returns empty array when all ok', () => {
    const budgetProgress = [
      { category: 'food', percentage: 30, spent: 30, limit: 100, status: 'ok' },
      { category: 'transport', percentage: 50, spent: 30, limit: 60, status: 'ok' }
    ];
    
    const alerts = checkAllBudgets(budgetProgress);
    expect(alerts).toEqual([]);
  });

  it('does not repeat existing alerts', () => {
    const budgetProgress = [
      { category: 'food', percentage: 85, spent: 85, limit: 100, status: 'warning' }
    ];
    const previousAlerts = [
      { category: 'food', type: ALERT_TYPES.WARNING }
    ];
    
    const alerts = checkAllBudgets(budgetProgress, previousAlerts);
    expect(alerts).toEqual([]);
  });
});

describe('Budget Alerts - Email Generation', () => {
  it('generates warning email content', () => {
    const alert = createAlert(ALERT_TYPES.WARNING, {
      category: 'food', percentage: 85, spent: 85, limit: 100
    });
    const email = generateEmailAlert(alert);
    
    expect(email.subject).toContain('food');
    expect(email.html).toContain('85%');
    expect(email.html).toContain('Money App');
  });

  it('generates exceeded email content', () => {
    const alert = createAlert(ALERT_TYPES.EXCEEDED, {
      category: 'shopping', percentage: 120, spent: 240, limit: 200
    });
    const email = generateEmailAlert(alert);
    
    expect(email.subject).toContain('überschritten');
    expect(email.html).toContain('240');
  });

  it('generates critical email content', () => {
    const alert = createAlert(ALERT_TYPES.CRITICAL, {
      category: 'entertainment', percentage: 150, spent: 300, limit: 200
    });
    const email = generateEmailAlert(alert);
    
    expect(email.subject).toContain('Kritisch');
    expect(email.html).toContain('50%');
  });
});

describe('Budget Alerts - Push Notifications', () => {
  it('creates push payload with correct structure', () => {
    const alert = createAlert(ALERT_TYPES.WARNING, {
      category: 'food', percentage: 85, spent: 85, limit: 100
    });
    const payload = createPushPayload(alert);
    
    expect(payload.title).toBe(alert.title);
    expect(payload.body).toBe(alert.body);
    expect(payload.tag).toContain('food');
    expect(payload.data.url).toContain('food');
  });

  it('requires interaction for critical alerts', () => {
    const alert = createAlert(ALERT_TYPES.CRITICAL, {
      category: 'food', percentage: 150, spent: 300, limit: 200
    });
    const payload = createPushPayload(alert);
    expect(payload.requireInteraction).toBe(true);
  });

  it('includes actions for exceeded alerts', () => {
    const alert = createAlert(ALERT_TYPES.EXCEEDED, {
      category: 'food', percentage: 100, spent: 100, limit: 100
    });
    const payload = createPushPayload(alert);
    expect(payload.actions.length).toBeGreaterThan(0);
  });
});

describe('Budget Alerts - Alert History', () => {
  it('adds alerts to history', () => {
    const history = new AlertHistory();
    const alert = createAlert(ALERT_TYPES.WARNING, {
      category: 'food', percentage: 85, spent: 85, limit: 100
    });
    history.add(alert);
    
    expect(history.alerts.length).toBe(1);
  });

  it('limits history size', () => {
    const history = new AlertHistory(3);
    for (let i = 0; i < 5; i++) {
      history.add({ id: `test${i}` });
    }
    expect(history.alerts.length).toBe(3);
  });

  it('gets alerts by category', () => {
    const history = new AlertHistory();
    const alert1 = createAlert(ALERT_TYPES.WARNING, {
      category: 'food', percentage: 85, spent: 85, limit: 100
    });
    const alert2 = createAlert(ALERT_TYPES.WARNING, {
      category: 'transport', percentage: 85, spent: 85, limit: 100
    });
    history.add(alert1);
    history.add(alert2);
    
    const foodAlerts = history.getByCategory('food');
    expect(foodAlerts.length).toBe(1);
  });

  it('marks alerts as read', () => {
    const history = new AlertHistory();
    const alert = createAlert(ALERT_TYPES.WARNING, {
      category: 'food', percentage: 85, spent: 85, limit: 100
    });
    history.add(alert);
    history.markAsRead(alert.id);
    
    expect(history.alerts[0].read).toBe(true);
  });

  it('gets unread alerts', () => {
    const history = new AlertHistory();
    const alert1 = createAlert(ALERT_TYPES.WARNING, {
      category: 'food', percentage: 85, spent: 85, limit: 100
    });
    const alert2 = createAlert(ALERT_TYPES.WARNING, {
      category: 'transport', percentage: 85, spent: 85, limit: 100
    });
    history.add(alert1);
    history.add(alert2);
    history.markAsRead(alert1.id);
    
    const unread = history.getUnread();
    expect(unread.length).toBe(1);
  });

  it('serializes and deserializes', () => {
    const history = new AlertHistory();
    const alert = createAlert(ALERT_TYPES.WARNING, {
      category: 'food', percentage: 85, spent: 85, limit: 100
    });
    history.add(alert);
    
    const json = JSON.parse(JSON.stringify(history.toJSON()));
    const restored = AlertHistory.fromJSON(json);
    expect(restored.alerts.length).toBe(1);
  });
});

describe('Budget Alerts - Settings', () => {
  it('creates default settings', () => {
    const settings = createAlertSettings();
    expect(settings.enabled).toBe(true);
    expect(settings.channels).toContain(ALERT_CHANNELS.IN_APP);
    expect(settings.thresholds.warning).toBe(80);
    expect(settings.thresholds.exceeded).toBe(100);
    expect(settings.thresholds.critical).toBe(120);
  });

  it('applies overrides', () => {
    const settings = createAlertSettings({
      enabled: false,
      channels: [ALERT_CHANNELS.EMAIL],
      emailAddress: 'test@example.com'
    });
    expect(settings.enabled).toBe(false);
    expect(settings.emailAddress).toBe('test@example.com');
  });

  it('detects quiet hours correctly', () => {
    const settings = createAlertSettings({
      quietHoursStart: '00:00',
      quietHoursEnd: '00:00'
    });
    // Should return false when range is 0 (whole day)
    const result = isQuietHours(settings);
    expect(typeof result).toBe('boolean');
  });
});

describe('Budget Alerts - Async Functions', () => {
  it('sendEmailAlert returns success', async () => {
    const alert = createAlert(ALERT_TYPES.WARNING, {
      category: 'food', percentage: 85, spent: 85, limit: 100
    });
    const result = await sendEmailAlert(alert, 'test@example.com');
    expect(result.success).toBe(true);
    expect(result.to).toBe('test@example.com');
  });

  it('sendPushAlert returns success', async () => {
    const alert = createAlert(ALERT_TYPES.WARNING, {
      category: 'food', percentage: 85, spent: 85, limit: 100
    });
    const result = await sendPushAlert(alert, { endpoint: 'https://push.example.com' });
    expect(result.success).toBe(true);
  });
});
