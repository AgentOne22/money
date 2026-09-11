/**
 * Export Scheduler: Automatischer täglicher/wöchentlicher Export (CSV/PDF)
 * Unterstützt: Geplante Exports, Historie, Konfiguration
 */

import { exportTransactionsToCSV, exportTransactionsToPDF, exportTransactionsToJSON } from './export';

export const SCHEDULE_FREQUENCIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly'
};

export const EXPORT_FORMATS = {
  CSV: 'csv',
  PDF: 'pdf',
  JSON: 'json',
  ALL: 'all'
};

/**
 * Erstellt einen Export-Schedule
 */
export function createExportSchedule(options = {}) {
  return {
    id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: options.name || 'Automatischer Export',
    frequency: options.frequency || SCHEDULE_FREQUENCIES.WEEKLY,
    format: options.format || EXPORT_FORMATS.CSV,
    enabled: options.enabled !== false,
    createdAt: new Date().toISOString(),
    lastRun: null,
    nextRun: calculateNextRun(options.frequency || SCHEDULE_FREQUENCIES.WEEKLY, options.startTime || '08:00'),
    config: {
      includeHeader: options.includeHeader !== false,
      delimiter: options.delimiter || ';',
      dateFormat: options.dateFormat || 'DD.MM.YYYY',
      columns: options.columns || ['date', 'description', 'amount', 'category', 'source'],
      targetCurrency: options.targetCurrency || null,
      includeSummary: options.includeSummary !== false,
      ...options.config
    },
    destination: {
      type: options.destinationType || 'download', // download, email, api
      email: options.destinationEmail || null,
      apiUrl: options.destinationApiUrl || null,
      path: options.destinationPath || './exports'
    },
    history: []
  };
}

/**
 * Berechnet den nächsten Ausführungszeitpunkt
 */
export function calculateNextRun(frequency, startTime = '08:00', fromDate = new Date()) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const next = new Date(fromDate);
  next.setHours(hours, minutes, 0, 0);

  // Wenn die Zeit heute bereits vergangen ist, zum nächsten Termin springen
  if (next <= fromDate) {
    next.setDate(next.getDate() + 1);
  }

  switch (frequency) {
    case SCHEDULE_FREQUENCIES.DAILY:
      // Nächster Tag bereits durch +1 oben
      break;
    case SCHEDULE_FREQUENCIES.WEEKLY:
      // Nächster Montag
      while (next.getDay() !== 1) {
        next.setDate(next.getDate() + 1);
      }
      break;
    case SCHEDULE_FREQUENCIES.BIWEEKLY:
      // Nächster Montag, dann alle 2 Wochen
      while (next.getDay() !== 1) {
        next.setDate(next.getDate() + 1);
      }
      break;
    case SCHEDULE_FREQUENCIES.MONTHLY:
      // Erster des nächsten Monats
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      break;
    case SCHEDULE_FREQUENCIES.QUARTERLY:
      // Erster Tag des nächsten Quartals
      const currentQuarter = Math.floor(next.getMonth() / 3);
      next.setMonth((currentQuarter + 1) * 3);
      next.setDate(1);
      break;
  }

  return next.toISOString();
}

/**
 * Prüft ob ein Schedule jetzt ausgeführt werden soll
 */
export function shouldRunSchedule(schedule, now = new Date()) {
  if (!schedule.enabled) return false;
  if (!schedule.nextRun) return false;
  
  const nextRun = new Date(schedule.nextRun);
  return nextRun <= now;
}

/**
 * Führt einen geplanten Export aus
 */
export async function executeScheduledExport(schedule, transactions, options = {}) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const dateStr = timestamp.split('T')[0];
  
  const results = [];
  const formats = schedule.format === EXPORT_FORMATS.ALL
    ? [EXPORT_FORMATS.CSV, EXPORT_FORMATS.PDF, EXPORT_FORMATS.JSON]
    : [schedule.format];

  for (const format of formats) {
    try {
      const result = await exportInFormat(format, transactions, schedule.config, dateStr);
      results.push({ format, ...result });
    } catch (error) {
      results.push({ format, success: false, error: error.message });
    }
  }

  const executionTime = Date.now() - startTime;
  const success = results.every(r => r.success);

  // Schedule aktualisieren
  const updatedSchedule = {
    ...schedule,
    lastRun: timestamp,
    nextRun: calculateNextRun(schedule.frequency, getTimeString(schedule.nextRun)),
    history: [
      {
        timestamp,
        success,
        formats: results.map(r => ({ format: r.format, success: r.success })),
        executionTimeMs: executionTime,
        transactionCount: transactions.length
      },
      ...(schedule.history || []).slice(0, 49)] // Max 50 Einträge
  };

  return {
    schedule: updatedSchedule,
    results,
    executionTimeMs: executionTime,
    success
  };
}

/**
 * Exportiert in einem bestimmten Format
 */
async function exportInFormat(format, transactions, config, dateStr) {
  const filenameBase = `export_${dateStr}`;

  switch (format) {
    case EXPORT_FORMATS.CSV: {
      const csv = exportTransactionsToCSV(transactions, {
        delimiter: config.delimiter,
        includeHeader: config.includeHeader,
        dateFormat: config.dateFormat,
        columns: config.columns
      });
      return {
        success: true,
        content: csv,
        filename: `${filenameBase}.csv`,
        mimeType: 'text/csv'
      };
    }
    case EXPORT_FORMATS.PDF: {
      const html = exportTransactionsToPDF(transactions, {
        title: `Finanzexport ${dateStr}`,
        dateFormat: config.dateFormat
      });
      return {
        success: true,
        content: html,
        filename: `${filenameBase}.html`,
        mimeType: 'text/html'
      };
    }
    case EXPORT_FORMATS.JSON: {
      const json = exportTransactionsToJSON(transactions);
      return {
        success: true,
        content: json,
        filename: `${filenameBase}.json`,
        mimeType: 'application/json'
      };
    }
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

/**
 * Export Manager: Verwaltet mehrere Schedules
 */
export class ExportScheduler {
  constructor() {
    this.schedules = [];
    this.timer = null;
    this.checkIntervalMs = 60000; // Prüfe jede Minute
  }

  /**
   * Fügt einen Schedule hinzu
   */
  addSchedule(schedule) {
    const newSchedule = schedule.id ? schedule : createExportSchedule(schedule);
    this.schedules.push(newSchedule);
    return newSchedule;
  }

  /**
   * Entfernt einen Schedule
   */
  removeSchedule(scheduleId) {
    const index = this.schedules.findIndex(s => s.id === scheduleId);
    if (index !== -1) {
      this.schedules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Aktualisiert einen Schedule
   */
  updateSchedule(scheduleId, updates) {
    const index = this.schedules.findIndex(s => s.id === scheduleId);
    if (index === -1) return null;
    
    this.schedules[index] = {
      ...this.schedules[index],
      ...updates,
      id: scheduleId // ID bleibt erhalten
    };
    return this.schedules[index];
  }

  /**
   * Gibt alle Schedules zurück
   */
  getSchedules() {
    return [...this.schedules];
  }

  /**
   * Gibt aktive Schedules zurück
   */
  getActiveSchedules() {
    return this.schedules.filter(s => s.enabled);
  }

  /**
   * Prüft und fällige Schedules aus
   */
  async checkAndRun(transactions, options = {}) {
    const dueSchedules = this.schedules.filter(s => shouldRunSchedule(s));
    const results = [];

    for (const schedule of dueSchedules) {
      const result = await executeScheduledExport(schedule, transactions, options);
      results.push(result);
      
      // Schedule in Liste aktualisieren
      const index = this.schedules.findIndex(s => s.id === schedule.id);
      if (index !== -1) {
        this.schedules[index] = result.schedule;
      }
    }

    return results;
  }

  /**
   * Startet automatische Prüfung
   */
  start(transactions, options = {}) {
    if (this.timer) return;
    
    this.timer = setInterval(async () => {
      await this.checkAndRun(transactions, options);
    }, this.checkIntervalMs);
  }

  /**
   * Stoppt automatische Prüfung
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Exportiert alle Daten sofort
   */
  async exportNow(transactions, options = {}) {
    const schedule = createExportSchedule({
      name: 'Manueller Export',
      format: options.format || EXPORT_FORMATS.ALL,
      ...options
    });
    return executeScheduledExport(schedule, transactions, options);
  }

  /**
   * Serialisiert alle Schedules
   */
  toJSON() {
    return {
      schedules: this.schedules,
      version: '1.0'
    };
  }

  /**
   * Lädt Schedules aus JSON
   */
  static fromJSON(data) {
    const scheduler = new ExportScheduler();
    if (data && Array.isArray(data.schedules)) {
      scheduler.schedules = data.schedules;
    }
    return scheduler;
  }
}

/**
 * Hilfsfunktion: Extrahiert Zeitstring aus ISO-Datum
 */
function getTimeString(isoDate) {
  if (!isoDate) return '08:00';
  const date = new Date(isoDate);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Erstellt einen täglichen Export-Schedule
 */
export function createDailySchedule(options = {}) {
  return createExportSchedule({
    ...options,
    frequency: SCHEDULE_FREQUENCIES.DAILY,
    name: options.name || 'Täglicher Export'
  });
}

/**
 * Erstellt einen wöchentlichen Export-Schedule
 */
export function createWeeklySchedule(options = {}) {
  return createExportSchedule({
    ...options,
    frequency: SCHEDULE_FREQUENCIES.WEEKLY,
    name: options.name || 'Wöchentlicher Export'
  });
}

/**
 * Erstellt einen monatlichen Export-Schedule
 */
export function createMonthlySchedule(options = {}) {
  return createExportSchedule({
    ...options,
    frequency: SCHEDULE_FREQUENCIES.MONTHLY,
    name: options.name || 'Monatlicher Export'
  });
}

/**
 * Berechnet Statistiken der Export-Historie
 */
export function getScheduleStats(schedule) {
  const history = schedule.history || [];
  
  if (history.length === 0) {
    return {
      totalRuns: 0,
      successRate: 0,
      averageExecutionTime: 0,
      lastRun: null,
      nextRun: schedule.nextRun
    };
  }

  const successful = history.filter(h => h.success).length;
  const totalExecutionTime = history.reduce((sum, h) => sum + (h.executionTimeMs || 0), 0);

  return {
    totalRuns: history.length,
    successRate: Math.round((successful / history.length) * 100),
    averageExecutionTime: Math.round(totalExecutionTime / history.length),
    lastRun: history[0]?.timestamp || null,
    nextRun: schedule.nextRun,
    totalTransactionsExported: history.reduce((sum, h) => sum + (h.transactionCount || 0), 0)
  };
}
