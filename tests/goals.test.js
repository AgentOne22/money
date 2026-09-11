import { describe, it, expect } from 'vitest';
import {
  GOAL_STATUS,
  GOAL_PRIORITY,
  GOAL_CATEGORY,
  createFinancialGoal,
  calculateGoalProgress,
  addGoalContribution,
  removeGoalContribution,
  createMilestones,
  getGoalsSummary,
  generateSavingsRecommendations,
  projectGoalsCompletion
} from '$lib/goals';

describe('Goals - Creation', () => {
  it('creates a financial goal with defaults', () => {
    const goal = createFinancialGoal();
    expect(goal.id).toBeDefined();
    expect(goal.name).toBe('Finanzziel');
    expect(goal.targetAmount).toBe(0);
    expect(goal.currentAmount).toBe(0);
    expect(goal.status).toBe(GOAL_STATUS.ACTIVE);
    expect(goal.contributions).toEqual([]);
  });

  it('creates a goal with custom values', () => {
    const goal = createFinancialGoal({
      name: 'Notfallreserve',
      category: GOAL_CATEGORY.EMERGENCY,
      targetAmount: 10000,
      currentAmount: 2500,
      deadline: '2026-12-31',
      monthlyContribution: 500,
      interestRate: 2.5,
      priority: GOAL_PRIORITY.HIGH
    });
    expect(goal.name).toBe('Notfallreserve');
    expect(goal.category).toBe(GOAL_CATEGORY.EMERGENCY);
    expect(goal.targetAmount).toBe(10000);
    expect(goal.currentAmount).toBe(2500);
    expect(goal.deadline).toBe('2026-12-31');
    expect(goal.monthlyContribution).toBe(500);
    expect(goal.interestRate).toBe(2.5);
    expect(goal.priority).toBe(GOAL_PRIORITY.HIGH);
  });

  it('ensures non-negative amounts', () => {
    const goal = createFinancialGoal({
      targetAmount: -5000,
      currentAmount: -1000,
      monthlyContribution: -200
    });
    expect(goal.targetAmount).toBe(0);
    expect(goal.currentAmount).toBe(0);
    expect(goal.monthlyContribution).toBe(0);
  });

  it('generates unique IDs', () => {
    const goal1 = createFinancialGoal();
    const goal2 = createFinancialGoal();
    expect(goal1.id).not.toBe(goal2.id);
  });

  it('sets default start date to today', () => {
    const goal = createFinancialGoal();
    expect(goal.startDate).toBe(new Date().toISOString().split('T')[0]);
  });
});

describe('Goals - Progress Calculation', () => {
  it('calculates progress correctly', () => {
    const goal = createFinancialGoal({
      targetAmount: 10000,
      currentAmount: 2500
    });
    const progress = calculateGoalProgress(goal);
    expect(progress.percentage).toBe(25);
    expect(progress.remaining).toBe(7500);
  });

  it('caps progress at 100%', () => {
    const goal = createFinancialGoal({
      targetAmount: 5000,
      currentAmount: 6000
    });
    const progress = calculateGoalProgress(goal);
    expect(progress.percentage).toBe(100);
    expect(progress.remaining).toBe(0);
  });

  it('returns null for invalid goal', () => {
    expect(calculateGoalProgress(null)).toBeNull();
    expect(calculateGoalProgress({ targetAmount: 0 })).toBeNull();
  });

  it('calculates months to goal with contribution', () => {
    const goal = createFinancialGoal({
      targetAmount: 5000,
      currentAmount: 1000,
      monthlyContribution: 500,
      interestRate: 0
    });
    const progress = calculateGoalProgress(goal);
    expect(progress.monthsToGoal).toBe(8); // 4000 / 500
  });

  it('calculates months to goal with interest', () => {
    const goal = createFinancialGoal({
      targetAmount: 5000,
      currentAmount: 1000,
      monthlyContribution: 200,
      interestRate: 3
    });
    const progress = calculateGoalProgress(goal);
    expect(progress.monthsToGoal).toBeGreaterThan(0);
    expect(progress.monthsToGoal).toBeLessThan(24);
  });

  it('returns 0 months when already at goal', () => {
    const goal = createFinancialGoal({
      targetAmount: 5000,
      currentAmount: 5000,
      monthlyContribution: 100
    });
    const progress = calculateGoalProgress(goal);
    expect(progress.monthsToGoal).toBe(0);
  });

  it('calculates time elapsed', () => {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const deadline = new Date();
    deadline.setFullYear(deadline.getFullYear() + 1);

    const goal = createFinancialGoal({
      targetAmount: 10000,
      currentAmount: 5000,
      startDate: startDate.toISOString().split('T')[0],
      deadline: deadline.toISOString().split('T')[0]
    });
    const progress = calculateGoalProgress(goal);
    expect(progress.timeElapsed).toBeGreaterThan(40);
    expect(progress.timeElapsed).toBeLessThan(60);
  });

  it('calculates projected completion date', () => {
    const goal = createFinancialGoal({
      targetAmount: 12000,
      currentAmount: 0,
      monthlyContribution: 1000,
      interestRate: 0
    });
    const progress = calculateGoalProgress(goal);
    expect(progress.projectedCompletionDate).toBeDefined();
  });

  it('determines if goal is on track', () => {
    const goal = createFinancialGoal({
      targetAmount: 12000,
      currentAmount: 6000,
      monthlyContribution: 500,
      interestRate: 0
    });
    const progress = calculateGoalProgress(goal);
    expect(progress.onTrack).toBeDefined();
  });
});

describe('Goals - Contributions', () => {
  it('adds a contribution', () => {
    const goal = createFinancialGoal({ targetAmount: 5000, currentAmount: 1000 });
    const result = addGoalContribution(goal, 500, '2026-01-15', 'Geburtstagsgeld');

    expect(result.contribution.amount).toBe(500);
    expect(result.contribution.date).toBe('2026-01-15');
    expect(result.contribution.note).toBe('Geburtstagsgeld');
    expect(result.newBalance).toBe(1500);
    expect(goal.currentAmount).toBe(1500);
    expect(goal.contributions.length).toBe(1);
  });

  it('adds contribution with default date', () => {
    const goal = createFinancialGoal({ targetAmount: 5000, currentAmount: 0 });
    const result = addGoalContribution(goal, 100);
    expect(result.contribution.date).toBe(new Date().toISOString().split('T')[0]);
  });

  it('removes a contribution', () => {
    const goal = createFinancialGoal({ targetAmount: 5000, currentAmount: 1000 });
    const result = addGoalContribution(goal, 500);
    expect(goal.currentAmount).toBe(1500);

    const removed = removeGoalContribution(goal, result.contribution.id);
    expect(removed).toBe(true);
    expect(goal.currentAmount).toBe(1000);
    expect(goal.contributions.length).toBe(0);
  });

  it('returns false for non-existent contribution', () => {
    const goal = createFinancialGoal({ targetAmount: 5000 });
    expect(removeGoalContribution(goal, 'non-existent')).toBe(false);
  });

  it('ensures positive contribution amounts', () => {
    const goal = createFinancialGoal({ targetAmount: 5000, currentAmount: 1000 });
    const result = addGoalContribution(goal, -500);
    expect(result.contribution.amount).toBe(0);
    expect(result.newBalance).toBe(1000);
  });

  it('marks goal as completed when target reached', () => {
    const goal = createFinancialGoal({ targetAmount: 1000, currentAmount: 500 });
    const result = addGoalContribution(goal, 500);
    expect(result.goalCompleted).toBe(true);
    expect(goal.status).toBe(GOAL_STATUS.COMPLETED);
  });

  it('resets status when contribution removed after completion', () => {
    const goal = createFinancialGoal({ targetAmount: 1000, currentAmount: 500 });
    const result = addGoalContribution(goal, 500);
    expect(goal.status).toBe(GOAL_STATUS.COMPLETED);

    removeGoalContribution(goal, result.contribution.id);
    expect(goal.status).toBe(GOAL_STATUS.ACTIVE);
  });
});

describe('Goals - Milestones', () => {
  it('creates milestones for a goal', () => {
    const goal = createFinancialGoal({ targetAmount: 10000 });
    const milestones = createMilestones(goal);
    expect(milestones.length).toBe(6); // 10, 25, 50, 75, 90, 100
  });

  it('sets correct milestone amounts', () => {
    const goal = createFinancialGoal({ targetAmount: 10000 });
    const milestones = createMilestones(goal);
    expect(milestones[0].amount).toBe(1000); // 10%
    expect(milestones[2].amount).toBe(5000); // 50%
    expect(milestones[5].amount).toBe(10000); // 100%
  });

  it('marks reached milestones', () => {
    const goal = createFinancialGoal({ targetAmount: 10000, currentAmount: 6000 });
    const milestones = createMilestones(goal);
    expect(milestones[0].reached).toBe(true); // 10%
    expect(milestones[1].reached).toBe(true); // 25%
    expect(milestones[2].reached).toBe(true); // 50%
    expect(milestones[3].reached).toBe(false); // 75%
  });
});

describe('Goals - Summary', () => {
  it('calculates summary for multiple goals', () => {
    const goals = [
      createFinancialGoal({ targetAmount: 5000, currentAmount: 2500 }),
      createFinancialGoal({ targetAmount: 10000, currentAmount: 1000 })
    ];
    const summary = getGoalsSummary(goals);

    expect(summary.totalGoals).toBe(2);
    expect(summary.totalSaved).toBe(3500);
    expect(summary.totalTarget).toBe(15000);
    expect(summary.overallPercentage).toBe(23);
  });

  it('counts active and completed goals', () => {
    const goals = [
      createFinancialGoal({ targetAmount: 5000, currentAmount: 2500, status: GOAL_STATUS.ACTIVE }),
      createFinancialGoal({ targetAmount: 10000, currentAmount: 10000, status: GOAL_STATUS.COMPLETED })
    ];
    const summary = getGoalsSummary(goals);
    expect(summary.activeGoals).toBe(1);
    expect(summary.completedGoals).toBe(1);
  });

  it('returns empty summary for no goals', () => {
    const summary = getGoalsSummary([]);
    expect(summary.totalGoals).toBe(0);
    expect(summary.totalSaved).toBe(0);
    expect(summary.overallPercentage).toBe(0);
  });

  it('sorts by priority then percentage', () => {
    const goals = [
      createFinancialGoal({ targetAmount: 1000, currentAmount: 500, priority: GOAL_PRIORITY.LOW }),
      createFinancialGoal({ targetAmount: 1000, currentAmount: 200, priority: GOAL_PRIORITY.HIGH }),
    ];
    const summary = getGoalsSummary(goals);
    expect(summary.progressList[0].priority).toBe(GOAL_PRIORITY.HIGH);
  });
});

describe('Goals - Recommendations', () => {
  it('generates recommendations based on income/expenses', () => {
    const recs = generateSavingsRecommendations(3500, 2500, 5000);
    expect(recs.length).toBeGreaterThanOrEqual(2);

    const rule5020 = recs.find(r => r.rule === '50/30/20 Regel');
    expect(rule5020).toBeDefined();
    expect(rule5020.amount).toBe(700); // 20% of 3500
  });

  it('includes emergency fund recommendation', () => {
    const recs = generateSavingsRecommendations(3500, 2000, 4000);
    const emergency = recs.find(r => r.rule === 'Notfallreserve');
    expect(emergency).toBeDefined();
    expect(emergency.amount).toBeGreaterThan(0);
  });

  it('handles negative surplus', () => {
    const recs = generateSavingsRecommendations(2000, 2500, 1000);
    const surplus = recs.find(r => r.rule === 'Aktueller Überschuss');
    expect(surplus).toBeUndefined();
  });

  it('includes goals-based recommendation', () => {
    const goals = [
      createFinancialGoal({ targetAmount: 12000, currentAmount: 0, monthlyContribution: 500, deadline: '2027-12-31' })
    ];
    const recs = generateSavingsRecommendations(3500, 2000, 0, goals);
    const goalsRec = recs.find(r => r.rule === 'Ziel-basierter Sparplan');
    expect(goalsRec).toBeDefined();
  });
});

describe('Goals - Projection', () => {
  it('projects completion for multiple goals', () => {
    const goals = [
      createFinancialGoal({
        name: 'Goal A',
        targetAmount: 12000,
        currentAmount: 0,
        monthlyContribution: 1000,
        interestRate: 0
      }),
      createFinancialGoal({
        name: 'Goal B',
        targetAmount: 6000,
        currentAmount: 0,
        monthlyContribution: 500,
        interestRate: 0
      })
    ];
    const projections = projectGoalsCompletion(goals);
    expect(projections.length).toBe(2);
    expect(projections[0].projectedCompletionDate).toBeDefined();
  });

  it('sorts projections by completion date', () => {
    const goals = [
      createFinancialGoal({
        name: 'Long Goal',
        targetAmount: 24000,
        currentAmount: 0,
        monthlyContribution: 500,
        interestRate: 0
      }),
      createFinancialGoal({
        name: 'Short Goal',
        targetAmount: 6000,
        currentAmount: 0,
        monthlyContribution: 1000,
        interestRate: 0
      })
    ];
    const projections = projectGoalsCompletion(goals);
    expect(projections[0].name).toBe('Short Goal');
    expect(projections[1].name).toBe('Long Goal');
  });

  it('excludes non-active goals', () => {
    const goals = [
      createFinancialGoal({ targetAmount: 1000, status: GOAL_STATUS.ACTIVE }),
      createFinancialGoal({ targetAmount: 1000, status: GOAL_STATUS.COMPLETED })
    ];
    const projections = projectGoalsCompletion(goals);
    expect(projections.length).toBe(1);
  });
});

describe('Goals - Constants', () => {
  it('has correct goal statuses', () => {
    expect(GOAL_STATUS.ACTIVE).toBe('active');
    expect(GOAL_STATUS.COMPLETED).toBe('completed');
    expect(GOAL_STATUS.OVERDUE).toBe('overdue');
  });

  it('has correct priorities', () => {
    expect(GOAL_PRIORITY.LOW).toBe('low');
    expect(GOAL_PRIORITY.HIGH).toBe('high');
    expect(GOAL_PRIORITY.CRITICAL).toBe('critical');
  });

  it('has correct categories', () => {
    expect(GOAL_CATEGORY.EMERGENCY).toBe('emergency');
    expect(GOAL_CATEGORY.RETIREMENT).toBe('retirement');
    expect(GOAL_CATEGORY.VACATION).toBe('vacation');
  });
});
