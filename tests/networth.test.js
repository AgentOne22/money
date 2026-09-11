import { describe, it, expect } from 'vitest';
import {
  createAccount,
  calculateNetWorth,
  calculateNetWorthTrend,
  generateMonthlySnapshots,
  formatNetWorthSummary
} from '$lib/networth';

describe('Net Worth - Account Creation', () => {
  it('creates a checking account with defaults', () => {
    const acc = createAccount();
    expect(acc.id).toBeDefined();
    expect(acc.type).toBe('checking');
    expect(acc.balance).toBe(0);
    expect(acc.currency).toBe('EUR');
    expect(acc.isLiquid).toBe(true);
  });

  it('creates a savings account with custom values', () => {
    const acc = createAccount({
      name: 'Tagesgeld',
      type: 'savings',
      balance: 10000,
      institution: 'ING'
    });
    expect(acc.name).toBe('Tagesgeld');
    expect(acc.type).toBe('savings');
    expect(acc.balance).toBe(10000);
    expect(acc.institution).toBe('ING');
  });

  it('rounds balance to 2 decimals', () => {
    const acc = createAccount({ balance: 1234.567 });
    expect(acc.balance).toBe(1234.57);
  });

  it('generates unique IDs', () => {
    const acc1 = createAccount();
    const acc2 = createAccount();
    expect(acc1.id).not.toBe(acc2.id);
  });

  it('sets timestamps', () => {
    const acc = createAccount();
    expect(acc.createdAt).toBeDefined();
    expect(acc.updatedAt).toBeDefined();
  });
});

describe('Net Worth - Calculation', () => {
  const accounts = [
    createAccount({ name: 'Girokonto', type: 'checking', balance: 5000 }),
    createAccount({ name: 'Tagesgeld', type: 'savings', balance: 15000 }),
    createAccount({ name: 'Bargeld', type: 'cash', balance: 500 })
  ];

  it('calculates total net worth', () => {
    const result = calculateNetWorth(accounts);
    expect(result.totalValue).toBe(20500);
  });

  it('calculates liquid value', () => {
    const result = calculateNetWorth(accounts);
    expect(result.liquidValue).toBe(20500);
  });

  it('groups by type', () => {
    const result = calculateNetWorth(accounts);
    const giro = result.byType.find(t => t.type === 'Girokonto');
    expect(giro.value).toBe(5000);
    expect(giro.count).toBe(1);
  });

  it('groups by currency', () => {
    const result = calculateNetWorth(accounts);
    const eur = result.byCurrency.find(c => c.currency === 'EUR');
    expect(eur.amount).toBe(20500);
  });

  it('returns empty result for no accounts', () => {
    const result = calculateNetWorth([]);
    expect(result.totalValue).toBe(0);
    expect(result.accountCount).toBe(0);
  });

  it('includes investment value in total', () => {
    const investments = [
      { type: 'crypto', currentValue: 5000 },
      { type: 'stock', currentValue: 3000 }
    ];
    const result = calculateNetWorth(accounts, investments);
    expect(result.totalValue).toBe(28500);
    expect(result.investmentValue).toBe(8000);
  });

  it('calculates asset allocation', () => {
    const result = calculateNetWorth(accounts);
    expect(result.assetAllocation.length).toBeGreaterThan(0);
    const totalPercent = result.assetAllocation.reduce((sum, a) => sum + a.percent, 0);
    expect(totalPercent).toBeCloseTo(100, 0);
  });
});

describe('Net Worth - Illiquid Assets', () => {
  const accounts = [
    createAccount({ name: 'Girokonto', type: 'checking', balance: 5000, isLiquid: true }),
    createAccount({ name: 'Immobilie', type: 'other', balance: 250000, isLiquid: false })
  ];

  it('separates liquid and illiquid', () => {
    const result = calculateNetWorth(accounts);
    expect(result.liquidValue).toBe(5000);
    expect(result.illiquidValue).toBe(250000);
    expect(result.totalValue).toBe(255000);
  });
});

describe('Net Worth - Trend', () => {
  const snapshots = [
    { month: '2026-01', value: 10000 },
    { month: '2026-02', value: 10500 },
    { month: '2026-03', value: 10200 }
  ];

  it('calculates month-over-month change', () => {
    const trend = calculateNetWorthTrend(snapshots);
    expect(trend[1].change).toBe(500);
    expect(trend[1].changePercent).toBe(5);
  });

  it('calculates negative change', () => {
    const trend = calculateNetWorthTrend(snapshots);
    expect(trend[2].change).toBe(-300);
    expect(trend[2].changePercent).toBeCloseTo(-2.86, 1);
  });

  it('returns empty for no snapshots', () => {
    expect(calculateNetWorthTrend([])).toEqual([]);
  });

  it('handles single snapshot', () => {
    const trend = calculateNetWorthTrend([{ month: '2026-01', value: 10000 }]);
    expect(trend[0].change).toBe(0);
    expect(trend[0].changePercent).toBe(0);
  });
});

describe('Net Worth - Monthly Snapshots', () => {
  const transactions = [
    { date: '2026-01-05', amount: 3000 },
    { date: '2026-01-10', amount: -1000 },
    { date: '2026-02-05', amount: 3000 },
    { date: '2026-02-15', amount: -500 }
  ];

  it('generates correct number of snapshots', () => {
    const snapshots = generateMonthlySnapshots(transactions, [], 3);
    expect(snapshots.length).toBe(3);
  });

  it('accumulates balance over time', () => {
    const snapshots = generateMonthlySnapshots(transactions, [], 12);
    const jan = snapshots.find(s => s.month === '2026-01');
    const feb = snapshots.find(s => s.month === '2026-02');
    expect(jan.balance).toBe(2000);
    expect(feb.balance).toBe(4500);
  });

  it('includes investment values', () => {
    const investments = [
      { buyDate: '2026-01-01', currentValue: 5000, amount: 1, buyPrice: 5000 }
    ];
    const snapshots = generateMonthlySnapshots(transactions, investments, 12);
    const jan = snapshots.find(s => s.month === '2026-01');
    expect(jan.investments).toBe(5000);
  });
});

describe('Net Worth - Formatting', () => {
  const netWorth = {
    totalValue: 123456.78,
    liquidValue: 50000,
    illiquidValue: 73456.78,
    investmentValue: 30000,
    accountCount: 3,
    investmentCount: 5
  };

  it('formats total value', () => {
    const summary = formatNetWorthSummary(netWorth);
    expect(summary.total).toContain('123.456,78');
  });

  it('formats liquid value', () => {
    const summary = formatNetWorthSummary(netWorth);
    expect(summary.liquid).toContain('50.000,00');
  });

  it('includes counts', () => {
    const summary = formatNetWorthSummary(netWorth);
    expect(summary.accountCount).toBe(3);
    expect(summary.investmentCount).toBe(5);
  });
});
