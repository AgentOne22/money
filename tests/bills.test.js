import { describe, it, expect } from 'vitest';
import {
  BILL_PATTERNS,
  TYPICAL_BILL_AMOUNTS,
  detectBills,
  groupBillsByCategory,
  calculateMonthlyBillExpenses,
  getBillsSummary,
  exportBillsToCSV,
  exportBillsToPDF
} from '$lib/bills';

describe('Bill Detection - Pattern Matching', () => {
  it('detects insurance bills', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Helsana Versicherung', amount: -350.00 },
      { date: '2026-02-01', description: 'Helsana Versicherung', amount: -350.00 },
    ];
    const bills = detectBills(transactions);
    expect(bills.length).toBeGreaterThan(0);
    expect(bills[0].category).toBe('insurance');
  });

  it('detects utility bills', () => {
    const transactions = [
      { date: '2026-01-05', description: 'EWZ Energie', amount: -120.50 },
    ];
    const bills = detectBills(transactions);
    expect(bills.length).toBeGreaterThan(0);
    expect(bills[0].category).toBe('utilities');
  });

  it('detects telecom bills', () => {
    const transactions = [
      { date: '2026-01-10', description: 'Swisscom Mobile', amount: -65.00 },
    ];
    const bills = detectBills(transactions);
    expect(bills.length).toBeGreaterThan(0);
    expect(bills[0].category).toBe('telecom');
  });

  it('detects health bills', () => {
    const transactions = [
      { date: '2026-01-15', description: 'Arzt Dr. Müller', amount: -180.00 },
    ];
    const bills = detectBills(transactions);
    expect(bills.length).toBeGreaterThan(0);
    expect(bills[0].category).toBe('health');
  });

  it('detects general invoice patterns', () => {
    const transactions = [
      { date: '2026-01-20', description: 'Rechnung Nr. 12345', amount: -450.00 },
    ];
    const bills = detectBills(transactions);
    expect(bills.length).toBeGreaterThan(0);
  });

  it('does not detect income as bills', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Gehalt', amount: 3500.00 },
    ];
    const bills = detectBills(transactions);
    expect(bills.length).toBe(0);
  });

  it('does not detect random shopping as bills', () => {
    const transactions = [
      { date: '2026-01-15', description: 'Amazon.de Bestellung', amount: -29.99 },
    ];
    const bills = detectBills(transactions);
    // Low confidence should be filtered out
    expect(bills.length).toBe(0);
  });
});

describe('Bill Detection - Confidence', () => {
  it('assigns high confidence to known patterns', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Helsana Versicherung', amount: -350.00 },
    ];
    const bills = detectBills(transactions);
    expect(bills[0].confidence).toBeGreaterThan(0.5);
  });

  it('assigns lower confidence to unknown patterns', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Unbekannt', amount: -50.00 },
    ];
    const bills = detectBills(transactions);
    // Should be filtered out due to low confidence
    expect(bills.length).toBe(0);
  });

  it('respects minimum confidence threshold', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Helsana', amount: -350.00 },
    ];
    const bills = detectBills(transactions, { minConfidence: 0.95 });
    // High threshold should filter out (confidence is 0.9)
    expect(bills.length).toBe(0);
  });
});

describe('Bill Detection - Provider Extraction', () => {
  it('extracts provider from description', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Helsana Versicherung', amount: -350.00 },
    ];
    const bills = detectBills(transactions);
    expect(bills[0].provider).toBeDefined();
    expect(bills[0].provider.length).toBeGreaterThan(0);
  });

  it('extracts reference number', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Rechnung REF-12345', amount: -200.00 },
    ];
    const bills = detectBills(transactions);
    expect(bills[0].referenceNumber).toBeDefined();
  });
});

describe('Bill Detection - Deduplication', () => {
  it('deduplicates same provider/amount/month', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Helsana', amount: -350.00 },
      { date: '2026-01-01', description: 'Helsana', amount: -350.00 },
    ];
    const bills = detectBills(transactions);
    expect(bills.length).toBe(1);
  });

  it('keeps different months separate', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Helsana', amount: -350.00 },
      { date: '2026-02-01', description: 'Helsana', amount: -350.00 },
    ];
    const bills = detectBills(transactions);
    expect(bills.length).toBe(2);
  });
});

describe('Bill Detection - Grouping', () => {
  const bills = [
    { date: '2026-01-01', description: 'Helsana', amount: -350.00, absAmount: 350, category: 'insurance', confidence: 0.9, provider: 'Helsana' },
    { date: '2026-01-05', description: 'EWZ', amount: -120.00, absAmount: 120, category: 'utilities', confidence: 0.8, provider: 'EWZ' },
    { date: '2026-01-10', description: 'Swisscom', amount: -65.00, absAmount: 65, category: 'telecom', confidence: 0.85, provider: 'Swisscom' },
    { date: '2026-02-01', description: 'Helsana', amount: -350.00, absAmount: 350, category: 'insurance', confidence: 0.9, provider: 'Helsana' },
  ];

  it('groups bills by category', () => {
    const groups = groupBillsByCategory(bills);
    expect(groups.length).toBeGreaterThan(0);
    const insurance = groups.find(g => g.category === 'insurance');
    expect(insurance).toBeDefined();
    expect(insurance.count).toBe(2);
  });

  it('calculates category totals', () => {
    const groups = groupBillsByCategory(bills);
    const insurance = groups.find(g => g.category === 'insurance');
    expect(insurance.totalAmount).toBe(700);
  });

  it('calculates monthly expenses', () => {
    const monthly = calculateMonthlyBillExpenses(bills);
    expect(monthly.length).toBe(2);
    const jan = monthly.find(m => m.month === '2026-01');
    expect(jan.total).toBe(535); // 350 + 120 + 65
  });
});

describe('Bill Detection - Summary', () => {
  const bills = [
    { date: '2026-01-01', description: 'Helsana', amount: -350.00, absAmount: 350, category: 'insurance', confidence: 0.9, provider: 'Helsana', isRecurring: true },
    { date: '2026-01-05', description: 'EWZ', amount: -120.00, absAmount: 120, category: 'utilities', confidence: 0.8, provider: 'EWZ', isRecurring: false },
  ];

  it('creates summary with correct structure', () => {
    const summary = getBillsSummary(bills);
    expect(summary).toHaveProperty('totalBills');
    expect(summary).toHaveProperty('totalAmount');
    expect(summary).toHaveProperty('avgAmount');
    expect(summary).toHaveProperty('byCategory');
    expect(summary).toHaveProperty('monthly');
    expect(summary).toHaveProperty('topProviders');
  });

  it('calculates total amount', () => {
    const summary = getBillsSummary(bills);
    expect(summary.totalAmount).toBe(470);
  });

  it('calculates average amount', () => {
    const summary = getBillsSummary(bills);
    expect(summary.avgAmount).toBe(235);
  });

  it('counts recurring bills', () => {
    const summary = getBillsSummary(bills);
    expect(summary.recurringBills).toBe(1);
  });

  it('returns empty summary for no bills', () => {
    const summary = getBillsSummary([]);
    expect(summary.totalBills).toBe(0);
    expect(summary.totalAmount).toBe(0);
  });
});

describe('Bill Detection - Export', () => {
  const bills = [
    { date: '2026-01-01', description: 'Helsana', amount: -350.00, absAmount: 350, category: 'insurance', confidence: 0.9, provider: 'Helsana', referenceNumber: 'REF-123' },
  ];

  it('exports bills to CSV', () => {
    const csv = exportBillsToCSV(bills);
    expect(csv).toContain('Helsana');
    expect(csv).toContain('insurance');
  });

  it('exports bills to PDF-HTML', () => {
    const html = exportBillsToPDF(bills);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Rechnungsübersicht');
  });

  it('includes CHF currency in PDF', () => {
    const html = exportBillsToPDF(bills);
    expect(html).toContain('CHF');
  });
});

describe('Bill Detection - Constants', () => {
  it('has bill patterns defined', () => {
    expect(BILL_PATTERNS.insurance).toBeDefined();
    expect(BILL_PATTERNS.utilities).toBeDefined();
    expect(BILL_PATTERNS.telecom).toBeDefined();
    expect(BILL_PATTERNS.health).toBeDefined();
  });

  it('has typical bill amounts', () => {
    expect(TYPICAL_BILL_AMOUNTS.insurance).toBeDefined();
    expect(TYPICAL_BILL_AMOUNTS.utilities).toBeDefined();
    expect(TYPICAL_BILL_AMOUNTS.telecom).toBeDefined();
  });
});
