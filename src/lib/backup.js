/**
 * Backup: JSON-Export/Import der gesamten Datenbank
 * Unterstützt: Vollständige Backups, Selektive Backups, Validierung, Versionierung
 */

export const BACKUP_VERSION = '1.0';
export const BACKUP_MAGIC = 'MONEY_BACKUP';

/**
 * Erstellt ein vollständiges Backup der Datenbank
 */
export function createBackup(data, options = {}) {
  const {
    transactions = [],
    budgets = {},
    savingsGoals = [],
    recurringTransactions = [],
    alertHistory = [],
    alertSettings = {},
    exportSchedules = [],
    currencyRates = {},
    userPreferences = {}
  } = data;

  const backup = {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appName: 'Money',
    data: {
      transactions: sanitizeTransactions(transactions),
      budgets,
      savingsGoals: sanitizeSavingsGoals(savingsGoals),
      recurringTransactions: sanitizeRecurring(recurringTransactions),
      alertHistory: sanitizeAlertHistory(alertHistory),
      alertSettings,
      exportSchedules: sanitizeSchedules(exportSchedules),
      currencyRates,
      userPreferences
    },
    stats: {
      transactionCount: transactions.length,
      budgetCount: Object.keys(budgets).length,
      savingsGoalCount: savingsGoals.length,
      recurringCount: recurringTransactions.length,
      alertCount: alertHistory.length
    },
    checksum: null
  };

  backup.checksum = calculateChecksum(backup.data);
  return backup;
}

/**
 * Exportiert Backup als JSON-String
 */
export function exportBackupToJSON(data, options = {}) {
  const backup = createBackup(data, options);
  return JSON.stringify(backup, null, 2);
}

/**
 * Importiert und validiert ein Backup
 */
export function importBackup(jsonStringOrObject) {
  let backup;
  
  if (typeof jsonStringOrObject === 'string') {
    try {
      backup = JSON.parse(jsonStringOrObject);
    } catch (error) {
      throw new BackupError('INVALID_JSON', 'Die Backup-Datei ist kein gültiges JSON');
    }
  } else {
    backup = jsonStringOrObject;
  }

  // Validierung
  const validation = validateBackup(backup);
  if (!validation.valid) {
    throw new BackupError('INVALID_BACKUP', validation.error);
  }

  // Prüfsumme verifizieren
  if (backup.checksum) {
    const expectedChecksum = calculateChecksum(backup.data);
    if (backup.checksum !== expectedChecksum) {
      throw new BackupError('CHECKSUM_MISMATCH', 'Die Prüfsumme stimmt nicht überein - möglicherweise ist die Datei beschädigt');
    }
  }

  return {
    success: true,
    backup,
    data: backup.data,
    importedAt: new Date().toISOString()
  };
}

/**
 * Validiert ein Backup-Objekt
 */
export function validateBackup(backup) {
  if (!backup || typeof backup !== 'object') {
    return { valid: false, error: 'Backup ist kein gültiges Objekt' };
  }

  if (backup.magic !== BACKUP_MAGIC) {
    return { valid: false, error: 'Keine gültige Money-Backup-Datei (Magic-Byte fehlt)' };
  }

  if (!backup.version) {
    return { valid: false, error: 'Backup-Version fehlt' };
  }

  if (!isCompatibleVersion(backup.version)) {
    return { valid: false, error: `Backup-Version ${backup.version} ist nicht kompatibel` };
  }

  if (!backup.data || typeof backup.data !== 'object') {
    return { valid: false, error: 'Backup-Daten fehlen' };
  }

  return { valid: true };
}

/**
 * Prüft ob eine Backup-Version kompatibel ist
 */
export function isCompatibleVersion(version) {
  const [major] = version.split('.');
  const [currentMajor] = BACKUP_VERSION.split('.');
  return major === currentMajor;
}

/**
 * Wird ein Backup auf die Datenbank angewendet
 */
export function applyBackup(backup, currentData = {}, options = {}) {
  const { merge = false, overwrite = true } = options;
  
  const result = {
    transactions: [],
    budgets: {},
    savingsGoals: [],
    recurringTransactions: [],
    alertHistory: [],
    alertSettings: {},
    exportSchedules: [],
    currencyRates: {},
    userPreferences: {},
    stats: {
      added: 0,
      updated: 0,
      skipped: 0,
      conflicts: 0
    }
  };

  // Transaktionen
  if (backup.data.transactions) {
    if (merge) {
      const existingIds = new Set(
        (currentData.transactions || []).map(t => t.id || `${t.date}_${t.description}_${t.amount}`)
      );
      for (const tx of backup.data.transactions) {
        const txId = tx.id || `${tx.date}_${tx.description}_${tx.amount}`;
        if (existingIds.has(txId)) {
          result.stats.skipped++;
        } else {
          result.transactions.push(tx);
          result.stats.added++;
        }
      }
    } else {
      result.transactions = [...backup.data.transactions];
      result.stats.added = backup.data.transactions.length;
    }
  }

  // Budgets
  if (backup.data.budgets) {
    result.budgets = overwrite 
      ? { ...backup.data.budgets }
      : { ...backup.data.budgets, ...currentData.budgets };
  }

  // Sparziele
  if (backup.data.savingsGoals) {
    if (merge) {
      const existingIds = new Set((currentData.savingsGoals || []).map(g => g.id));
      for (const goal of backup.data.savingsGoals) {
        if (existingIds.has(goal.id)) {
          result.stats.skipped++;
        } else {
          result.savingsGoals.push(goal);
          result.stats.added++;
        }
      }
    } else {
      result.savingsGoals = [...backup.data.savingsGoals];
      result.stats.added += backup.data.savingsGoals.length;
    }
  }

  // Wiederkehrende Transaktionen
  if (backup.data.recurringTransactions) {
    result.recurringTransactions = [...backup.data.recurringTransactions];
  }

  // Alert-Historie
  if (backup.data.alertHistory) {
    result.alertHistory = [...backup.data.alertHistory];
  }

  // Alert-Einstellungen
  if (backup.data.alertSettings) {
    result.alertSettings = { ...backup.data.alertSettings };
  }

  // Export-Schedules
  if (backup.data.exportSchedules) {
    result.exportSchedules = [...backup.data.exportSchedules];
  }

  // Währungskurse
  if (backup.data.currencyRates) {
    result.currencyRates = { ...backup.data.currencyRates };
  }

  // Benutzereinstellungen
  if (backup.data.userPreferences) {
    result.userPreferences = { ...backup.data.userPreferences };
  }

  return result;
}

/**
 * Erstellt ein selektives Backup (nur bestimmte Daten)
 */
export function createSelectiveBackup(data, selections, options = {}) {
  const {
    transactions = [],
    budgets = {},
    savingsGoals = [],
    recurringTransactions = [],
    alertHistory = [],
    alertSettings = {},
    exportSchedules = [],
    currencyRates = {},
    userPreferences = {}
  } = data;

  const selectedData = {};

  if (selections.transactions) {
    selectedData.transactions = sanitizeTransactions(transactions);
  }
  if (selections.budgets) {
    selectedData.budgets = budgets;
  }
  if (selections.savingsGoals) {
    selectedData.savingsGoals = sanitizeSavingsGoals(savingsGoals);
  }
  if (selections.recurringTransactions) {
    selectedData.recurringTransactions = sanitizeRecurring(recurringTransactions);
  }
  if (selections.alertHistory) {
    selectedData.alertHistory = sanitizeAlertHistory(alertHistory);
  }
  if (selections.alertSettings) {
    selectedData.alertSettings = alertSettings;
  }
  if (selections.exportSchedules) {
    selectedData.exportSchedules = sanitizeSchedules(exportSchedules);
  }
  if (selections.currencyRates) {
    selectedData.currencyRates = currencyRates;
  }
  if (selections.userPreferences) {
    selectedData.userPreferences = userPreferences;
  }

  const backup = {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appName: 'Money',
    selective: true,
    selections,
    data: selectedData,
    stats: {
      transactionCount: selectedData.transactions?.length || 0,
      budgetCount: Object.keys(selectedData.budgets || {}).length,
      savingsGoalCount: selectedData.savingsGoals?.length || 0,
      recurringCount: selectedData.recurringTransactions?.length || 0,
      alertCount: selectedData.alertHistory?.length || 0
    },
    checksum: null
  };

  backup.checksum = calculateChecksum(backup.data);
  return backup;
}

/**
 * Vergleicht zwei Backups und zeigt Unterschiede
 */
export function compareBackups(backupA, backupB) {
  const differences = [];
  
  if (!backupA.data || !backupB.data) {
    return { comparable: false, differences: [] };
  }

  // Transaktionen vergleichen
  const txCountA = backupA.data.transactions?.length || 0;
  const txCountB = backupB.data.transactions?.length || 0;
  if (txCountA !== txCountB) {
    differences.push({
      field: 'transactions',
      type: 'count',
      a: txCountA,
      b: txCountB
    });
  }

  // Budgets vergleichen
  const budgetKeysA = Object.keys(backupA.data.budgets || {}).sort();
  const budgetKeysB = Object.keys(backupB.data.budgets || {}).sort();
  if (JSON.stringify(budgetKeysA) !== JSON.stringify(budgetKeysB)) {
    differences.push({
      field: 'budgets',
      type: 'keys',
      a: budgetKeysA,
      b: budgetKeysB
    });
  }

  // Sparziele vergleichen
  const goalCountA = backupA.data.savingsGoals?.length || 0;
  const goalCountB = backupB.data.savingsGoals?.length || 0;
  if (goalCountA !== goalCountB) {
    differences.push({
      field: 'savingsGoals',
      type: 'count',
      a: goalCountA,
      b: goalCountB
    });
  }

  return {
    comparable: true,
    differences,
    identical: differences.length === 0,
    createdA: backupA.createdAt,
    createdB: backupB.createdAt
  };
}

/**
 * Backup-Manager: Verwaltet mehrere Backups
 */
export class BackupManager {
  constructor() {
    this.backups = [];
  }

  /**
   * Fügt ein Backup hinzu
   */
  addBackup(backup, label = null) {
    const entry = {
      id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: label || `Backup ${new Date().toLocaleDateString('de-DE')}`,
      createdAt: new Date().toISOString(),
      backup
    };
    this.backups.unshift(entry);
    return entry;
  }

  /**
   * Entfernt ein Backup
   */
  removeBackup(backupId) {
    const index = this.backups.findIndex(b => b.id === backupId);
    if (index !== -1) {
      this.backups.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Gibt alle Backups zurück
   */
  getBackups() {
    return [...this.backups];
  }

  /**
   * Gibt das neueste Backup zurück
   */
  getLatestBackup() {
    return this.backups[0] || null;
  }

  /**
   * Serialisiert den Manager
   */
  toJSON() {
    return {
      backups: this.backups,
      version: BACKUP_VERSION
    };
  }

  /**
   * Lädt Manager aus JSON
   */
  static fromJSON(data) {
    const manager = new BackupManager();
    if (data && Array.isArray(data.backups)) {
      manager.backups = data.backups;
    }
    return manager;
  }
}

/**
 * Berechnet eine einfache Prüfsumme für die Daten
 */
export function calculateChecksum(data) {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Berechnet Backup-Statistiken
 */
export function getBackupStats(backup) {
  if (!backup || !backup.data) {
    return null;
  }

  const data = backup.data;
  const stats = {
    totalSize: JSON.stringify(backup).length,
    transactions: data.transactions?.length || 0,
    budgets: Object.keys(data.budgets || {}).length,
    savingsGoals: data.savingsGoals?.length || 0,
    recurring: data.recurringTransactions?.length || 0,
    alerts: data.alertHistory?.length || 0,
    schedules: data.exportSchedules?.length || 0,
    createdAt: backup.createdAt,
    version: backup.version
  };

  // Geschätzte Größe in KB
  stats.sizeKB = Math.round(stats.totalSize / 1024 * 100) / 100;

  return stats;
}

/**
 * Bereinigt Transaktionen für Backup
 */
function sanitizeTransactions(transactions) {
  return transactions.map(t => ({
    date: t.date || '',
    description: t.description || '',
    amount: typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0,
    category: t.category || 'other',
    source: t.source || 'manual',
    currency: t.currency || 'EUR',
    type: t.type || '',
    accountId: t.accountId || '',
    id: t.id || null
  }));
}

/**
 * Bereinigt Sparziele für Backup
 */
function sanitizeSavingsGoals(goals) {
  return goals.map(g => ({
    id: g.id || null,
    name: g.name || '',
    targetAmount: g.targetAmount || 0,
    currentAmount: g.currentAmount || 0,
    deadline: g.deadline || null,
    monthlyContribution: g.monthlyContribution || 0,
    interestRate: g.interestRate || 0,
    compoundFrequency: g.compoundFrequency || 'monthly',
    category: g.category || 'general',
    priority: g.priority || 'medium',
    status: g.status || 'active',
    createdAt: g.createdAt || null,
    updatedAt: g.updatedAt || null,
    contributions: g.contributions || []
  }));
}

/**
 * Bereinigt wiederkehrende Transaktionen für Backup
 */
function sanitizeRecurring(transactions) {
  return transactions.map(t => ({
    id: t.id || null,
    description: t.description || '',
    normalizedDescription: t.normalizedDescription || '',
    amount: t.amount || 0,
    type: t.type || 'other',
    interval: t.interval || 'monthly',
    occurrences: t.occurrences || 0,
    firstDate: t.firstDate || null,
    lastDate: t.lastDate || null,
    nextPredictedDate: t.nextPredictedDate || null,
    confidence: t.confidence || 0,
    category: t.category || 'other'
  }));
}

/**
 * Bereinigt Alert-Historie für Backup
 */
function sanitizeAlertHistory(alerts) {
  return alerts.map(a => ({
    id: a.id || null,
    type: a.type || 'warning',
    category: a.category || '',
    percentage: a.percentage || 0,
    spent: a.spent || 0,
    limit: a.limit || 0,
    title: a.title || '',
    body: a.body || '',
    timestamp: a.timestamp || null,
    read: a.read || false
  }));
}

/**
 * Bereinigt Export-Schedules für Backup
 */
function sanitizeSchedules(schedules) {
  return schedules.map(s => ({
    id: s.id || null,
    name: s.name || '',
    frequency: s.frequency || 'weekly',
    format: s.format || 'csv',
    enabled: s.enabled !== false,
    createdAt: s.createdAt || null,
    lastRun: s.lastRun || null,
    nextRun: s.nextRun || null,
    config: s.config || {},
    destination: s.destination || {}
  }));
}

/**
 * Backup-Fehlerklasse
 */
export class BackupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BackupError';
    this.code = code;
  }
}

/**
 * Erstellt einen Backup-Dateinamen
 */
export function generateBackupFilename(prefix = 'money_backup') {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `${prefix}_${dateStr}_${timeStr}.json`;
}

/**
 * Parst einen Backup-Dateinamen
 */
export function parseBackupFilename(filename) {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
  if (!match) return null;
  
  return {
    date: match[1],
    time: match[2].replace(/-/g, ':'),
    datetime: new Date(`${match[1]}T${match[2].replace(/-/g, ':')}`)
  };
}
