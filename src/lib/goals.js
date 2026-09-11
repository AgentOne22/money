/**
 * Financial Goals: SMART-Ziele mit Tracking und Projektion
 * SMART = Specific, Measurable, Achievable, Relevant, Time-bound
 */

export const GOAL_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
};

export const GOAL_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const GOAL_CATEGORY = {
  EMERGENCY: 'emergency',
  RETIREMENT: 'retirement',
  VACATION: 'vacation',
  CAR: 'car',
  HOME: 'home',
  EDUCATION: 'education',
  DEBT_REPAYMENT: 'debt_repayment',
  INVESTMENT: 'investment',
  WEDDING: 'wedding',
  GENERAL: 'general'
};

/**
 * Erstellt ein SMART Financial Goal
 */
export function createFinancialGoal({
  id = null,
  name = 'Finanzziel',
  description = '',
  category = GOAL_CATEGORY.GENERAL,
  targetAmount = 0,
  currentAmount = 0,
  startDate = null,
  deadline = null,
  monthlyContribution = 0,
  interestRate = 0,
  compoundFrequency = 'monthly',
  priority = GOAL_PRIORITY.MEDIUM,
  status = GOAL_STATUS.ACTIVE,
  isRecurring = true,
  autoAdjust = true,
  tags = [],
  notes = '',
  linkedTransactions = []
} = {}) {
  return {
    id: id || `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    category,
    targetAmount: Math.max(0, targetAmount),
    currentAmount: Math.max(0, currentAmount),
    startDate: startDate || new Date().toISOString().split('T')[0],
    deadline,
    monthlyContribution: Math.max(0, monthlyContribution),
    interestRate: Math.max(0, interestRate),
    compoundFrequency,
    priority,
    status,
    isRecurring,
    autoAdjust,
    tags,
    notes,
    linkedTransactions,
    milestones: [],
    contributions: [],
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Berechnet den Fortschritt eines Finanzziels
 */
export function calculateGoalProgress(goal) {
  if (!goal || goal.targetAmount <= 0) return null;

  const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  // Zeit-Berechnung
  const startDate = new Date(goal.startDate);
  const now = new Date();
  const deadline = goal.deadline ? new Date(goal.deadline) : null;

  const totalDays = deadline ? Math.max(1, (deadline - startDate) / (1000 * 60 * 60 * 24)) : null;
  const elapsedDays = Math.max(0, (now - startDate) / (1000 * 60 * 60 * 24));
  const remainingDays = deadline ? Math.max(0, (deadline - now) / (1000 * 60 * 60 * 24)) : null;

  const timeElapsed = totalDays ? Math.min(100, Math.round((elapsedDays / totalDays) * 100)) : null;
  const timeRemaining = totalDays ? Math.max(0, 100 - timeElapsed) : null;

  // Monatsberechnung
  const monthsToGoal = calculateMonthsToGoal(
    goal.currentAmount,
    goal.targetAmount,
    goal.monthlyContribution,
    goal.interestRate,
    goal.compoundFrequency
  );

  const projectedCompletionDate = monthsToGoal
    ? new Date(now.getTime() + monthsToGoal * 30.44 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : null;

  // Projektion mit Zinseszins
  let projectedTotal = goal.currentAmount;
  let projectedInterest = 0;
  let deadlineProjection = null;

  if (goal.deadline) {
    const yearsToDeadline = (deadline - now) / (365.25 * 24 * 60 * 60 * 1000);
    if (yearsToDeadline > 0) {
      const compoundResult = calculateCompoundInterest(
        goal.currentAmount,
        goal.interestRate,
        yearsToDeadline,
        goal.compoundFrequency
      );

      if (goal.monthlyContribution > 0) {
        const n = getCompoundFrequency(goal.compoundFrequency);
        const totalMonths = Math.floor(yearsToDeadline * 12);
        const rate = (goal.interestRate / 100) / n;
        const periodsPerMonth = n / 12;
        let accumulated = 0;

        for (let i = 0; i < totalMonths; i++) {
          accumulated = accumulated * (1 + rate * periodsPerMonth) + goal.monthlyContribution;
        }

        deadlineProjection = {
          total: compoundResult.finalAmount + accumulated,
          interest: compoundResult.interest,
          contributions: goal.monthlyContribution * totalMonths
        };
      } else {
        deadlineProjection = {
          total: compoundResult.finalAmount,
          interest: compoundResult.interest,
          contributions: 0
        };
      }

      projectedTotal = deadlineProjection.total;
      projectedInterest = deadlineProjection.interest;
    }
  }

  // Ziel-Trajektorie berechnen
  const trajectory = calculateGoalTrajectory(goal, 12);

  // Empfehlungen
  const recommendations = generateGoalRecommendations(goal, {
    percentage,
    remaining,
    monthsToGoal,
    remainingDays,
    deadlineProjection,
    trajectory
  });

  return {
    id: goal.id,
    name: goal.name,
    category: goal.category,
    priority: goal.priority,
    status: goal.status,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    remaining,
    percentage,
    startDate: goal.startDate,
    deadline: goal.deadline,
    projectedCompletionDate,
    timeElapsed,
    timeRemaining,
    elapsedDays: Math.round(elapsedDays),
    remainingDays: remainingDays !== null ? Math.round(remainingDays) : null,
    monthsToGoal,
    projectedTotal: Math.round(projectedTotal * 100) / 100,
    projectedInterest: Math.round(projectedInterest * 100) / 100,
    deadlineProjection,
    trajectory,
    recommendations,
    onTrack: isGoalOnTrack(goal, {
      projectedTotal,
      percentage,
      timeElapsed,
      remainingDays
    }),
    completed: goal.currentAmount >= goal.targetAmount,
    monthlyNeeded: remainingDays && remainingDays > 0
      ? Math.ceil(remaining / Math.max(1, remainingDays / 30.44))
      : 0
  };
}

/**
 * Berechnet ob das Ziel auf Kurs ist
 */
function isGoalOnTrack(goal, { projectedTotal, percentage, timeElapsed, remainingDays }) {
  if (goal.status !== GOAL_STATUS.ACTIVE) return false;

  // Wenn das projizierte Total das Ziel erreicht
  if (projectedTotal >= goal.targetAmount) return true;

  // Wenn das Ziel abgelaufen ist
  if (remainingDays !== null && remainingDays <= 0) return false;

  // Fortschritts-basiert: Zeit-Fortschritt >= Betrags-Fortschritt
  if (timeElapsed !== null && percentage >= timeElapsed * 0.8) return true;

  return false;
}

/**
 * Berechnet Monate bis zum Ziel
 */
function calculateMonthsToGoal(current, target, monthlyContribution, annualRate, compoundFrequency) {
  if (current >= target) return 0;
  if (monthlyContribution <= 0) return null;

  const n = getCompoundFrequency(compoundFrequency);
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

/**
 * Berechnet Zinseszins
 */
function calculateCompoundInterest(principal, annualRate, years, compoundFrequency = 'monthly') {
  const n = getCompoundFrequency(compoundFrequency);
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

/**
 * Gibt die Zinseszins-Häufigkeit zurück
 */
function getCompoundFrequency(frequency) {
  const frequencies = {
    monthly: 12,
    quarterly: 4,
    semi_annually: 2,
    annually: 1,
    daily: 365
  };
  return frequencies[frequency] || 12;
}

/**
 * Berechnet die Ziel-Trajektorie für Prognose
 */
function calculateGoalTrajectory(goal, months = 12) {
  const trajectory = [];
  const n = getCompoundFrequency(goal.compoundFrequency);
  const rate = (goal.interestRate / 100) / n;
  const periodsPerMonth = n / 12;

  let accumulated = goal.currentAmount;
  const now = new Date();

  for (let i = 1; i <= months; i++) {
    accumulated = accumulated * Math.pow(1 + rate, periodsPerMonth) + goal.monthlyContribution;

    const projectedDate = new Date(now);
    projectedDate.setMonth(projectedDate.getMonth() + i);

    trajectory.push({
      month: i,
      date: projectedDate.toISOString().split('T')[0],
      amount: Math.round(accumulated * 100) / 100,
      contribution: goal.monthlyContribution * i,
      interest: Math.round((accumulated - goal.currentAmount - goal.monthlyContribution * i) * 100) / 100
    });

    if (accumulated >= goal.targetAmount) break;
  }

  return trajectory;
}

/**
 * Generiert Empfehlungen für ein Finanzziel
 */
function generateGoalRecommendations(goal, progress) {
  const recommendations = [];

  // Ziel bereits erreicht
  if (progress.percentage >= 100) {
    recommendations.push({
      type: 'success',
      title: 'Ziel erreicht!',
      message: `Herzlichen Glückwunsch! Du hast dein Ziel "${goal.name}" erreicht.`
    });
    return recommendations;
  }

  // Überfällig
  if (progress.remainingDays !== null && progress.remainingDays <= 0) {
    recommendations.push({
      type: 'danger',
      title: 'Ziel überfällig',
      message: `Dein Ziel "${goal.name}" war bis zum ${goal.deadline} geplant. Passe deinen Sparplan an.`
    });
  }

  // Nicht auf Kurs
  if (!progress.onTrack && progress.timeElapsed !== null) {
    const neededIncrease = Math.ceil(progress.remaining / Math.max(1, progress.remainingDays / 30.44));
    recommendations.push({
      type: 'warning',
      title: 'Nicht auf Kurs',
      message: `Du musst monatlich ${formatCurrency(neededIncrease)} mehr sparen, um das Ziel rechtzeitig zu erreichen.`
    });
  }

  // Niedrige Konfidenz
  if (progress.monthsToGoal === null && goal.monthlyContribution <= 0) {
    recommendations.push({
      type: 'info',
      title: 'Monatliche Einzahlung empfohlen',
      message: 'Regelmäßige Einzahlungen helfen, dein Ziel zuverlässig zu erreichen.'
    });
  }

  // Zinsen nutzen
  if (goal.interestRate > 0 && progress.projectedInterest > 0) {
    recommendations.push({
      type: 'info',
      title: 'Zinsen nutzen',
      message: `Mit ${goal.interestRate}% Zinsen verdienst du ${formatCurrency(progress.projectedInterest)} zusätzlich.`
    });
  }

  return recommendations;
}

/**
 * Fügt eine Einzahlung zu einem Finanzziel hinzu
 */
export function addGoalContribution(goal, amount, date = null, note = '') {
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

  // History-Eintrag
  goal.history.push({
    type: 'contribution',
    date: contribution.date,
    amount: contribution.amount,
    balance: goal.currentAmount
  });

  // Prüfe ob Ziel erreicht
  if (goal.currentAmount >= goal.targetAmount && goal.status === GOAL_STATUS.ACTIVE) {
    goal.status = GOAL_STATUS.COMPLETED;
    goal.history.push({
      type: 'completed',
      date: contribution.date,
      balance: goal.currentAmount
    });
  }

  return {
    contribution,
    newBalance: goal.currentAmount,
    goalCompleted: goal.status === GOAL_STATUS.COMPLETED
  };
}

/**
 * Entfernt eine Einzahlung
 */
export function removeGoalContribution(goal, contributionId) {
  const index = goal.contributions.findIndex(c => c.id === contributionId);
  if (index === -1) return false;

  const contribution = goal.contributions[index];
  goal.currentAmount -= contribution.amount;
  goal.contributions.splice(index, 1);
  goal.updatedAt = new Date().toISOString();

  // Status zurücksetzen falls nicht mehr erreicht
  if (goal.currentAmount < goal.targetAmount && goal.status === GOAL_STATUS.COMPLETED) {
    goal.status = GOAL_STATUS.ACTIVE;
  }

  return true;
}

/**
 * Erstellt Meilensteine für ein Finanzziel
 */
export function createMilestones(goal) {
  const milestones = [];
  const target = goal.targetAmount;
  const steps = [10, 25, 50, 75, 90, 100];

  for (const step of steps) {
    milestones.push({
      id: `milestone_${step}`,
      percentage: step,
      amount: Math.round(target * step) / 100,
      reached: goal.currentAmount >= (target * step) / 100,
      reachedAt: goal.currentAmount >= (target * step) / 100 ? new Date().toISOString() : null
    });
  }

  return milestones;
}

/**
 * Berechnet Zusammenfassung aller Finanzziele
 */
export function getGoalsSummary(goals) {
  const progressList = goals
    .map(calculateGoalProgress)
    .filter(Boolean);

  const totalSaved = progressList.reduce((sum, p) => sum + p.currentAmount, 0);
  const totalTarget = progressList.reduce((sum, p) => sum + p.targetAmount, 0);
  const totalProjected = progressList.reduce((sum, p) => sum + p.projectedTotal, 0);
  const totalInterest = progressList.reduce((sum, p) => sum + p.projectedInterest, 0);

  const activeGoals = progressList.filter(p => p.status === GOAL_STATUS.ACTIVE);
  const completedGoals = progressList.filter(p => p.completed);
  const overdueGoals = progressList.filter(p => p.status === GOAL_STATUS.OVERDUE);

  return {
    totalGoals: goals.length,
    activeGoals: activeGoals.length,
    completedGoals: completedGoals.length,
    overdueGoals: overdueGoals.length,
    totalSaved: Math.round(totalSaved * 100) / 100,
    totalTarget: Math.round(totalTarget * 100) / 100,
    totalProjected: Math.round(totalProjected * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    overallPercentage: totalTarget > 0
      ? Math.min(100, Math.round((totalSaved / totalTarget) * 100))
      : 0,
    onTrackCount: progressList.filter(p => p.onTrack).length,
    offTrackCount: progressList.filter(p => !p.onTrack && p.status === GOAL_STATUS.ACTIVE).length,
    progressList: progressList.sort((a, b) => {
      // Sort by priority first, then by percentage
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aPrio = priorityOrder[a.priority] || 2;
      const bPrio = priorityOrder[b.priority] || 2;
      if (aPrio !== bPrio) return aPrio - bPrio;
      return b.percentage - a.percentage;
    })
  };
}

/**
 * Generiert Spar-Empfehlungen basierend auf Einkommen und Ausgaben
 */
export function generateSavingsRecommendations(monthlyIncome, monthlyExpenses, currentSavings = 0, goals = []) {
  const recommendations = [];
  const available = monthlyIncome - monthlyExpenses;

  // 50/30/20 Regel
  const recommendedSavings = Math.max(0, monthlyIncome * 0.2);
  recommendations.push({
    rule: '50/30/20 Regel',
    description: '20% des Einkommens sparen',
    amount: Math.round(recommendedSavings),
    percentage: 20,
    type: 'standard'
  });

  // Aktueller Überschuss
  if (available > 0) {
    const savingsRate = Math.round((available / monthlyIncome) * 100);
    recommendations.push({
      rule: 'Aktueller Überschuss',
      description: `Du hast ${formatCurrency(available)} übrig (${savingsRate}% vom Einkommen)`,
      amount: Math.round(available),
      percentage: savingsRate,
      type: 'current'
    });
  }

  // Notfallreserve
  const emergencyFundTarget = monthlyExpenses * 6;
  const emergencyFundProgress = currentSavings / emergencyFundTarget;

  recommendations.push({
    rule: 'Notfallreserve',
    description: `Ziel: ${formatCurrency(emergencyFundTarget)} (6 Monatsgehälter)`,
    amount: Math.round(Math.max(0, emergencyFundTarget - currentSavings)),
    percentage: Math.round(emergencyFundProgress * 100),
    current: currentSavings,
    type: 'emergency'
  });

  // Ziele-basierte Empfehlungen
  if (goals.length > 0) {
    const activeGoals = goals.filter(g => g.status === GOAL_STATUS.ACTIVE);
    const totalMonthlyNeeded = activeGoals.reduce((sum, g) => {
      const progress = calculateGoalProgress(g);
      return sum + (progress?.monthlyNeeded || 0);
    }, 0);

    if (totalMonthlyNeeded > 0) {
      recommendations.push({
        rule: 'Ziel-basierter Sparplan',
        description: `Für alle aktiven Ziele benötigst du ${formatCurrency(totalMonthlyNeeded)}/Monat`,
        amount: Math.round(totalMonthlyNeeded),
        percentage: Math.round((totalMonthlyNeeded / monthlyIncome) * 100),
        type: 'goals'
      });
    }
  }

  return recommendations;
}

/**
 * Berechnet die Projektion für mehrere Ziele
 */
export function projectGoalsCompletion(goals) {
  const projections = [];

  for (const goal of goals) {
    if (goal.status !== GOAL_STATUS.ACTIVE) continue;

    const progress = calculateGoalProgress(goal);
    if (!progress) continue;

    projections.push({
      id: goal.id,
      name: goal.name,
      category: goal.category,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      projectedCompletionDate: progress.projectedCompletionDate,
      monthsToGoal: progress.monthsToGoal,
      onTrack: progress.onTrack,
      projectedTotal: progress.projectedTotal,
      projectedInterest: progress.projectedInterest
    });
  }

  // Sort by projected completion date
  projections.sort((a, b) => {
    if (!a.projectedCompletionDate) return 1;
    if (!b.projectedCompletionDate) return -1;
    return a.projectedCompletionDate.localeCompare(b.projectedCompletionDate);
  });

  return projections;
}

/**
 * Hilfsfunktionen
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}
