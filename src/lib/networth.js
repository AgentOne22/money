/**
 * Net Worth Dashboard: Gesamtvermögen über alle Konten
 * Kombiniert: Bankkonten, Investments, Bargeld, Sonstiges
 */

/**
 * Erstellt ein Konto für die Net Worth Berechnung
 */
export function createAccount({
  id = null,
  name = '',
  type = 'checking',
  balance = 0,
  currency = 'EUR',
  institution = '',
  isLiquid = true,
  notes = ''
} = {}) {
  return {
    id: id || `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    type, // 'checking' | 'savings' | 'investment' | 'cash' | 'crypto' | 'other'
    balance: Math.round(balance * 100) / 100,
    currency,
    institution,
    isLiquid,
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Berechnet das Gesamtvermögen (Net Worth)
 */
export function calculateNetWorth(accounts, investments = [], exchangeRates = null) {
  let totalValue = 0;
  let liquidValue = 0;
  let illiquidValue = 0;
  const byType = {};
  const byCurrency = {};

  // Konten verarbeiten
  for (const account of accounts) {
    let valueInEur = account.balance;

    // Währungsumrechnung falls nötig
    if (account.currency !== 'EUR' && exchangeRates) {
      valueInEur = convertAmount(account.balance, account.currency, 'EUR', exchangeRates);
    }

    totalValue += valueInEur;

    if (account.isLiquid) {
      liquidValue += valueInEur;
    } else {
      illiquidValue += valueInEur;
    }

    // Nach Typ gruppieren
    const typeLabel = getAccountTypeLabel(account.type);
    if (!byType[typeLabel]) {
      byType[typeLabel] = { value: 0, count: 0 };
    }
    byType[typeLabel].value += valueInEur;
    byType[typeLabel].count++;

    // Nach Währung gruppieren
    if (!byCurrency[account.currency]) {
      byCurrency[account.currency] = 0;
    }
    byCurrency[account.currency] += account.balance;
  }

  // Investments verarbeiten
  let totalInvestmentValue = 0;
  for (const inv of investments) {
    const value = inv.currentValue || 0;
    totalInvestmentValue += value;
  }

  totalValue += totalInvestmentValue;

  if (totalInvestmentValue > 0) {
    if (!byType['Investments']) {
      byType['Investments'] = { value: 0, count: 0 };
    }
    byType['Investments'].value += totalInvestmentValue;
    byType['Investments'].count += investments.length;
  }

  return {
    totalValue: Math.round(totalValue * 100) / 100,
    liquidValue: Math.round(liquidValue * 100) / 100,
    illiquidValue: Math.round(illiquidValue * 100) / 100,
    investmentValue: Math.round(totalInvestmentValue * 100) / 100,
    accountCount: accounts.length,
    investmentCount: investments.length,
    byType: Object.entries(byType).map(([type, data]) => ({
      type,
      value: Math.round(data.value * 100) / 100,
      count: data.count,
      percent: totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0
    })),
    byCurrency: Object.entries(byCurrency).map(([currency, amount]) => ({
      currency,
      amount: Math.round(amount * 100) / 100
    })),
    assetAllocation: calculateAssetAllocation(accounts, investments, totalValue)
  };
}

/**
 * Berechnet die Vermögensverteilung
 */
function calculateAssetAllocation(accounts, investments, totalValue) {
  if (totalValue === 0) return [];

  const allocation = [];

  // Flüssige Mittel
  const cashAccounts = accounts.filter(a => a.type === 'cash');
  const cashValue = cashAccounts.reduce((sum, a) => sum + a.balance, 0);
  if (cashValue > 0) {
    allocation.push({
      category: 'Bargeld',
      value: cashValue,
      percent: (cashValue / totalValue) * 100,
      color: '#22c55e'
    });
  }

  // Girokonten
  const checkingAccounts = accounts.filter(a => a.type === 'checking');
  const checkingValue = checkingAccounts.reduce((sum, a) => sum + a.balance, 0);
  if (checkingValue > 0) {
    allocation.push({
      category: 'Girokonto',
      value: checkingValue,
      percent: (checkingValue / totalValue) * 100,
      color: '#3b82f6'
    });
  }

  // Sparkonten
  const savingsAccounts = accounts.filter(a => a.type === 'savings');
  const savingsValue = savingsAccounts.reduce((sum, a) => sum + a.balance, 0);
  if (savingsValue > 0) {
    allocation.push({
      category: 'Sparkonto',
      value: savingsValue,
      percent: (savingsValue / totalValue) * 100,
      color: '#8b5cf6'
    });
  }

  // Krypto-Investments
  const cryptoInvestments = investments.filter(i => i.type === 'crypto');
  const cryptoValue = cryptoInvestments.reduce((sum, i) => sum + (i.currentValue || 0), 0);
  if (cryptoValue > 0) {
    allocation.push({
      category: 'Krypto',
      value: cryptoValue,
      percent: (cryptoValue / totalValue) * 100,
      color: '#f59e0b'
    });
  }

  // Aktien-Investments
  const stockInvestments = investments.filter(i => i.type === 'stock');
  const stockValue = stockInvestments.reduce((sum, i) => sum + (i.currentValue || 0), 0);
  if (stockValue > 0) {
    allocation.push({
      category: 'Aktien',
      value: stockValue,
      percent: (stockValue / totalValue) * 100,
      color: '#ec4899'
    });
  }

  // Sonstige
  const otherValue = totalValue - cashValue - checkingValue - savingsValue - cryptoValue - stockValue;
  if (otherValue > 0) {
    allocation.push({
      category: 'Sonstiges',
      value: otherValue,
      percent: (otherValue / totalValue) * 100,
      color: '#6b7280'
    });
  }

  return allocation.map(a => ({
    ...a,
    value: Math.round(a.value * 100) / 100,
    percent: Math.round(a.percent * 100) / 100
  }));
}

/**
 * Berechnet Net Worth Trend über Zeit
 */
export function calculateNetWorthTrend(monthlySnapshots) {
  if (!monthlySnapshots || monthlySnapshots.length === 0) {
    return [];
  }

  return monthlySnapshots.map((snapshot, index) => {
    const prevValue = index > 0 ? monthlySnapshots[index - 1].value : snapshot.value;
    const change = snapshot.value - prevValue;
    const changePercent = prevValue > 0 ? (change / prevValue) * 100 : 0;

    return {
      month: snapshot.month,
      value: Math.round(snapshot.value * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100
    };
  });
}

/**
 * Generiert monatliche Net Worth Snapshots aus Transaktionen
 */
export function generateMonthlySnapshots(transactions, investments, months = 12) {
  const snapshots = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Bereine Transaktionen bis zu diesem Monat
    const monthTransactions = transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getFullYear() < year || (d.getFullYear() === year && d.getMonth() + 1 <= month);
    });

    // Berechne Kontostand
    let balance = 0;
    for (const t of monthTransactions) {
      balance += t.amount;
    }

    // Investments hinzufügen (vereinfacht: aktueller Wert)
    let investmentValue = 0;
    for (const inv of investments) {
      if (inv.buyDate) {
        const buyDate = new Date(inv.buyDate);
        if (buyDate.getFullYear() < year || (buyDate.getFullYear() === year && buyDate.getMonth() + 1 <= month)) {
          investmentValue += inv.currentValue || (inv.amount * inv.buyPrice);
        }
      }
    }

    const totalValue = balance + investmentValue;

    snapshots.push({
      month: `${year}-${String(month).padStart(2, '0')}`,
      value: Math.round(totalValue * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      investments: Math.round(investmentValue * 100) / 100
    });
  }

  return snapshots;
}

/**
 * Hilfsfunktion: Währungsumrechnung
 */
function convertAmount(amount, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) return amount;
  if (!rates || !rates.rates) return amount;

  // In Basiswährung umrechnen
  let amountInBase = amount;
  if (fromCurrency !== 'EUR') {
    const fromRate = rates.rates[fromCurrency];
    if (fromRate) {
      amountInBase = amount / fromRate;
    }
  }

  // In Zielwährung umrechnen
  if (toCurrency === 'EUR') return Math.round(amountInBase * 100) / 100;

  const toRate = rates.rates[toCurrency];
  if (!toRate) return Math.round(amountInBase * 100) / 100;

  return Math.round(amountInBase * toRate * 100) / 100;
}

/**
 * Hilfsfunktion: Kontotyp-Label
 */
function getAccountTypeLabel(type) {
  const labels = {
    checking: 'Girokonto',
    savings: 'Sparkonto',
    investment: 'Depot',
    cash: 'Bargeld',
    crypto: 'Krypto-Wallet',
    other: 'Sonstiges'
  };
  return labels[type] || 'Sonstiges';
}

/**
 * Formatiert Net Worth Zusammenfassung
 */
export function formatNetWorthSummary(netWorth) {
  const formatEur = (amount) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return {
    total: formatEur(netWorth.totalValue),
    liquid: formatEur(netWorth.liquidValue),
    illiquid: formatEur(netWorth.illiquidValue),
    investments: formatEur(netWorth.investmentValue),
    accountCount: netWorth.accountCount,
    investmentCount: netWorth.investmentCount
  };
}
