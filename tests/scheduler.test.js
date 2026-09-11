import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SCHEDULE_FREQUENCIES,
  EXPORT_FORMATS,
  createExportSchedule,
  calculateNextRun,
  shouldRunSchedule,
  executeScheduledExport,
  ExportScheduler,
  createDailySchedule,
  createWeeklySchedule,
  createMonthlySchedule,
  getScheduleStats
} from '$lib/scheduler';

describe('Export Scheduler - Constants', () => {
  it('has correct frequency values', () => {
    expect(SCHEDULE_FREQUENCIES.DAILY).toBe('daily');
    expect(SCHEDULE_FREQUENCIES.WEEKLY).toBe('weekly');
    expect(SCHEDULE_FREQUENCIES.MONTHLY).toBe('monthly');
  });

  it('has correct format values', () => {
    expect(EXPORT_FORMATS.CSV).toBe('csv');
    expect(EXPORT_FORMATS.PDF).toBe('pdf');
    expect(EXPORT_FORMATS.JSON).toBe('json');
    expect(EXPORT_FORMATS.ALL).toBe('all');
  });
});

describe('Export Scheduler - Create Schedule', () => {
  it('creates schedule with defaults', () => {
    const schedule = createExportSchedule();
    expect(schedule).toHaveProperty('id');
    expect(schedule.frequency).toBe(SCHEDULE_FREQUENCIES.WEEKLY);
    expect(schedule.format).toBe(EXPORT_FORMATS.CSV);
    expect(schedule.enabled).toBe(true);
  });

  it('creates schedule with custom options', () => {
    const schedule = createExportSchedule({
      name: 'Mein Export',
      frequency: SCHEDULE_FREQUENCIES.DAILY,
      format: EXPORT_FORMATS.PDF,
      startTime: '09:00'
    });
    expect(schedule.name).toBe('Mein Export');
    expect(schedule.frequency).toBe(SCHEDULE_FREQUENCIES.DAILY);
    expect(schedule.format).toBe(EXPORT_FORMATS.PDF);
    expect(schedule.nextRun).toBeTruthy();
  });

  it('generates unique IDs', () => {
    const s1 = createExportSchedule();
    const s2 = createExportSchedule();
    expect(s1.id).not.toBe(s2.id);
  });
});

describe('Export Scheduler - Calculate Next Run', () => {
  it('calculates daily next run', () => {
    const next = calculateNextRun(SCHEDULE_FREQUENCIES.DAILY, '08:00');
    const date = new Date(next);
    expect(date.getHours()).toBe(8);
    expect(date.getMinutes()).toBe(0);
  });

  it('calculates weekly next run (Monday)', () => {
    const next = calculateNextRun(SCHEDULE_FREQUENCIES.WEEKLY, '08:00');
    const date = new Date(next);
    expect(date.getDay()).toBe(1); // Monday
  });

  it('calculates monthly next run (1st)', () => {
    const next = calculateNextRun(SCHEDULE_FREQUENCIES.MONTHLY, '08:00');
    const date = new Date(next);
    expect(date.getDate()).toBe(1);
  });
});

describe('Export Scheduler - Should Run', () => {
  it('returns true for due schedule', () => {
    const schedule = createExportSchedule();
    schedule.nextRun = new Date(Date.now() - 1000).toISOString();
    expect(shouldRunSchedule(schedule)).toBe(true);
  });

  it('returns false for disabled schedule', () => {
    const schedule = createExportSchedule();
    schedule.enabled = false;
    schedule.nextRun = new Date(Date.now() - 1000).toISOString();
    expect(shouldRunSchedule(schedule)).toBe(false);
  });

  it('returns false for future schedule', () => {
    const schedule = createExportSchedule();
    schedule.nextRun = new Date(Date.now() + 86400000).toISOString();
    expect(shouldRunSchedule(schedule)).toBe(false);
  });
});

describe('Export Scheduler - Execute Export', () => {
  const transactions = [
    { date: '2026-01-01', description: 'Test', amount: 100, category: 'income', source: 'manual' }
  ];

  it('executes CSV export', async () => {
    const schedule = createExportSchedule({ format: EXPORT_FORMATS.CSV });
    const result = await executeScheduledExport(schedule, transactions);
    
    expect(result.success).toBe(true);
    expect(result.results[0].format).toBe('csv');
    expect(result.results[0].success).toBe(true);
  });

  it('executes PDF export', async () => {
    const schedule = createExportSchedule({ format: EXPORT_FORMATS.PDF });
    const result = await executeScheduledExport(schedule, transactions);
    
    expect(result.success).toBe(true);
    expect(result.results[0].format).toBe('pdf');
  });

  it('executes JSON export', async () => {
    const schedule = createExportSchedule({ format: EXPORT_FORMATS.JSON });
    const result = await executeScheduledExport(schedule, transactions);
    
    expect(result.success).toBe(true);
    expect(result.results[0].format).toBe('json');
  });

  it('executes ALL formats export', async () => {
    const schedule = createExportSchedule({ format: EXPORT_FORMATS.ALL });
    const result = await executeScheduledExport(schedule, transactions);
    
    expect(result.results).toHaveLength(3);
  });

  it('updates schedule after execution', async () => {
    const schedule = createExportSchedule({ format: EXPORT_FORMATS.CSV });
    const result = await executeScheduledExport(schedule, transactions);
    
    expect(result.schedule.lastRun).toBeTruthy();
    expect(result.schedule.nextRun).toBeTruthy();
  });
});

describe('Export Scheduler - Scheduler Manager', () => {
  it('adds and retrieves schedules', () => {
    const scheduler = new ExportScheduler();
    const schedule = scheduler.addSchedule({ name: 'Test' });
    
    expect(scheduler.getSchedules()).toHaveLength(1);
    expect(scheduler.getSchedules()[0].name).toBe('Test');
  });

  it('removes schedules', () => {
    const scheduler = new ExportScheduler();
    const schedule = scheduler.addSchedule({ name: 'Test' });
    
    const removed = scheduler.removeSchedule(schedule.id);
    expect(removed).toBe(true);
    expect(scheduler.getSchedules()).toHaveLength(0);
  });

  it('updates schedules', () => {
    const scheduler = new ExportScheduler();
    const schedule = scheduler.addSchedule({ name: 'Test' });
    
    const updated = scheduler.updateSchedule(schedule.id, { name: 'Updated' });
    expect(updated.name).toBe('Updated');
  });

  it('gets only active schedules', () => {
    const scheduler = new ExportScheduler();
    scheduler.addSchedule({ name: 'Active', enabled: true });
    scheduler.addSchedule({ name: 'Inactive', enabled: false });
    
    expect(scheduler.getActiveSchedules()).toHaveLength(1);
  });

  it('serializes and deserializes', () => {
    const scheduler = new ExportScheduler();
    scheduler.addSchedule({ name: 'Test' });
    
    const json = scheduler.toJSON();
    const restored = ExportScheduler.fromJSON(json);
    
    expect(restored.getSchedules()).toHaveLength(1);
    expect(restored.getSchedules()[0].name).toBe('Test');
  });
});

describe('Export Scheduler - Convenience Functions', () => {
  it('creates daily schedule', () => {
    const schedule = createDailySchedule({ name: 'Daily' });
    expect(schedule.frequency).toBe(SCHEDULE_FREQUENCIES.DAILY);
  });

  it('creates weekly schedule', () => {
    const schedule = createWeeklySchedule({ name: 'Weekly' });
    expect(schedule.frequency).toBe(SCHEDULE_FREQUENCIES.WEEKLY);
  });

  it('creates monthly schedule', () => {
    const schedule = createMonthlySchedule({ name: 'Monthly' });
    expect(schedule.frequency).toBe(SCHEDULE_FREQUENCIES.MONTHLY);
  });
});

describe('Export Scheduler - Stats', () => {
  it('returns stats for schedule with no history', () => {
    const schedule = createExportSchedule();
    const stats = getScheduleStats(schedule);
    
    expect(stats.totalRuns).toBe(0);
    expect(stats.successRate).toBe(0);
  });

  it('calculates success rate', () => {
    const schedule = createExportSchedule();
    schedule.history = [
      { success: true, executionTimeMs: 100 },
      { success: false, executionTimeMs: 200 },
      { success: true, executionTimeMs: 150 }
    ];
    
    const stats = getScheduleStats(schedule);
    expect(stats.totalRuns).toBe(3);
    expect(stats.successRate).toBe(67);
    expect(stats.averageExecutionTime).toBe(150);
  });
});
