/**
 * Savings Goals: Automatische Spar-Pläne mit Zinseszins
 */

export const COMPOUND_FREQUENCIES = {
  monthly: 12,
  quarterly: 4,
  semi_annually: 2,
  annually: 1,
  daily: 365
};

export function calculateCompoundInterest(principal, annualRate, years, compoundFrequency = 'monthly') {
  const n = COMPOUND_FREQUENCIES[compoundFrequency] || 12;
  const r = annualRate / 100;
  const amount = principal * Math.pow(1 + r / n, n * years);
  const interest = amount - principal;

  return {
    principal,
    finalAmount: Math.round(amount * 100) / 100,
    interest: Math.round(interest * 100) / 100,
    years,
    annualRate,
    compoundFrequency,
    effectiveRate: Math.round((Math.pow(1 + r / n, n) - 1) * 10000) / 100
  };
}

export function createSavingsGoal({
  id = null,
  name = 'Sparziel',
  targetAmount = 0,
  currentAmount = 0,
  deadline = null,
  monthlyContribution = 0,
  interestRate = 0,
  compoundFrequency = 'monthly',
  category = 'general',
  priority = 'medium'
} = {}) {
  return {
    id: id || `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    targetAmount: Math.max(0, targetAmount),
    currentAmount: Math.max(0, currentAmount),
    deadline,
    monthlyContribution: Math.max(0, monthlyContribution),
    interestRate: Math.max(0, interestRate),
    compoundFrequency,
    category,
    priority,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contributions: [],
    status: 'active'
  };
}

export function calculateSavingsProgress(goal) {
  if (!goal || goal.targetAmount <= 0) return null;

  const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  let monthsToGoal = null;
  if (goal.monthlyContribution > 0 && goal.interestRate > 0) {
    monthsToGoal = calculateMonthsToGoal(
      goal.currentAmount,
      goal.targetAmount,
      goal.monthlyContribution,
      goal.interestRate,
      goal.compoundFrequency
    );
  } else if (goal.monthlyContribution > 0) {
    monthsToGoal = Math.ceil(remaining / goal.monthlyContribution);
  }

  let projectedInterest = 0;
  let projectedTotal = goal.currentAmount;

  if (goal.interestRate > 0 && goal.deadline) {
    const now = new Date();
    const deadline = new Date(goal.deadline);
    const yearsToDeadline = (deadline - now) / (365.25 * 24 * 60 * 60 * 1000);

    if (yearsToDeadline > 0) {
      const compoundResult = calculateCompoundInterest(
        goal.currentAmount,
        goal.interestRate,
        yearsToDeadline,
        goal.compoundFrequency
      );

      if (goal.monthlyContribution > 0) {
        const n = COMPOUND_FREQUENCIES[goal.compoundFrequency] || 12;
        const totalMonths = Math.floor(yearsToDeadline * 12);
        const rate = (goal.interestRate / 100) / n;
        const periodsPerMonth = n / 12;
        let accumulated = 0;

        for (let i = 0; i < totalMonths; i++) {
          accumulated = accumulated * (1 + rate * periodsPerMonth) + goal.monthlyContribution;
        }

        projectedTotal = compoundResult.finalAmount + accumulated;
        projectedInterest = projectedTotal - goal.currentAmount - (goal.monthlyContribution * totalMonths);
      } else {
        projectedTotal = compoundResult.finalAmount;
        projectedInterest = compoundResult.interest;
      }
    }
  }

  const monthlyPlan = calculateMonthlySavingsPlan(
    goal.currentAmount,
    goal.targetAmount,
    goal.monthlyContribution,
    goal.interestRate,
    goal.deadline
  );

  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    remaining,
    percentage,
    projectedTotal: Math.round(projectedTotal * 100) / 100,
    projectedInterest: Math.round(projectedInterest * 100) / 100,
    monthsToGoal,
    deadline: goal.deadline,
    onTrack: goal.deadline ? projectedTotal >= goal.targetAmount : true,
    monthlyPlan,
    contributions: goal.contributions?.length || 0
  };
}

export function calculateMonthsToGoal(current, target, monthlyContribution, annualRate, compoundFrequency = 'monthly') {
  if (current >= target) return 0;
  if (monthlyContribution <= 0) return null;

  const n = COMPOUND_FREQUENCIES[compoundFrequency] || 12;
  const r = (annualRate / 100) / n;
  const periodsPerMonth = n / 12;

  let accumulated = current;
  let months = 0;
  const maxMonths = 600;

  while (accumulated < target && months < maxMonths) {
    accumulated = accumulated * Math.pow(1 + r, periodsPerMonth) + monthlyContribution;
    months++;
  }

  return months >= maxMonths ? null : months;
}

export function calculateMonthlySavingsPlan(current, target, monthlyContribution, annualRate, deadline = null) {
  const remaining = target - current;
  if (remaining <= 0) return { needed: 0, affordable: true, monthsToGoal: 0 };

  if (!deadline) {
    const months = Math.ceil(remaining / monthlyContribution);
    return {
      needed: Math.ceil(remaining / Math.max(months, 1)),
      affordable: monthlyContribution > 0,
      monthsToGoal: months,
      totalContributions: months * monthlyContribution
    };
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const monthsToDeadline = Math.floor((deadlineDate - now) / (30.44 * 24 * 60 * 60 * 1000));

  if (monthsToDeadline <= 0) {
    return { needed: remaining, affordable: false, monthsToGoal: 0, totalContributions: 0 };
  }

  let neededMonthly;
  if (annualRate > 0) {
    const n = 12;
    const r = annualRate / 100 / n;
    const growthFactor = Math.pow(1 + r, monthsToDeadline);
    neededMonthly = (remaining - current * (growthFactor - 1)) / ((growthFactor - 1) / r * n);
    neededMonthly = Math.abs(neededMonthly);
  } else {
    neededMonthly = remaining / monthsToDeadline;
  }

  neededMonthly = Math.ceil(neededMonthly);
  const affordable = neededMonthly <= monthlyContribution;

  return {
    needed: neededMonthly,
    affordable,
    monthsToGoal: monthsToDeadline,
    monthsToDeadline,
    deadline,
    totalContributions: monthsToDeadline * neededMonthly,
    totalInterest: affordable
      ? (calculateCompoundInterest(current, annualRate, monthsToDeadline / 12, 'monthly')).interest
      : 0
  };
}

export function addContribution(goal, amount, date = null, note = '') {
  const contribution = {
    id: `contrib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    amount: Math.max(0, amount),
    date: date || new Date().toISOString().split('T')[0],
    note,
    createdAt: new Date().toISOString()
  };

  goal.contributions.push(contribution);
  goal.currentAmount += contribution.amount;
  goal.updatedAt = new Date().toISOString();

  return {
    contribution,
    newBalance: goal.currentAmount
  };
}

export function removeContribution(goal, contributionId) {
  const index = goal.contributions.findIndex(c => c.id === contributionId);
  if (index === -1) return false;

  const contribution = goal.contributions[index];
  goal.currentAmount -= contribution.amount;
  goal.contributions.splice(index, 1);
  goal.updatedAt = new Date().toISOString();

  return true;
}

export function getSavingsSummary(goals) {
  const progressList = goals
    .map(calculateSavingsProgress)
    .filter(Boolean);

  const totalSaved = progressList.reduce((sum, p) => sum + p.currentAmount, 0);
  const totalTarget = progressList.reduce((sum, p) => sum + p.targetAmount, 0);
  const totalProjected = progressList.reduce((sum, p) => sum + p.projectedTotal, 0);
  const totalInterest = progressList.reduce((sum, p) => sum + p.projectedInterest, 0);

  return {
    totalGoals: goals.length,
    totalSaved,
    totalTarget,
    totalProjected: Math.round(totalProjected * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    overallPercentage: totalTarget > 0
      ? Math.min(100, Math.round((totalSaved / totalTarget) * 100))
      : 0,
    onTrackCount: progressList.filter(p => p.onTrack).length,
    offTrackCount: progressList.filter(p => !p.onTrack).length,
    progressList
  };
}

export function generateSavingsRecommendations(monthlyIncome, monthlyExpenses, currentSavings = 0) {
  const recommendations = [];
  const available = monthlyIncome - monthlyExpenses;

  const recommendedSavings = Math.max(0, monthlyIncome * 0.2);
  recommendations.push({
    rule: '50/30/20 Regel',
    description: '20% des Einkommens sparen',
    amount: Math.round(recommendedSavings),
    percentage: 20
  });

  if (available > 0) {
    const savingsRate = Math.round((available / monthlyIncome) * 100);
    recommendations.push({
      rule: 'Aktueller Überschuss',
      description: `Du hast ${formatCurrency(available)} übrig (${savingsRate}% vom Einkommen)`,
      amount: Math.round(available),
      percentage: savingsRate
    });
  }

  const emergencyFundTarget = monthlyExpenses * 6;
  const emergencyFundProgress = currentSavings / emergencyFundTarget;

  recommendations.push({
    rule: 'Notfallreserve',
    description: `Ziel: ${formatCurrency(emergencyFundTarget)} (6 Monatsgehälter)`,
    amount: Math.round(Math.max(0, emergencyFundTarget - currentSavings)),
    percentage: Math.round(emergencyFundProgress * 100),
    current: currentSavings
  });

  return recommendations;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function getSavingsProgress(savingsGoal, totalSavings) {
  if (!savingsGoal || savingsGoal.target <= 0) {
    return null;
  }

  const percentage = Math.min(100, Math.round((totalSavings / savingsGoal.target) * 100));

  return {
    target: savingsGoal.target,
    current: totalSavings,
    remaining: Math.max(0, savingsGoal.target - totalSavings),
    percentage,
    deadline: savingsGoal.deadline
  };
}
