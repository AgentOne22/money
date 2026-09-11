import { describe, it, expect } from 'vitest';
import {
  exportTransactionsToCSV,
  exportReportToCSV,
  exportTransactionsToPDF,
  generateFinancialReport,
  downloadFile,
  exportTransactionsToJSON
} from '$lib/export';

describe('Export - CSV Transactions', () => {
  const transactions = [
    { date: '2026-01-05', description: 'Gehalt Firma GmbH', amount: 3500, category: 'income', source: 'csv' },
    { date: '2026-01-06', description: 'REWE Markt', amount: -85.43, category: 'groceries', source: 'csv' },
    { date: '2026-01-07', description: 'Netflix', amount: -15.99, category: 'entertainment', source: 'csv' }
  ];

  it('exports transactions to CSV format', () => {
    const csv = exportTransactionsToCSV(transactions);
    expect(csv).toContain('Datum');
    expect(csv).toContain('Beschreibung');
    expect(csv).toContain('Betrag');
  });

  it('formats dates correctly', () => {
    const csv = exportTransactionsToCSV(transactions);
    expect(csv).toContain('05.01.2026');
    expect(csv).toContain('06.01.2026');
  });

  it('formats amounts with German decimal separator', () => {
    const csv = exportTransactionsToCSV(transactions);
    expect(csv).toContain('3500,00');
    expect(csv).toContain('-85,43');
    expect(csv).toContain('-15,99');
  });

  it('includes all columns', () => {
    const csv = exportTransactionsToCSV(transactions);
    expect(csv).toContain('Kategorie');
    expect(csv).toContain('Quelle');
  });

  it('quotes descriptions with special characters', () => {
    const tx = [
      { date: '2026-01-01', description: 'Test "with quotes"', amount: -50, category: 'other', source: 'csv' }
    ];
    const csv = exportTransactionsToCSV(tx);
    expect(csv).toContain('"Test ""with quotes"""');
  });

  it('respects custom delimiter', () => {
    const csv = exportTransactionsToCSV(transactions, { delimiter: ',' });
    expect(csv).toContain(',');
    expect(csv).not.toContain(';');
  });

  it('can exclude header', () => {
    const csv = exportTransactionsToCSV(transactions, { includeHeader: false });
    expect(csv).not.toContain('Datum');
    expect(csv).toContain('05.01.2026');
  });

  it('handles empty transactions', () => {
    const csv = exportTransactionsToCSV([]);
    expect(csv).toContain('Datum');
    expect(csv.split('\r\n').length).toBe(2); // header + empty line
  });

  it('respects custom columns', () => {
    const csv = exportTransactionsToCSV(transactions, {
      columns: ['date', 'description', 'amount']
    });
    expect(csv).toContain('Datum');
    expect(csv).not.toContain('Kategorie');
  });
});

describe('Export - CSV Report', () => {
  const report = {
    title: 'Monatsreport Januar 2026',
    period: '01.01.2026 - 31.01.2026',
    summary: {
      'Gesamteinnahmen': '3.500,00 €',
      'Gesamtausgaben': '1.234,56 €',
      'Saldo': '2.265,44 €'
    },
    details: [
      { category: 'Lebensmittel', spent: 250, limit: 300, remaining: 50, percentage: 83, status: 'warning' },
      { category: 'Transport', spent: 80, limit: 100, remaining: 20, percentage: 80, status: 'ok' }
    ]
  };

  it('exports report with title', () => {
    const csv = exportReportToCSV(report);
    expect(csv).toContain('Monatsreport Januar 2026');
  });

  it('includes period', () => {
    const csv = exportReportToCSV(report);
    expect(csv).toContain('01.01.2026 - 31.01.2026');
  });

  it('includes summary section', () => {
    const csv = exportReportToCSV(report);
    expect(csv).toContain('Zusammenfassung');
    expect(csv).toContain('Gesamteinnahmen');
  });

  it('includes details table', () => {
    const csv = exportReportToCSV(report);
    expect(csv).toContain('Lebensmittel');
    expect(csv).toContain('Transport');
  });

  it('handles report without details', () => {
    const simpleReport = {
      title: 'Simple Report',
      summary: { test: 'value' }
    };
    const csv = exportReportToCSV(simpleReport);
    expect(csv).toContain('Simple Report');
  });
});

describe('Export - PDF (HTML)', () => {
  const transactions = [
    { date: '2026-01-05', description: 'Gehalt Firma GmbH', amount: 3500, category: 'income', source: 'csv' },
    { date: '2026-01-06', description: 'REWE Markt', amount: -85.43, category: 'groceries', source: 'csv' },
    { date: '2026-01-07', description: 'Netflix', amount: -15.99, category: 'entertainment', source: 'csv' },
    { date: '2026-01-08', description: 'Shell Tankstelle', amount: -65.00, category: 'transport', source: 'csv' }
  ];

  it('generates valid HTML', () => {
    const html = exportTransactionsToPDF(transactions);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('includes title', () => {
    const html = exportTransactionsToPDF(transactions, { title: 'Test Report' });
    expect(html).toContain('Test Report');
  });

  it('includes subtitle', () => {
    const html = exportTransactionsToPDF(transactions, { subtitle: 'Januar 2026' });
    expect(html).toContain('Januar 2026');
  });

  it('calculates totals correctly', () => {
    const html = exportTransactionsToPDF(transactions);
    expect(html).toContain('3.500,00 €'); // income
    expect(html).toContain('166,42 €'); // expenses (85.43 + 15.99 + 65.00)
  });

  it('includes all transactions', () => {
    const html = exportTransactionsToPDF(transactions);
    expect(html).toContain('Gehalt Firma GmbH');
    expect(html).toContain('REWE Markt');
    expect(html).toContain('Netflix');
    expect(html).toContain('Shell Tankstelle');
  });

  it('groups by category', () => {
    const html = exportTransactionsToPDF(transactions);
    expect(html).toContain('income');
    expect(html).toContain('groceries');
    expect(html).toContain('entertainment');
    expect(html).toContain('transport');
  });

  it('includes transaction count', () => {
    const html = exportTransactionsToPDF(transactions);
    expect(html).toContain('4 Transaktionen');
  });

  it('includes creation date', () => {
    const html = exportTransactionsToPDF(transactions);
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    expect(html).toContain(dateStr);
  });

  it('escapes HTML in descriptions', () => {
    const tx = [
      { date: '2026-01-01', description: '<script>alert("xss")</script>', amount: -50, category: 'other', source: 'csv' }
    ];
    const html = exportTransactionsToPDF(tx);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('sorts transactions by date descending', () => {
    const html = exportTransactionsToPDF(transactions);
    const posLatest = html.indexOf('08.01.2026');
    const posEarliest = html.indexOf('05.01.2026');
    expect(posLatest).toBeLessThan(posEarliest);
  });
});

describe('Export - Financial Report', () => {
  const reportData = {
    transactions: [
      { date: '2026-01-05', description: 'Gehalt', amount: 3500, category: 'income', source: 'csv' },
      { date: '2026-01-06', description: 'REWE', amount: -85.43, category: 'groceries', source: 'csv' },
      { date: '2026-02-05', description: 'Gehalt', amount: 3500, category: 'income', source: 'csv' },
      { date: '2026-02-06', description: 'REWE', amount: -90.00, category: 'groceries', source: 'csv' }
    ],
    budgets: {
      groceries: 200,
      transport: 100
    },
    recurring: [
      {
        description: 'Netflix',
        type: 'subscription',
        interval: 'monthly',
        amount: -15.99,
        nextPredictedDate: '2026-02-07'
      }
    ],
    period: { start: '2026-01-01', end: '2026-02-28' }
  };

  it('generates valid HTML', () => {
    const html = generateFinancialReport(reportData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
  });

  it('includes period', () => {
    const html = generateFinancialReport(reportData);
    expect(html).toContain('2026-01-01');
    expect(html).toContain('2026-02-28');
  });

  it('includes monthly overview', () => {
    const html = generateFinancialReport(reportData);
    expect(html).toContain('2026-01');
    expect(html).toContain('2026-02');
  });

  it('includes budget status', () => {
    const html = generateFinancialReport(reportData);
    expect(html).toContain('groceries');
    expect(html).toContain('transport');
  });

  it('includes recurring transactions', () => {
    const html = generateFinancialReport(reportData);
    expect(html).toContain('Netflix');
    expect(html).toContain('subscription');
  });

  it('calculates totals', () => {
    const html = generateFinancialReport(reportData);
    expect(html).toContain('7.000,00 €'); // total income
  });

  it('handles empty data', () => {
    const html = generateFinancialReport({ transactions: [], budgets: {}, recurring: [] });
    expect(html).toContain('<!DOCTYPE html>');
  });
});

describe('Export - JSON', () => {
  it('exports transactions as JSON', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Test', amount: 100 }
    ];
    const json = exportTransactionsToJSON(transactions);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].description).toBe('Test');
  });

  it('formats with indentation', () => {
    const transactions = [{ date: '2026-01-01', description: 'Test', amount: 100 }];
    const json = exportTransactionsToJSON(transactions);
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });
});

describe('Export - Download', () => {
  it('does not throw in any context', () => {
    
    // downloadFile should not throw even in non-browser contexts
    expect(() => downloadFile('test', 'test.csv')).not.toThrow();
  });
});
