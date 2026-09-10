/**
 * Budget & Ziel Verwaltung
 */

/**
 * Berechnet den Gesamtbetrag pro Kategorie für einen Monat
 */
export function getCategorySpending(transactions, year, month) {
  const spending = {};

  for (const t of transactions) {
    if (!t.date) continue;
    const d = new Date(t.date);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
    if (t.amount >= 0) continue; // Only expenses

    const cat = t.category || 'other';
    spending[cat] = (spending[cat] || 0) + Math.abs(t.amount);
  }

  return spending;
}

/**
 * Berechnet den Budget-Fortschritt pro Kategorie
 */
export function getBudgetProgress(transactions, budgets, year, month) {
  const spending = getCategorySpending(transactions, year, month);

  return Object.entries(budgets).map(([category, limit]) => {
    const spent = spending[category] || 0;
    const percentage = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;

    return {
      category,
      limit,
      spent,
      remaining: limit - spent,
      percentage,
      status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok'
    };
  });
}

/**
 * Berechnet den monatlichen Saldo (Einnahmen - Ausgaben)
 */
export function getMonthlyBalance(transactions, year, month) {
  let income = 0;
  let expenses = 0;

  for (const t of transactions) {
    if (!t.date) continue;
    const d = new Date(t.date);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;

    if (t.amount >= 0) {
      income += t.amount;
    } else {
      expenses += Math.abs(t.amount);
    }
  }

  return { income, expenses, balance: income - expenses };
}

/**
 * Berechnet Sparziel-Fortschritt
 */
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

/**
 * Gruppiert Transaktionen nach Monat
 */
export function getMonthlyOverview(transactions) {
  const months = {};

  for (const t of transactions) {
    if (!t.date) continue;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!months[key]) {
      months[key] = { income: 0, expenses: 0, balance: 0 };
    }

    if (t.amount >= 0) {
      months[key].income += t.amount;
    } else {
      months[key].expenses += Math.abs(t.amount);
    }

    months[key].balance = months[key].income - months[key].expenses;
  }

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}
