import { describe, it, expect } from 'vitest';
import {
  BACKUP_VERSION,
  BACKUP_MAGIC,
  createBackup,
  exportBackupToJSON,
  importBackup,
  validateBackup,
  applyBackup,
  createSelectiveBackup,
  compareBackups,
  BackupManager,
  calculateChecksum,
  getBackupStats,
  BackupError,
  generateBackupFilename,
  parseBackupFilename
} from '$lib/backup';

describe('Backup - Constants', () => {
  it('has correct version', () => {
    expect(BACKUP_VERSION).toBe('1.0');
  });

  it('has correct magic string', () => {
    expect(BACKUP_MAGIC).toBe('MONEY_BACKUP');
  });
});

describe('Backup - Create Backup', () => {
  const testData = {
    transactions: [
      { date: '2026-01-01', description: 'Test', amount: 100, category: 'income', source: 'manual' }
    ],
    budgets: { food: 300 },
    savingsGoals: [
      { id: 'goal_1', name: 'Test Goal', targetAmount: 1000, currentAmount: 500 }
    ],
    recurringTransactions: [],
    alertHistory: [],
    alertSettings: { enabled: true },
    exportSchedules: [],
    currencyRates: {},
    userPreferences: {}
  };

  it('creates backup with correct structure', () => {
    const backup = createBackup(testData);
    expect(backup.magic).toBe(BACKUP_MAGIC);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.data).toBeDefined();
    expect(backup.stats).toBeDefined();
    expect(backup.checksum).toBeTruthy();
  });

  it('includes all data', () => {
    const backup = createBackup(testData);
    expect(backup.data.transactions).toHaveLength(1);
    expect(backup.data.budgets.food).toBe(300);
    expect(backup.data.savingsGoals).toHaveLength(1);
  });

  it('calculates correct stats', () => {
    const backup = createBackup(testData);
    expect(backup.stats.transactionCount).toBe(1);
    expect(backup.stats.budgetCount).toBe(1);
    expect(backup.stats.savingsGoalCount).toBe(1);
  });

  it('generates checksum', () => {
    const backup = createBackup(testData);
    expect(backup.checksum).toBeTruthy();
    expect(typeof backup.checksum).toBe('string');
  });
});

describe('Backup - Export to JSON', () => {
  it('exports as formatted JSON', () => {
    const testData = {
      transactions: [],
      budgets: {},
      savingsGoals: [],
      recurringTransactions: [],
      alertHistory: [],
      alertSettings: {},
      exportSchedules: [],
      currencyRates: {},
      userPreferences: {}
    };
    const json = exportBackupToJSON(testData);
    expect(json).toContain('\n');
    expect(json).toContain('  ');

    const parsed = JSON.parse(json);
    expect(parsed.magic).toBe(BACKUP_MAGIC);
  });
});

describe('Backup - Import', () => {
  const createValidBackup = () => ({
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    data: {
      transactions: [],
      budgets: {},
      savingsGoals: [],
      recurringTransactions: [],
      alertHistory: [],
      alertSettings: {},
      exportSchedules: [],
      currencyRates: {},
      userPreferences: {}
    },
    stats: {},
    checksum: null // Will be calculated
  });

  // Calculate checksum for the valid backup before tests
  const validBackup = createValidBackup();
  validBackup.checksum = calculateChecksum(validBackup.data);

  it('imports valid backup from JSON string', () => {
    const json = JSON.stringify(validBackup);
    const result = importBackup(json);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('imports valid backup from object', () => {
    const result = importBackup(validBackup);
    expect(result.success).toBe(true);
  });

  it('throws on invalid JSON', () => {
    expect(() => importBackup('invalid json')).toThrow(BackupError);
  });

  it('throws on missing magic', () => {
    const invalid = { ...validBackup, magic: 'WRONG' };
    expect(() => importBackup(invalid)).toThrow(BackupError);
  });

  it('throws on incompatible version', () => {
    const invalid = { ...validBackup, version: '2.0' };
    expect(() => importBackup(invalid)).toThrow(BackupError);
  });

  it('throws on missing data', () => {
    const invalid = { ...validBackup };
    delete invalid.data;
    expect(() => importBackup(invalid)).toThrow(BackupError);
  });
});

describe('Backup - Validate', () => {
  it('validates correct backup', () => {
    const result = validateBackup({
      magic: BACKUP_MAGIC,
      version: BACKUP_VERSION,
      data: {}
    });
    expect(result.valid).toBe(true);
  });

  it('rejects null', () => {
    const result = validateBackup(null);
    expect(result.valid).toBe(false);
  });

  it('rejects wrong magic', () => {
    const result = validateBackup({ magic: 'WRONG', version: '1.0', data: {} });
    expect(result.valid).toBe(false);
  });

  it('rejects missing version', () => {
    const result = validateBackup({ magic: BACKUP_MAGIC, data: {} });
    expect(result.valid).toBe(false);
  });
});

describe('Backup - Apply', () => {
  const backup = {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    data: {
      transactions: [
        { date: '2026-01-01', description: 'Test', amount: 100 }
      ],
      budgets: { food: 300 },
      savingsGoals: [{ id: 'goal_1', name: 'Test', targetAmount: 1000 }],
      recurringTransactions: [],
      alertHistory: [],
      alertSettings: {},
      exportSchedules: []
    }
  };

  it('applies backup to empty data', () => {
    const result = applyBackup(backup);
    expect(result.transactions).toHaveLength(1);
    expect(result.budgets.food).toBe(300);
  });

  it('merges with existing data', () => {
    const currentData = {
      transactions: [{ date: '2026-01-02', description: 'Existing', amount: 50 }]
    };
    const result = applyBackup(backup, currentData, { merge: true });
    // In merge mode, result.transactions contains only the backup transactions that don't exist in current data
    expect(result.transactions).toHaveLength(1); // Only the backup transaction
    expect(result.transactions[0].description).toBe('Test');
    // Note: stats.added counts all added items (transactions + savingsGoals)
    expect(result.stats.added).toBe(2); // 1 transaction + 1 savingsGoal
  });

  it('skips duplicates in merge mode', () => {
    const currentData = {
      savingsGoals: [{ id: 'goal_1', name: 'Existing', targetAmount: 1000 }]
    };
    const result = applyBackup(backup, currentData, { merge: true });
    expect(result.stats.skipped).toBe(1);
  });

  it('overwrites in non-merge mode', () => {
    const currentData = {
      budgets: { food: 500 }
    };
    const result = applyBackup(backup, currentData, { overwrite: true });
    expect(result.budgets.food).toBe(300);
  });
});

describe('Backup - Selective Backup', () => {
  const testData = {
    transactions: [{ date: '2026-01-01', description: 'Test', amount: 100 }],
    budgets: { food: 300 },
    savingsGoals: [{ id: 'goal_1', name: 'Test', targetAmount: 1000 }],
    recurringTransactions: [],
    alertHistory: [],
    alertSettings: {},
    exportSchedules: [],
    currencyRates: {},
    userPreferences: {}
  };

  it('creates selective backup with only transactions', () => {
    const backup = createSelectiveBackup(testData, { transactions: true });
    expect(backup.data.transactions).toHaveLength(1);
    expect(backup.data.budgets).toBeUndefined();
    expect(backup.selective).toBe(true);
  });

  it('creates selective backup with budgets only', () => {
    const backup = createSelectiveBackup(testData, { budgets: true });
    expect(backup.data.budgets).toEqual({ food: 300 });
    expect(backup.data.transactions).toBeUndefined();
  });
});

describe('Backup - Compare', () => {
  const backupA = {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    createdAt: '2026-01-01',
    data: {
      transactions: [{ amount: 100 }],
      budgets: { food: 300 },
      savingsGoals: []
    }
  };

  const backupB = {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    createdAt: '2026-01-02',
    data: {
      transactions: [{ amount: 100 }, { amount: 200 }],
      budgets: { food: 300, transport: 100 },
      savingsGoals: [{ id: 'goal_1' }]
    }
  };

  it('detects differences', () => {
    const result = compareBackups(backupA, backupB);
    expect(result.comparable).toBe(true);
    expect(result.identical).toBe(false);
    expect(result.differences.length).toBeGreaterThan(0);
  });

  it('detects identical backups', () => {
    const result = compareBackups(backupA, backupA);
    expect(result.identical).toBe(true);
  });

  it('handles missing data', () => {
    const result = compareBackups({ data: null }, backupB);
    expect(result.comparable).toBe(false);
  });
});

describe('Backup - Manager', () => {
  it('adds and retrieves backups', () => {
    const manager = new BackupManager();
    const backup = { magic: BACKUP_MAGIC, version: BACKUP_VERSION, data: {} };
    const entry = manager.addBackup(backup, 'Test Backup');
    
    expect(manager.getBackups()).toHaveLength(1);
    expect(entry.label).toBe('Test Backup');
  });

  it('removes backups', () => {
    const manager = new BackupManager();
    const entry = manager.addBackup({ data: {} });
    
    const removed = manager.removeBackup(entry.id);
    expect(removed).toBe(true);
    expect(manager.getBackups()).toHaveLength(0);
  });

  it('gets latest backup', () => {
    const manager = new BackupManager();
    manager.addBackup({ data: {} }, 'First');
    manager.addBackup({ data: {} }, 'Second');
    
    expect(manager.getLatestBackup().label).toBe('Second');
  });

  it('serializes and deserializes', () => {
    const manager = new BackupManager();
    manager.addBackup({ data: {} }, 'Test');
    
    const json = manager.toJSON();
    const restored = BackupManager.fromJSON(json);
    
    expect(restored.getBackups()).toHaveLength(1);
  });
});

describe('Backup - Checksum', () => {
  it('calculates consistent checksum', () => {
    const data = { test: 'value' };
    const checksum1 = calculateChecksum(data);
    const checksum2 = calculateChecksum(data);
    expect(checksum1).toBe(checksum2);
  });

  it('different data gives different checksum', () => {
    const checksum1 = calculateChecksum({ a: 1 });
    const checksum2 = calculateChecksum({ a: 2 });
    expect(checksum1).not.toBe(checksum2);
  });
});

describe('Backup - Stats', () => {
  it('calculates backup stats', () => {
    const backup = {
      magic: BACKUP_MAGIC,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      data: {
        transactions: [{ amount: 100 }],
        budgets: { food: 300 },
        savingsGoals: [],
        recurringTransactions: [],
        alertHistory: [],
        exportSchedules: []
      }
    };
    
    const stats = getBackupStats(backup);
    expect(stats.transactions).toBe(1);
    expect(stats.budgets).toBe(1);
    expect(stats.sizeKB).toBeGreaterThan(0);
  });

  it('returns null for invalid backup', () => {
    expect(getBackupStats(null)).toBeNull();
  });
});

describe('Backup - Filename', () => {
  it('generates valid filename', () => {
    const filename = generateBackupFilename();
    expect(filename).toMatch(/^money_backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
  });

  it('parses filename correctly', () => {
    const parsed = parseBackupFilename('money_backup_2026-01-15_08-30-00.json');
    expect(parsed.date).toBe('2026-01-15');
    expect(parsed.time).toBe('08:30:00');
  });

  it('returns null for invalid filename', () => {
    expect(parseBackupFilename('invalid.json')).toBeNull();
  });
});

describe('Backup - Error Class', () => {
  it('creates error with code and message', () => {
    const error = new BackupError('TEST_CODE', 'Test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.message).toBe('Test message');
    expect(error.name).toBe('BackupError');
  });
});
