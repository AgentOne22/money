/**
 * Recurring Transactions Detection
 * Erkennt automatisch wiederkehrende Zahlungen (Miete, Abos, Gehalt)
 * Algorithmus: Pattern-Matching nach Beschreibung + Betrag + Intervall
 */

export const RECURRING_TYPES = {
  RENT: 'rent',
  SUBSCRIPTION: 'subscription',
  SALARY: 'salary',
  UTILITIES: 'utilities',
  INSURANCE: 'insurance',
  SAVINGS: 'savings',
  LOAN: 'loan',
  OTHER: 'other'
};

export const RECURRING_INTERVALS = {
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
  UNKNOWN: 'unknown'
};

/**
 * Erkennt wiederkehrende Transaktionen aus einer Liste
 * @param {Array} transactions - Transaktionen mit date, description, amount
 * @param {Object} options - Konfiguration
 * @returns {Array} Erkannte wiederkehrende Transaktionen
 */
export function detectRecurringTransactions(transactions, options = {}) {
  const minOccurrences = options.minOccurrences || 2;
  const amountTolerance = options.amountTolerance || 0.02; // 2% Toleranz
  const descriptionSimilarity = options.descriptionSimilarity || 0.8;

  // Gruppiere nach normalisierter Beschreibung
  const groups = groupByDescription(transactions, descriptionSimilarity);

  const recurring = [];

  for (const [key, group] of Object.entries(groups)) {
    if (group.length < minOccurrences) continue;

    // Prüfe ob Beträge ähnlich sind
    const amounts = group.map(t => t.amount);
    if (!areAmountsSimilar(amounts, amountTolerance)) continue;

    // Berechne Intervall
    const intervals = calculateIntervals(group);
    const dominantInterval = getDominantInterval(intervals);

    if (dominantInterval === RECURRING_INTERVALS.UNKNOWN) continue;

    // Bestimme Typ
    const type = determineRecurringType(group[0]);

    recurring.push({
      id: `recurring-${key.replace(/\s/g, '-')}-${Date.now()}`,
      description: group[0].description,
      normalizedDescription: key,
      amount: averageAmount(amounts),
      type,
      interval: dominantInterval,
      occurrences: group.length,
      firstDate: group[0].date,
      lastDate: group[group.length - 1].date,
      nextPredictedDate: predictNextDate(group[group.length - 1].date, dominantInterval),
      transactions: group.map(t => ({
        date: t.date,
        amount: t.amount,
        description: t.description
      })),
      confidence: calculateConfidence(group.length, dominantInterval, intervals),
      category: group[0].category || type
    });
  }

  return recurring.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Gruppiert Transaktionen nach normalisierter Beschreibung
 */
function groupByDescription(transactions, similarity) {
  const groups = {};

  for (const tx of transactions) {
    const normalized = normalizeDescription(tx.description);
    let found = false;

    for (const key of Object.keys(groups)) {
      if (calculateSimilarity(normalized, key) >= similarity) {
        groups[key].push(tx);
        found = true;
        break;
      }
    }

    if (!found) {
      if (!groups[normalized]) {
        groups[normalized] = [];
      }
      groups[normalized].push(tx);
    }
  }

  return groups;
}

/**
 * Normalisiert eine Transaktionsbeschreibung
 */
export function normalizeDescription(description) {
  if (!description) return '';

  return description
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Entferne Sonderzeichen
    .replace(/\d+/g, '') // Entferne Zahlen
    .replace(/\s+/g, ' ') // Normalisiere Leerzeichen
    .trim();
}

/**
 * Berechnet Ähnlichkeit zwischen zwei Strings (Jaccard-Index)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  const set1 = new Set(str1.split(' '));
  const set2 = new Set(str2.split(' '));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Prüft ob Beträge ähnlich sind (innerhalb Toleranz)
 */
function areAmountsSimilar(amounts, tolerance) {
  if (amounts.length < 2) return true;

  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const threshold = Math.abs(avg) * tolerance;

  return amounts.every(amount => Math.abs(amount - avg) <= threshold);
}

/**
 * Berechnet Intervalle zwischen Transaktionsdaten
 */
function calculateIntervals(transactions) {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const intervals = [];

  for (let i = 1; i < sorted.length; i++) {
    const days = daysBetween(sorted[i - 1].date, sorted[i].date);
    intervals.push(days);
  }

  return intervals;
}

/**
 * Berechnet Tage zwischen zwei Daten
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Bestimmt das häufigste Intervall
 */
function getDominantInterval(intervals) {
  if (intervals.length === 0) return RECURRING_INTERVALS.UNKNOWN;

  const counts = {};
  for (const interval of intervals) {
    const type = classifyInterval(interval);
    counts[type] = (counts[type] || 0) + 1;
  }

  let maxCount = 0;
  let dominant = RECURRING_INTERVALS.UNKNOWN;

  for (const [type, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = type;
    }
  }

  return dominant;
}

/**
 * Klassifiziert ein Intervall in Tage
 */
function classifyInterval(days) {
  if (days >= 6 && days <= 8) return RECURRING_INTERVALS.WEEKLY;
  if (days >= 13 && days <= 16) return RECURRING_INTERVALS.BIWEEKLY;
  if (days >= 27 && days <= 32) return RECURRING_INTERVALS.MONTHLY;
  if (days >= 85 && days <= 95) return RECURRING_INTERVALS.QUARTERLY;
  if (days >= 350 && days <= 380) return RECURRING_INTERVALS.YEARLY;
  return RECURRING_INTERVALS.UNKNOWN;
}

/**
 * Bestimmt den Typ einer wiederkehrenden Transaktion
 */
function determineRecurringType(transaction) {
  const desc = (transaction.description || '').toLowerCase();
  const category = (transaction.category || '').toLowerCase();

  if (desc.includes('miete') || desc.includes('rent') || category === 'rent') {
    return RECURRING_TYPES.RENT;
  }
  if (desc.includes('gehalt') || desc.includes('lohn') || desc.includes('salary') || category === 'income') {
    return RECURRING_TYPES.SALARY;
  }
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('abo') || category === 'subscriptions') {
    return RECURRING_TYPES.SUBSCRIPTION;
  }
  if (desc.includes('versicherung') || desc.includes('insurance')) {
    return RECURRING_TYPES.INSURANCE;
  }
  if (desc.includes('strom') || desc.includes('gas') || desc.includes('wasser') || category === 'utilities') {
    return RECURRING_TYPES.UTILITIES;
  }
  if (desc.includes('sparbuch') || desc.includes('sparplan') || desc.includes('einzahlung') || category === 'savings') {
    return RECURRING_TYPES.SAVINGS;
  }
  if (desc.includes('kredit') || desc.includes('rate') || desc.includes('loan')) {
    return RECURRING_TYPES.LOAN;
  }

  return RECURRING_TYPES.OTHER;
}

/**
 * Berechnet Durchschnittsbetrag
 */
function averageAmount(amounts) {
  if (amounts.length === 0) return 0;
  return amounts.reduce((a, b) => a + b, 0) / amounts.length;
}

/**
 * Sagt das nächste Datum vorher
 */
function predictNextDate(lastDate, interval) {
  const date = new Date(lastDate);

  switch (interval) {
    case RECURRING_INTERVALS.WEEKLY:
      date.setDate(date.getDate() + 7);
      break;
    case RECURRING_INTERVALS.BIWEEKLY:
      date.setDate(date.getDate() + 14);
      break;
    case RECURRING_INTERVALS.MONTHLY:
      date.setMonth(date.getMonth() + 1);
      break;
    case RECURRING_INTERVALS.QUARTERLY:
      date.setMonth(date.getMonth() + 3);
      break;
    case RECURRING_INTERVALS.YEARLY:
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().split('T')[0];
}

/**
 * Berechnet Konfidenz der Erkennung (0-1)
 */
function calculateConfidence(occurrences, interval, intervals) {
  let confidence = 0;

  // Mehr Vorkommen = höhere Konfidenz
  confidence += Math.min(occurrences / 6, 1) * 0.4;

  // Klares Intervall = höhere Konfidenz
  if (interval !== RECURRING_INTERVALS.UNKNOWN) {
    confidence += 0.3;
  }

  // Konsistente Intervalle = höhere Konfidenz
  if (intervals.length > 1) {
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 1 - (stdDev / avg));
    confidence += consistency * 0.3;
  }

  return Math.min(confidence, 1);
}

/**
 * Berechnet monatliche Kosten für wiederkehrende Transaktionen
 */
export function calculateMonthlyRecurringCosts(recurringTransactions) {
  let total = 0;

  for (const rt of recurringTransactions) {
    const monthlyAmount = normalizeToMonthly(rt.amount, rt.interval);
    total += monthlyAmount;
  }

  return total;
}

/**
 * Normalisiert Betrag auf monatliche Basis
 */
function normalizeToMonthly(amount, interval) {
  const absAmount = Math.abs(amount);

  switch (interval) {
    case RECURRING_INTERVALS.WEEKLY:
      return absAmount * 4.33;
    case RECURRING_INTERVALS.BIWEEKLY:
      return absAmount * 2.17;
    case RECURRING_INTERVALS.MONTHLY:
      return absAmount;
    case RECURRING_INTERVALS.QUARTERLY:
      return absAmount / 3;
    case RECURRING_INTERVALS.YEARLY:
      return absAmount / 12;
    default:
      return absAmount;
  }
}

/**
 * Erstellt eine Zusammenfassung der wiederkehrenden Transaktionen
 */
export function getRecurringSummary(recurringTransactions) {
  const summary = {
    total: recurringTransactions.length,
    monthlyCosts: calculateMonthlyRecurringCosts(recurringTransactions),
    byType: {},
    byInterval: {},
    upcoming: []
  };

  for (const rt of recurringTransactions) {
    // Nach Typ gruppieren
    if (!summary.byType[rt.type]) {
      summary.byType[rt.type] = { count: 0, monthlyAmount: 0 };
    }
    summary.byType[rt.type].count++;
    summary.byType[rt.type].monthlyAmount += normalizeToMonthly(rt.amount, rt.interval);

    // Nach Intervall gruppieren
    if (!summary.byInterval[rt.interval]) {
      summary.byInterval[rt.interval] = { count: 0, monthlyAmount: 0 };
    }
    summary.byInterval[rt.interval].count++;
    summary.byInterval[rt.interval].monthlyAmount += normalizeToMonthly(rt.amount, rt.interval);

    // Kommende Zahlungen (innerhalb 30 Tage)
    const daysUntilNext = daysBetween(new Date().toISOString().split('T')[0], rt.nextPredictedDate);
    if (daysUntilNext >= 0 && daysUntilNext <= 30) {
      summary.upcoming.push({
        description: rt.description,
        amount: rt.amount,
        predictedDate: rt.nextPredictedDate,
        daysUntil: daysUntilNext
      });
    }
  }

  summary.upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

  return summary;
}
