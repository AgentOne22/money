import { describe, it, expect } from 'vitest';
import {
  detectRecurringTransactions,
  normalizeDescription,
  calculateMonthlyRecurringCosts,
  getRecurringSummary,
  RECURRING_TYPES,
  RECURRING_INTERVALS
} from '$lib/recurring';

describe('Recurring Transactions - Detection', () => {
  const sampleTransactions = [
    // Monthly recurring - Netflix
    { date: '2025-11-07', description: 'Netflix Abo', amount: -15.99, category: 'entertainment' },
    { date: '2025-12-07', description: 'Netflix Abo', amount: -15.99, category: 'entertainment' },
    { date: '2026-01-07', description: 'Netflix Abo', amount: -15.99, category: 'entertainment' },
    { date: '2026-02-07', description: 'Netflix Abo', amount: -15.99, category: 'entertainment' },
    { date: '2026-03-07', description: 'Netflix Abo', amount: -15.99, category: 'entertainment' },

    // Monthly recurring - Spotify
    { date: '2025-11-07', description: 'Spotify Premium', amount: -9.99, category: 'subscriptions' },
    { date: '2025-12-07', description: 'Spotify Premium', amount: -9.99, category: 'subscriptions' },
    { date: '2026-01-07', description: 'Spotify Premium', amount: -9.99, category: 'subscriptions' },
    { date: '2026-02-07', description: 'Spotify Premium', amount: -9.99, category: 'subscriptions' },

    // Monthly recurring - Rent
    { date: '2025-11-01', description: 'Miete Januar', amount: -850.00, category: 'rent' },
    { date: '2025-12-01', description: 'Miete Februar', amount: -850.00, category: 'rent' },
    { date: '2026-01-01', description: 'Miete Maerz', amount: -850.00, category: 'rent' },
    { date: '2026-02-01', description: 'Miete April', amount: -850.00, category: 'rent' },

    // Monthly - Salary (positive)
    { date: '2025-11-01', description: 'Gehalt Firma GmbH', amount: 3500.00, category: 'income' },
    { date: '2025-12-01', description: 'Gehalt Firma GmbH', amount: 3500.00, category: 'income' },
    { date: '2026-01-01', description: 'Gehalt Firma GmbH', amount: 3500.00, category: 'income' },
    { date: '2026-02-01', description: 'Gehalt Firma GmbH', amount: 3500.00, category: 'income' },

    // Non-recurring one-off
    { date: '2026-01-15', description: 'Amazon.de Bestellung', amount: -49.99, category: 'shopping' }
  ];

  it('detects recurring transactions', () => {
    const result = detectRecurringTransactions(sampleTransactions, { minOccurrences: 2 });
    expect(result.length).toBeGreaterThan(0);
  });

  it('detects monthly interval correctly', () => {
    const result = detectRecurringTransactions(sampleTransactions, { minOccurrences: 2 });
    const netflix = result.find(r => r.description === 'Netflix Abo');
    expect(netflix).toBeDefined();
    expect(netflix.interval).toBe(RECURRING_INTERVALS.MONTHLY);
  });

  it('groups similar descriptions', () => {
    const transactions = [
      { date: '2025-11-01', description: 'Miete', amount: -850, category: 'rent' },
      { date: '2025-12-01', description: 'Miete', amount: -850, category: 'rent' },
      { date: '2026-01-01', description: 'Miete', amount: -850, category: 'rent' },
      { date: '2026-02-01', description: 'Miete', amount: -850, category: 'rent' },
    ];
    const result = detectRecurringTransactions(transactions, { minOccurrences: 2, descriptionSimilarity: 0.7 });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].occurrences).toBe(4);
  });

  it('does not detect non-recurring as recurring', () => {
    const result = detectRecurringTransactions(sampleTransactions, { minOccurrences: 2 });
    const amazon = result.find(r => r.description === 'Amazon.de Bestellung');
    expect(amazon).toBeUndefined();
  });

  it('sets correct confidence', () => {
    const result = detectRecurringTransactions(sampleTransactions, { minOccurrences: 2 });
    for (const r of result) {
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('predicts next date correctly for monthly', () => {
    const result = detectRecurringTransactions(sampleTransactions, { minOccurrences: 2 });
    const netflix = result.find(r => r.description === 'Netflix Abo');
    expect(netflix.nextPredictedDate).toBeDefined();
    expect(netflix.nextPredictedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('respects minimum occurrences threshold', () => {
    const result = detectRecurringTransactions(sampleTransactions, { minOccurrences: 5 });
    for (const r of result) {
      expect(r.occurrences).toBeGreaterThanOrEqual(5);
    }
  });

  it('respects amount tolerance', () => {
    const transactions = [
      { date: '2025-11-01', description: 'Test', amount: -100.00 },
      { date: '2025-12-01', description: 'Test', amount: -102.00 },
      { date: '2026-01-01', description: 'Test', amount: -99.00 },
    ];
    const result = detectRecurringTransactions(transactions, {
      minOccurrences: 2,
      amountTolerance: 0.05
    });
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Recurring Transactions - Type Detection', () => {
  it('detects rent type', () => {
    const transactions = [
      { date: '2025-11-01', description: 'Miete', amount: -850, category: 'rent' },
      { date: '2025-12-01', description: 'Miete', amount: -850, category: 'rent' },
      { date: '2026-01-01', description: 'Miete', amount: -850, category: 'rent' },
    ];
    const result = detectRecurringTransactions(transactions, { descriptionSimilarity: 0.7 });
    expect(result[0].type).toBe(RECURRING_TYPES.RENT);
  });

  it('detects subscription type', () => {
    const transactions = [
      { date: '2025-11-07', description: 'Netflix', amount: -15.99, category: 'entertainment' },
      { date: '2025-12-07', description: 'Netflix', amount: -15.99, category: 'entertainment' },
      { date: '2026-01-07', description: 'Netflix', amount: -15.99, category: 'entertainment' },
    ];
    const result = detectRecurringTransactions(transactions);
    expect(result[0].type).toBe(RECURRING_TYPES.SUBSCRIPTION);
  });

  it('detects salary type', () => {
    const transactions = [
      { date: '2025-11-01', description: 'Gehalt Firma GmbH', amount: 3500, category: 'income' },
      { date: '2025-12-01', description: 'Gehalt Firma GmbH', amount: 3500, category: 'income' },
      { date: '2026-01-01', description: 'Gehalt Firma GmbH', amount: 3500, category: 'income' },
    ];
    const result = detectRecurringTransactions(transactions);
    expect(result[0].type).toBe(RECURRING_TYPES.SALARY);
  });

  it('detects utilities type', () => {
    const transactions = [
      { date: '2025-11-03', description: 'Strom', amount: -85.50, category: 'utilities' },
      { date: '2025-12-03', description: 'Strom', amount: -85.50, category: 'utilities' },
      { date: '2026-01-03', description: 'Strom', amount: -85.50, category: 'utilities' },
    ];
    const result = detectRecurringTransactions(transactions);
    expect(result[0].type).toBe(RECURRING_TYPES.UTILITIES);
  });
});

describe('Recurring Transactions - Normalization', () => {
  it('normalizes description by removing special characters', () => {
    const result = normalizeDescription('Netflix Abo #123!');
    expect(result).toBe('netflix abo');
  });

  it('removes numbers from description', () => {
    const result = normalizeDescription('Test 123 Value 456');
    expect(result).toBe('test value');
  });

  it('trims and normalizes whitespace', () => {
    const result = normalizeDescription('  Netflix    Premium   ');
    expect(result).toBe('netflix premium');
  });

  it('handles empty input', () => {
    expect(normalizeDescription('')).toBe('');
    expect(normalizeDescription(null)).toBe('');
    expect(normalizeDescription(undefined)).toBe('');
  });

  it('converts to lowercase', () => {
    const result = normalizeDescription('NETFLIX PREMIUM');
    expect(result).toBe('netflix premium');
  });
});

describe('Recurring Transactions - Monthly Costs', () => {
  it('calculates monthly costs correctly', () => {
    const recurring = [
      { description: 'Netflix', amount: -15.99, interval: RECURRING_INTERVALS.MONTHLY },
      { description: 'Spotify', amount: -9.99, interval: RECURRING_INTERVALS.MONTHLY }
    ];
    const result = calculateMonthlyRecurringCosts(recurring);
    expect(result).toBeCloseTo(25.98, 2);
  });

  it('converts weekly to monthly', () => {
    const recurring = [
      { description: 'Weekly Sub', amount: -10.00, interval: RECURRING_INTERVALS.WEEKLY }
    ];
    const result = calculateMonthlyRecurringCosts(recurring);
    expect(result).toBeCloseTo(43.30, 0);
  });

  it('converts yearly to monthly', () => {
    const recurring = [
      { description: 'Yearly Sub', amount: -120.00, interval: RECURRING_INTERVALS.YEARLY }
    ];
    const result = calculateMonthlyRecurringCosts(recurring);
    expect(result).toBeCloseTo(10.00, 2);
  });

  it('handles empty array', () => {
    const result = calculateMonthlyRecurringCosts([]);
    expect(result).toBe(0);
  });
});

describe('Recurring Transactions - Summary', () => {
  const recurring = [
    {
      id: 'rec-1',
      description: 'Netflix',
      type: RECURRING_TYPES.SUBSCRIPTION,
      interval: RECURRING_INTERVALS.MONTHLY,
      amount: -15.99,
      confidence: 0.9
    },
    {
      id: 'rec-2',
      description: 'Miete',
      type: RECURRING_TYPES.RENT,
      interval: RECURRING_INTERVALS.MONTHLY,
      amount: -850.00,
      confidence: 0.95
    },
    {
      id: 'rec-3',
      description: 'Gehalt',
      type: RECURRING_TYPES.SALARY,
      interval: RECURRING_INTERVALS.MONTHLY,
      amount: 3500.00,
      confidence: 0.85
    }
  ];

  it('creates summary with correct structure', () => {
    const summary = getRecurringSummary(recurring);
    expect(summary).toHaveProperty('total');
    expect(summary).toHaveProperty('monthlyCosts');
    expect(summary).toHaveProperty('byType');
    expect(summary).toHaveProperty('byInterval');
    expect(summary).toHaveProperty('upcoming');
  });

  it('counts total correctly', () => {
    const summary = getRecurringSummary(recurring);
    expect(summary.total).toBe(3);
  });

  it('groups by type', () => {
    const summary = getRecurringSummary(recurring);
    expect(summary.byType[RECURRING_TYPES.SUBSCRIPTION].count).toBe(1);
    expect(summary.byType[RECURRING_TYPES.RENT].count).toBe(1);
    expect(summary.byType[RECURRING_TYPES.SALARY].count).toBe(1);
  });

  it('groups by interval', () => {
    const summary = getRecurringSummary(recurring);
    expect(summary.byInterval[RECURRING_INTERVALS.MONTHLY].count).toBe(3);
  });

  it('returns empty summary for no transactions', () => {
    const summary = getRecurringSummary([]);
    expect(summary.total).toBe(0);
    expect(summary.monthlyCosts).toBe(0);
  });
});

describe('Recurring Transactions - Intervals', () => {
  it('classifies weekly interval', () => {
    const transactions = [
      { date: '2026-01-07', description: 'Weekly', amount: -50 },
      { date: '2026-01-14', description: 'Weekly', amount: -50 },
      { date: '2026-01-21', description: 'Weekly', amount: -50 },
    ];
    const result = detectRecurringTransactions(transactions);
    expect(result[0].interval).toBe(RECURRING_INTERVALS.WEEKLY);
  });

  it('classifies biweekly interval', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Biweekly', amount: -100 },
      { date: '2026-01-15', description: 'Biweekly', amount: -100 },
      { date: '2026-01-29', description: 'Biweekly', amount: -100 },
    ];
    const result = detectRecurringTransactions(transactions);
    expect(result[0].interval).toBe(RECURRING_INTERVALS.BIWEEKLY);
  });

  it('classifies quarterly interval', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Quarterly', amount: -300 },
      { date: '2026-04-01', description: 'Quarterly', amount: -300 },
      { date: '2026-07-01', description: 'Quarterly', amount: -300 },
    ];
    const result = detectRecurringTransactions(transactions);
    expect(result[0].interval).toBe(RECURRING_INTERVALS.QUARTERLY);
  });
});
