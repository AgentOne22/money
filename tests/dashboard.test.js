import { describe, it, expect } from 'vitest';
import { getBudgetProgress, getMonthlyBalance, getMonthlyOverview, getSavingsProgress, getCategorySpending } from '$lib/dashboard';

describe('Dashboard', () => {
  const sampleTransactions = [
    { date: '2026-01-05', description: 'Gehalt', amount: 3500, category: 'income' },
    { date: '2026-01-06', description: 'REWE', amount: -85, category: 'groceries' },
    { date: '2026-01-07', description: 'Netflix', amount: -15.99, category: 'entertainment' },
    { date: '2026-01-08', description: 'Shell', amount: -60, category: 'transport' },
    { date: '2026-01-10', description: 'Aldi', amount: -45, category: 'groceries' },
    { date: '2026-02-05', description: 'Gehalt', amount: 3500, category: 'income' },
    { date: '2026-02-06', description: 'REWE', amount: -90, category: 'groceries' }
  ];

  const budgets = {
    groceries: 200,
    entertainment: 50,
    transport: 100,
    food: 100
  };

  describe('getMonthlyBalance', () => {
    it('calculates income and expenses for January', () => {
      const result = getMonthlyBalance(sampleTransactions, 2026, 1);
      expect(result.income).toBe(3500);
      expect(result.expenses).toBe(205.99);
      expect(result.balance).toBeCloseTo(3294.01, 2);
    });

    it('calculates income and expenses for February', () => {
      const result = getMonthlyBalance(sampleTransactions, 2026, 2);
      expect(result.income).toBe(3500);
      expect(result.expenses).toBe(90);
      expect(result.balance).toBe(3410);
    });

    it('returns zero for empty month', () => {
      const result = getMonthlyBalance(sampleTransactions, 2026, 3);
      expect(result.income).toBe(0);
      expect(result.expenses).toBe(0);
      expect(result.balance).toBe(0);
    });
  });

  describe('getCategorySpending', () => {
    it('sums spending per category', () => {
      const result = getCategorySpending(sampleTransactions, 2026, 1);
      expect(result.groceries).toBe(130);
      expect(result.entertainment).toBe(15.99);
      expect(result.transport).toBe(60);
    });

    it('ignores income transactions', () => {
      const result = getCategorySpending(sampleTransactions, 2026, 1);
      expect(result.income).toBeUndefined();
    });
  });

  describe('getBudgetProgress', () => {
    it('calculates budget progress', () => {
      const result = getBudgetProgress(sampleTransactions, budgets, 2026, 1);
      const groceries = result.find((r) => r.category === 'groceries');
      expect(groceries.spent).toBe(130);
      expect(groceries.limit).toBe(200);
      expect(groceries.percentage).toBe(65);
      expect(groceries.status).toBe('ok');
    });

    it('marks exceeded budget', () => {
      const smallBudget = { groceries: 100 };
      const result = getBudgetProgress(sampleTransactions, smallBudget, 2026, 1);
      expect(result[0].status).toBe('exceeded');
    });

    it('marks warning at 80%', () => {
      const warningBudget = { groceries: 150 };
      const result = getBudgetProgress(sampleTransactions, warningBudget, 2026, 1);
      expect(result[0].status).toBe('warning');
    });
  });

  describe('getSavingsProgress', () => {
    it('calculates savings progress', () => {
      const goal = { target: 5000, deadline: '2026-12-31' };
      const result = getSavingsProgress(goal, 2500);
      expect(result.percentage).toBe(50);
      expect(result.remaining).toBe(2500);
    });

    it('caps at 100%', () => {
      const goal = { target: 5000, deadline: '2026-12-31' };
      const result = getSavingsProgress(goal, 6000);
      expect(result.percentage).toBe(100);
      expect(result.remaining).toBe(0);
    });

    it('returns null for invalid goal', () => {
      expect(getSavingsProgress(null, 100)).toBeNull();
      expect(getSavingsProgress({ target: 0 }, 100)).toBeNull();
    });
  });

  describe('getMonthlyOverview', () => {
    it('groups transactions by month', () => {
      const result = getMonthlyOverview(sampleTransactions);
      expect(result).toHaveLength(2);
      expect(result[0].month).toBe('2026-01');
      expect(result[0].income).toBe(3500);
      expect(result[1].month).toBe('2026-02');
    });

    it('sorts months chronologically', () => {
      const result = getMonthlyOverview(sampleTransactions);
      expect(result[0].month).toBe('2026-01');
      expect(result[1].month).toBe('2026-02');
    });
  });
});
