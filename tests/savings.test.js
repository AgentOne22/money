import { describe, it, expect } from 'vitest';
import {
  calculateCompoundInterest,
  createSavingsGoal,
  calculateSavingsProgress,
  calculateMonthsToGoal,
  calculateMonthlySavingsPlan,
  addContribution,
  removeContribution,
  getSavingsSummary,
  generateSavingsRecommendations,
  COMPOUND_FREQUENCIES
} from '$lib/savings';

describe('Savings - Compound Interest', () => {
  it('calculates compound interest correctly', () => {
    // 1000€ at 5% for 10 years, monthly compounding
    const result = calculateCompoundInterest(1000, 5, 10, 'monthly');
    expect(result.principal).toBe(1000);
    expect(result.interest).toBeGreaterThan(0);
    expect(result.finalAmount).toBeGreaterThan(1000);
    expect(result.finalAmount).toBeCloseTo(1647.01, 0);
  });

  it('calculates compound interest for annual compounding', () => {
    const result = calculateCompoundInterest(1000, 5, 10, 'annually');
    expect(result.finalAmount).toBeCloseTo(1628.89, 0);
  });

  it('calculates compound interest for daily compounding', () => {
    const result = calculateCompoundInterest(1000, 5, 10, 'daily');
    expect(result.finalAmount).toBeGreaterThan(1648);
  });

  it('handles zero interest rate', () => {
    const result = calculateCompoundInterest(1000, 0, 10, 'monthly');
    expect(result.finalAmount).toBe(1000);
    expect(result.interest).toBe(0);
  });

  it('returns effective rate', () => {
    const result = calculateCompoundInterest(1000, 5, 1, 'monthly');
    expect(result.effectiveRate).toBeGreaterThan(5);
  });

  it('has correct compound frequencies', () => {
    expect(COMPOUND_FREQUENCIES.monthly).toBe(12);
    expect(COMPOUND_FREQUENCIES.quarterly).toBe(4);
    expect(COMPOUND_FREQUENCIES.annually).toBe(1);
    expect(COMPOUND_FREQUENCIES.daily).toBe(365);
  });
});

describe('Savings - Goal Creation', () => {
  it('creates a savings goal with defaults', () => {
    const goal = createSavingsGoal();
    expect(goal.id).toBeDefined();
    expect(goal.name).toBe('Sparziel');
    expect(goal.targetAmount).toBe(0);
    expect(goal.currentAmount).toBe(0);
    expect(goal.status).toBe('active');
    expect(goal.contributions).toEqual([]);
  });

  it('creates a savings goal with custom values', () => {
    const goal = createSavingsGoal({
      name: 'Urlaub',
      targetAmount: 3000,
      currentAmount: 500,
      deadline: '2026-12-31',
      monthlyContribution: 200,
      interestRate: 2.5
    });
    expect(goal.name).toBe('Urlaub');
    expect(goal.targetAmount).toBe(3000);
    expect(goal.currentAmount).toBe(500);
    expect(goal.deadline).toBe('2026-12-31');
    expect(goal.monthlyContribution).toBe(200);
    expect(goal.interestRate).toBe(2.5);
  });

  it('ensures non-negative amounts', () => {
    const goal = createSavingsGoal({
      targetAmount: -1000,
      currentAmount: -500,
      monthlyContribution: -100
    });
    expect(goal.targetAmount).toBe(0);
    expect(goal.currentAmount).toBe(0);
    expect(goal.monthlyContribution).toBe(0);
  });

  it('generates unique IDs', () => {
    const goal1 = createSavingsGoal();
    const goal2 = createSavingsGoal();
    expect(goal1.id).not.toBe(goal2.id);
  });
});

describe('Savings - Progress Calculation', () => {
  it('calculates progress correctly', () => {
    const goal = createSavingsGoal({
      targetAmount: 10000,
      currentAmount: 2500
    });
    const progress = calculateSavingsProgress(goal);
    expect(progress.percentage).toBe(25);
    expect(progress.remaining).toBe(7500);
    expect(progress.onTrack).toBe(true);
  });

  it('caps progress at 100%', () => {
    const goal = createSavingsGoal({
      targetAmount: 5000,
      currentAmount: 6000
    });
    const progress = calculateSavingsProgress(goal);
    expect(progress.percentage).toBe(100);
    expect(progress.remaining).toBe(0);
  });

  it('returns null for invalid goal', () => {
    expect(calculateSavingsProgress(null)).toBeNull();
    expect(calculateSavingsProgress({ targetAmount: 0 })).toBeNull();
  });

  it('calculates months to goal with interest', () => {
    const goal = createSavingsGoal({
      targetAmount: 5000,
      currentAmount: 1000,
      monthlyContribution: 200,
      interestRate: 3
    });
    const progress = calculateSavingsProgress(goal);
    expect(progress.monthsToGoal).toBeGreaterThan(0);
    expect(progress.monthsToGoal).toBeLessThan(24);
  });
});

describe('Savings - Months to Goal', () => {
  it('returns 0 when already at goal', () => {
    expect(calculateMonthsToGoal(5000, 5000, 100, 3)).toBe(0);
  });

  it('calculates months without interest', () => {
    const months = calculateMonthsToGoal(0, 1200, 100, 0);
    expect(months).toBe(12);
  });

  it('calculates months with interest starting from existing savings', () => {
    const months = calculateMonthsToGoal(500, 1200, 100, 5);
    expect(months).toBeLessThanOrEqual(7); // Interest helps, but not enough to beat 6
    expect(months).toBeGreaterThan(0);
  });

  it('returns null when no contribution', () => {
    expect(calculateMonthsToGoal(0, 1000, 0, 5)).toBeNull();
  });

  it('respects maximum months limit', () => {
    // Impossible goal: tiny contribution, huge target, no interest
    const months = calculateMonthsToGoal(0, 10000000, 1, 0);
    expect(months).toBeNull();
  });
});

describe('Savings - Monthly Savings Plan', () => {
  it('calculates needed monthly contribution without deadline', () => {
    const plan = calculateMonthlySavingsPlan(0, 1200, 100, 0);
    expect(plan.needed).toBe(100);
    expect(plan.monthsToGoal).toBe(12);
  });

  it('calculates needed contribution with deadline', () => {
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 12);
    const plan = calculateMonthlySavingsPlan(0, 1200, 0, 0, deadline.toISOString());
    expect(plan.needed).toBeGreaterThanOrEqual(100);
    expect(plan.monthsToDeadline).toBeGreaterThanOrEqual(11);
  });

  it('handles already reached goal', () => {
    const plan = calculateMonthlySavingsPlan(1200, 1200, 100, 0);
    expect(plan.needed).toBe(0);
    expect(plan.monthsToGoal).toBe(0);
  });

  it('marks as not affordable when overdue', () => {
    const pastDeadline = new Date();
    pastDeadline.setFullYear(pastFullYear() - 1);
    const plan = calculateMonthlySavingsPlan(0, 1200, 100, 0, pastDeadline.toISOString());
    expect(plan.affordable).toBe(false);
  });
});

describe('Savings - Contributions', () => {
  it('adds a contribution', () => {
    const goal = createSavingsGoal({ targetAmount: 5000, currentAmount: 1000 });
    const result = addContribution(goal, 500, '2026-01-15', 'Geburtstagsgeld');
    
    expect(result.contribution.amount).toBe(500);
    expect(result.contribution.date).toBe('2026-01-15');
    expect(result.contribution.note).toBe('Geburtstagsgeld');
    expect(result.newBalance).toBe(1500);
    expect(goal.currentAmount).toBe(1500);
    expect(goal.contributions.length).toBe(1);
  });

  it('adds contribution with default date', () => {
    const goal = createSavingsGoal({ targetAmount: 5000, currentAmount: 0 });
    const result = addContribution(goal, 100);
    expect(result.contribution.date).toBe(new Date().toISOString().split('T')[0]);
  });

  it('removes a contribution', () => {
    const goal = createSavingsGoal({ targetAmount: 5000, currentAmount: 1000 });
    const result = addContribution(goal, 500);
    expect(goal.currentAmount).toBe(1500);
    
    const removed = removeContribution(goal, result.contribution.id);
    expect(removed).toBe(true);
    expect(goal.currentAmount).toBe(1000);
    expect(goal.contributions.length).toBe(0);
  });

  it('returns false for non-existent contribution', () => {
    const goal = createSavingsGoal({ targetAmount: 5000 });
    expect(removeContribution(goal, 'non-existent')).toBe(false);
  });

  it('ensures positive contribution amounts', () => {
    const goal = createSavingsGoal({ targetAmount: 5000, currentAmount: 1000 });
    const result = addContribution(goal, -500);
    expect(result.contribution.amount).toBe(0);
    expect(result.newBalance).toBe(1000);
  });
});

describe('Savings - Summary', () => {
  it('calculates summary for multiple goals', () => {
    const goals = [
      createSavingsGoal({ targetAmount: 5000, currentAmount: 2500 }),
      createSavingsGoal({ targetAmount: 10000, currentAmount: 1000 })
    ];
    const summary = getSavingsSummary(goals);
    
    expect(summary.totalGoals).toBe(2);
    expect(summary.totalSaved).toBe(3500);
    expect(summary.totalTarget).toBe(15000);
    expect(summary.overallPercentage).toBe(23);
  });

  it('returns empty summary for no goals', () => {
    const summary = getSavingsSummary([]);
    expect(summary.totalGoals).toBe(0);
    expect(summary.totalSaved).toBe(0);
    expect(summary.overallPercentage).toBe(0);
  });
});

describe('Savings - Recommendations', () => {
  it('generates recommendations based on income/expenses', () => {
    const recs = generateSavingsRecommendations(3500, 2500, 5000);
    expect(recs.length).toBeGreaterThanOrEqual(2);
    
    const rule5020 = recs.find(r => r.rule === '50/30/20 Regel');
    expect(rule5020).toBeDefined();
    expect(rule5020.amount).toBe(700); // 20% of 3500
    
    const surplus = recs.find(r => r.rule === 'Aktueller Überschuss');
    expect(surplus).toBeDefined();
    expect(surplus.amount).toBe(1000);
  });

  it('includes emergency fund recommendation', () => {
    const recs = generateSavingsRecommendations(3500, 2000, 4000);
    const emergency = recs.find(r => r.rule === 'Notfallreserve');
    expect(emergency).toBeDefined();
    expect(emergency.amount).toBeGreaterThan(0);
    expect(emergency.percentage).toBeGreaterThan(0);
  });

  it('handles negative surplus', () => {
    const recs = generateSavingsRecommendations(2000, 2500, 1000);
    const surplus = recs.find(r => r.rule === 'Aktueller Überschuss');
    expect(surplus).toBeUndefined();
  });
});

// Helper
function pastFullYear() {
  return new Date().getFullYear() - 1;
}
