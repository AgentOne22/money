/**
 * Tax Export: Schweizer Steuer-Export (MWST, Einkommensteuer)
 * Formate: CSV (ELSTA), PDF-HTML, JSON
 */

// Swiss VAT rates (Mehrwertsteuer)
export const SWISS_VAT_RATES = {
  standard: 8.1,    // Normaltarif (ab 2024)
  reduced: 2.5,     // Reduzierter Tarif
  accommodation: 3.7, // Beherbergungstarif
  zero: 0           // Befreit
};

// Swiss Income Tax brackets 2024 (federal, single person, simplified)
export const SWISS_FEDERAL_TAX_BRACKETS = [
  { min: 0, max: 14500, rate: 0 },
  { min: 14500, max: 18300, rate: 0.0077 },
  { min: 18300, max: 22100, rate: 0.0088 },
  { min: 22100, max: 25900, rate: 0.0264 },
  { min: 25900, max: 30900, rate: 0.0297 },
  { min: 30900, max: 35800, rate: 0.0594 },
  { min: 35800, max: 40800, rate: 0.066 },
  { min: 40800, max: 48300, rate: 0.088 },
  { min: 48300, max: 58300, rate: 0.11 },
  { min: 58300, max: 73300, rate: 0.132 },
  { min: 73300, max: 78300, rate: 0.176 },
  { min: 78300, max: 103300, rate: 0.22 },
  { min: 103300, max: 133300, rate: 0.253 },
  { min: 133300, max: 173300, rate: 0.303 },
  { min: 173300, max: 835200, rate: 0.33 },
  { min: 835200, max: Infinity, rate: 0.35 }
];

// Swiss income tax deductions (federal, single person, 2024 simplified)
export const SWISS_FEDERAL_DEDUCTIONS = {
  single: 0,
  married: 0,
  children: 0,
  professionalExpenses: 0,
  insurancePremiums: 0,
  interestOnDebt: 0,
  pillar3a: 7056 // 2024 max for employed with pension fund
};

/**
 * MWST-Bericht (VAT Report) für ein Quartal generieren
 */
export function generateVATReport(transactions, period, options = {}) {
  const { year, quarter } = period;
  const vatRate = options.vatRate || SWISS_VAT_RATES.standard;
  const number = options.number || 0;
  const reportingMethod = options.reportingMethod || 'effective'; // 'effective' or 'net-tax'

  // Filter transactions for the period
  const periodTransactions = filterByQuarter(transactions, year, quarter);

  const incoming = periodTransactions.filter(t => t.amount > 0);
  const outgoing = periodTransactions.filter(t => t.amount < 0);

  // Calculate totals
  const totalIncome = incoming.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = Math.abs(outgoing.reduce((sum, t) => sum + t.amount, 0));
  const totalTurnover = totalIncome;

  // VAT calculations (effective method: VAT on total turnover)
  const vatOnTurnover = reportingMethod === 'effective'
    ? totalTurnover * (vatRate / (100 + vatRate))
    : totalTurnover * (vatRate / 100);

  const vatOnExpenses = reportingMethod === 'effective'
    ? totalExpenses * (vatRate / (100 + vatRate))
    : totalExpenses * (vatRate / 100);

  // Round to 2 decimal places
  const roundedVatOnTurnover = Math.round(vatOnTurnover * 100) / 100;
  const roundedVatOnExpenses = Math.round(vatOnExpenses * 100) / 100;
  const netVAT = roundedVatOnTurnover - roundedVatOnExpenses;

  // Category breakdown
  const byCategory = {};
  for (const t of periodTransactions) {
    const cat = t.category || 'other';
    if (!byCategory[cat]) {
      byCategory[cat] = { count: 0, total: 0, vat: 0 };
    }
    byCategory[cat].count++;
    byCategory[cat].total += t.amount;
    byCategory[cat].vat += t.amount > 0
      ? t.amount * (vatRate / (100 + vatRate))
      : Math.abs(t.amount) * (vatRate / (100 + vatRate)) * -1;
  }

  return {
    type: 'VAT',
    year,
    quarter,
    periodLabel: `Q${quarter} ${year}`,
    vatRate,
    reportingMethod,
    turnover: {
      total: Math.round(totalTurnover * 100) / 100,
      taxable: Math.round(totalTurnover * 100) / 100
    },
    // Use rounded values
    vat: {
      onTurnover: roundedVatOnTurnover,
      onExpenses: roundedVatOnExpenses,
      netPayable: Math.round(netVAT * 100) / 100
    },
    transactions: {
      incoming: incoming.length,
      outgoing: outgoing.length,
      total: periodTransactions.length
    },
    byCategory,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Einkommensteuer-Bericht für ein Jahr generieren
 */
export function generateIncomeTaxReport(transactions, year, options = {}) {
  const { maritalStatus = 'single', childrenCount = 0, pillar3aContribution = 0, deductions = {} } = options;

  // Filter transactions for the year
  const yearTransactions = filterByYear(transactions, year);

  const income = yearTransactions.filter(t => t.amount > 0);
  const expenses = yearTransactions.filter(t => t.amount < 0);

  // Calculate gross income
  const grossIncome = income.reduce((sum, t) => sum + t.amount, 0);

  // Calculate deductions
  const totalDeductions = calculateDeductions({
    maritalStatus,
    childrenCount,
    pillar3aContribution,
    deductions
  });

  // Taxable income
  const taxableIncome = Math.max(0, grossIncome - totalDeductions);

  // Calculate federal tax (simplified, using brackets)
  const federalTax = calculateFederalTax(taxableIncome);

  // Calculate total tax burden (federal + cantonal approximation)
  const cantonalTaxRate = options.cantonalTaxRate || estimateCantonalTaxRate(options.canton || 'ZH', taxableIncome);
  const cantonalTax = taxableIncome * cantonalTaxRate;
  const totalTax = federalTax + cantonalTax;

  // Effective tax rate
  const effectiveRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;

  // Income breakdown by category
  const byCategory = {};
  for (const t of income) {
    const cat = t.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = { count: 0, total: 0 };
    byCategory[cat].count++;
    byCategory[cat].total += t.amount;
  }

  // Monthly breakdown
  const monthlyIncome = {};
  const monthlyExpenses = {};
  for (const t of yearTransactions) {
    const month = t.date.substring(0, 7);
    if (t.amount > 0) {
      monthlyIncome[month] = (monthlyIncome[month] || 0) + t.amount;
    } else {
      monthlyExpenses[month] = (monthlyExpenses[month] || 0) + Math.abs(t.amount);
    }
  }

  return {
    type: 'INCOME_TAX',
    year,
    periodLabel: `Steuerjahr ${year}`,
    taxpayer: {
      maritalStatus,
      childrenCount,
      canton: options.canton || 'ZH'
    },
    income: {
      gross: Math.round(grossIncome * 100) / 100,
      byCategory,
      monthly: monthlyIncome
    },
    deductions: {
      professionalExpenses: deductions.professionalExpenses || Math.min(grossIncome * 0.05, 4000),
      insurancePremiums: deductions.insurancePremiums || 0,
      pillar3a: Math.min(pillar3aContribution, 7056),
      interestOnDebt: deductions.interestOnDebt || 0,
      childDeduction: childrenCount * 0 || 0,
      maritalStatusDeduction: maritalStatus === 'married' ? 0 : 0,
      other: deductions.other || 0,
      total: Math.round(totalDeductions * 100) / 100
    },
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    tax: {
      federal: Math.round(federalTax * 100) / 100,
      cantonal: Math.round(cantonalTax * 100) / 100,
      churchTax: 0, // Optional
      total: Math.round(totalTax * 100) / 100,
      effectiveRate: Math.round(effectiveRate * 100) / 100
    },
    monthlyExpenses,
    transactions: {
      income: income.length,
      expenses: expenses.length,
      total: yearTransactions.length
    },
    generatedAt: new Date().toISOString()
  };
}

/**
 * MWST-Bericht als CSV exportieren (ELSTA-kompatibel)
 */
export function exportVATToCSV(vatReport, options = {}) {
  const delimiter = options.delimiter || ';';
  const currency = options.currency || 'CHF';

  let csv = '';

  // Header
  csv += `"MWST-Abrechnung"${delimiter}${vatReport.periodLabel}${delimiter}\\r\\n`;
  csv += `"Erstellt am"${delimiter}${formatCHDate(new Date().toISOString())}${delimiter}\\r\\n`;
  csv += `"Mehrwertsteuersatz"${delimiter}${vatReport.vatRate}%${delimiter}\\r\\n\\r\\n`;

  // Summary
  csv += `"Zusammenfassung"${delimiter}\\r\\n`;
  csv += `"Gesamtumsatz"${delimiter}${formatCHAmount(vatReport.turnover.total)}${delimiter}${currency}\\r\\n`;
  csv += `"Steuerpflichtiger Umsatz"${delimiter}${formatCHAmount(vatReport.turnover.taxable)}${delimiter}${currency}\\r\\n\\r\\n`;

  // VAT details
  csv += `"MWST-Aufstellung"${delimiter}\\r\\n`;
  csv += `"MWST auf Umsatz"${delimiter}${formatCHAmount(vatReport.vat.onTurnover)}${delimiter}${currency}\\r\\n`;
  csv += `"Vorsteuer auf Ausgaben"${delimiter}${formatCHAmount(vatReport.vat.onExpenses)}${delimiter}${currency}\\r\\n`;
  csv += `"Zahlbare MWST"${delimiter}${formatCHAmount(vatReport.vat.netPayable)}${delimiter}${currency}\\r\\n\\r\\n`;

  // Category breakdown
  csv += `"Kategorie"${delimiter}"Anzahl"${delimiter}"Betrag"${delimiter}"MWST"${delimiter}\\r\\n`;
  for (const [category, data] of Object.entries(vatReport.byCategory)) {
    csv += `"${category}"${delimiter}${data.count}${delimiter}${formatCHAmount(data.total)}${delimiter}${formatCHAmount(data.vat)}${delimiter}\\r\\n`;
  }

  return csv;
}

/**
 * Einkommensteuer-Bericht als CSV exportieren
 */
export function exportIncomeTaxToCSV(taxReport, options = {}) {
  const delimiter = options.delimiter || ';';
  const currency = options.currency || 'CHF';

  let csv = '';

  // Header
  csv += `"Einkommensteuer-Abrechnung"${delimiter}${taxReport.periodLabel}${delimiter}\\r\\n`;
  csv += `"Erstellt am"${delimiter}${formatCHDate(new Date().toISOString())}${delimiter}\\r\\n\\r\\n`;

  // Income
  csv += `"Einkommen"${delimiter}\\r\\n`;
  csv += `"Bruttoeinkommen"${delimiter}${formatCHAmount(taxReport.income.gross)}${delimiter}${currency}\\r\\n`;

  for (const [category, data] of Object.entries(taxReport.income.byCategory)) {
    csv += `"${category}"${delimiter}${formatCHAmount(data.total)}${delimiter}${currency}\\r\\n`;
  }
  csv += `\\r\\n`;

  // Deductions
  csv += `"Abzüge"${delimiter}\\r\\n`;
  csv += `"Berufskosten"${delimiter}${formatCHAmount(taxReport.deductions.professionalExpenses)}${delimiter}${currency}\\r\\n`;
  csv += `"Versicherungsprämien"${delimiter}${formatCHAmount(taxReport.deductions.insurancePremiums)}${delimiter}${currency}\\r\\n`;
  csv += `"Säule 3a"${delimiter}${formatCHAmount(taxReport.deductions.pillar3a)}${delimiter}${currency}\\r\\n`;
  csv += `"Gesamtabzüge"${delimiter}${formatCHAmount(taxReport.deductions.total)}${delimiter}${currency}\\r\\n\\r\\n`;

  // Tax calculation
  csv += `"Steuerberechnung"${delimiter}\\r\\n`;
  csv += `"Steuerbares Einkommen"${delimiter}${formatCHAmount(taxReport.taxableIncome)}${delimiter}${currency}\\r\\n`;
  csv += `"Bundessteuer"${delimiter}${formatCHAmount(taxReport.tax.federal)}${delimiter}${currency}\\r\\n`;
  csv += `"Kantonssteuer"${delimiter}${formatCHAmount(taxReport.tax.cantonal)}${delimiter}${currency}\\r\\n`;
  csv += `"Gesamtsteuer"${delimiter}${formatCHAmount(taxReport.tax.total)}${delimiter}${currency}\\r\\n`;
  csv += `"Effektiver Steuersatz"${delimiter}${taxReport.tax.effectiveRate}%${delimiter}\\r\\n`;

  return csv;
}

/**
 * MWST-Bericht als PDF-HTML generieren
 */
export function exportVATToPDF(vatReport, options = {}) {
  const currency = options.currency || 'CHF';

  let html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>MWST-Abrechnung ${vatReport.periodLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #dc2626; }
    .header h1 { font-size: 24px; color: #991b1b; }
    .swiss-cross { font-size: 28px; color: #dc2626; }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 16px; margin-bottom: 12px; color: #991b1b; padding-bottom: 8px; border-bottom: 1px solid #fee2e2; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    th { background: #fef2f2; font-weight: 500; color: #991b1b; font-size: 11px; text-transform: uppercase; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }
    .total-row { background: #fef2f2; font-weight: 600; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .summary-card { background: #fef2f2; padding: 16px; border-radius: 8px; border: 1px solid #fecaca; }
    .summary-card h3 { font-size: 11px; text-transform: uppercase; color: #991b1b; margin-bottom: 4px; }
    .summary-card .value { font-size: 18px; font-weight: 600; }
    .positive { color: #16a34a; }
    .negative { color: #dc2626; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>MWST-Abrechnung</h1>
      <p>Periode: ${vatReport.periodLabel}</p>
      <p>Mehrwertsteuersatz: ${vatReport.vatRate}%</p>
    </div>
    <div style="text-align: right;">
      <span class="swiss-cross">🇨🇭</span>
      <p>Erstellt am ${formatCHDate(new Date().toISOString())}</p>
      <p>${vatReport.transactions.total} Transaktionen</p>
    </div>
  </div>

  <div class="section">
    <h2>Umsatzübersicht</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <h3>Gesamtumsatz</h3>
        <div class="value">${formatCHFCurrency(vatReport.turnover.total, currency)}</div>
      </div>
      <div class="summary-card">
        <h3>Steuerpflichtig</h3>
        <div class="value">${formatCHFCurrency(vatReport.turnover.taxable, currency)}</div>
      </div>
      <div class="summary-card">
        <h3>Transaktionen</h3>
        <div class="value">${vatReport.transactions.total}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>MWST-Aufstellung</h2>
    <table>
      <thead>
        <tr><th>Position</th><th class="amount">Betrag</th></tr>
      </thead>
      <tbody>
        <tr><td>MWST auf Umsatz</td><td class="amount">${formatCHFCurrency(vatReport.vat.onTurnover, currency)}</td></tr>
        <tr><td>Vorsteuer auf Ausgaben</td><td class="amount negative">-${formatCHFCurrency(vatReport.vat.onExpenses, currency)}</td></tr>
        <tr class="total-row"><td>Zahlbare MWST</td><td class="amount">${formatCHFCurrency(vatReport.vat.netPayable, currency)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Kategorieübersicht</h2>
    <table>
      <thead>
        <tr><th>Kategorie</th><th>Anzahl</th><th class="amount">Betrag</th><th class="amount">MWST</th></tr>
      </thead>
      <tbody>`;

  for (const [category, data] of Object.entries(vatReport.byCategory)) {
    html += `<tr><td>${category}</td><td>${data.count}</td><td class="amount">${formatCHFCurrency(data.total, currency)}</td><td class="amount">${formatCHFCurrency(data.vat, currency)}</td></tr>`;
  }

  html += `</tbody>
    </table>
  </div>

  <div class="footer">
    <p>Generiert von Money App | Schweizer MWST-Abrechnung | ${new Date().toLocaleDateString('de-CH')}</p>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Einkommensteuer-Bericht als PDF-HTML generieren
 */
export function exportIncomeTaxToPDF(taxReport, options = {}) {
  const currency = options.currency || 'CHF';

  let html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Einkommensteuer ${taxReport.periodLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1d4ed8; }
    .header h1 { font-size: 24px; color: #1e3a8a; }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 16px; margin-bottom: 12px; color: #1e3a8a; padding-bottom: 8px; border-bottom: 1px solid #dbeafe; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    th { background: #eff6ff; font-weight: 500; color: #1e3a8a; font-size: 11px; text-transform: uppercase; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }
    .total-row { background: #eff6ff; font-weight: 600; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .summary-card { background: #eff6ff; padding: 16px; border-radius: 8px; border: 1px solid #bfdbfe; }
    .summary-card h3 { font-size: 11px; text-transform: uppercase; color: #1e3a8a; margin-bottom: 4px; }
    .summary-card .value { font-size: 18px; font-weight: 600; }
    .negative { color: #dc2626; }
    .positive { color: #16a34a; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Einkommensteuer-Abrechnung</h1>
      <p>Steuerjahr: ${taxReport.year}</p>
      <p>Kanton: ${taxReport.taxpayer.canton}</p>
      <p>Familienstand: ${taxReport.taxpayer.maritalStatus}</p>
    </div>
    <div style="text-align: right;">
      <p>🇨🇭 Schweizerische Eidgenossenschaft</p>
      <p>Erstellt am ${formatCHDate(new Date().toISOString())}</p>
    </div>
  </div>

  <div class="section">
    <h2>Steuerübersicht</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <h3>Bruttoeinkommen</h3>
        <div class="value">${formatCHFCurrency(taxReport.income.gross, currency)}</div>
      </div>
      <div class="summary-card">
        <h3>Abzüge</h3>
        <div class="value negative">-${formatCHFCurrency(taxReport.deductions.total, currency)}</div>
      </div>
      <div class="summary-card">
        <h3>Steuerbares Einkommen</h3>
        <div class="value">${formatCHFCurrency(taxReport.taxableIncome, currency)}</div>
      </div>
      <div class="summary-card">
        <h3>Gesamtsteuer</h3>
        <div class="value negative">${formatCHFCurrency(taxReport.tax.total, currency)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Einkommensaufteilung</h2>
    <table>
      <thead>
        <tr><th>Kategorie</th><th>Anzahl</th><th class="amount">Betrag</th></tr>
      </thead>
      <tbody>`;

  for (const [category, data] of Object.entries(taxReport.income.byCategory)) {
    html += `<tr><td>${category}</td><td>${data.count}</td><td class="amount">${formatCHFCurrency(data.total, currency)}</td></tr>`;
  }

  html += `<tr class="total-row"><td>Gesamt</td><td>${taxReport.transactions.income}</td><td class="amount">${formatCHFCurrency(taxReport.income.gross, currency)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Abzüge</h2>
    <table>
      <thead>
        <tr><th>Abzug</th><th class="amount">Betrag</th></tr>
      </thead>
      <tbody>
        <tr><td>Berufskosten</td><td class="amount">${formatCHFCurrency(taxReport.deductions.professionalExpenses, currency)}</td></tr>
        <tr><td>Versicherungsprämien</td><td class="amount">${formatCHFCurrency(taxReport.deductions.insurancePremiums, currency)}</td></tr>
        <tr><td>Säule 3a</td><td class="amount">${formatCHFCurrency(taxReport.deductions.pillar3a, currency)}</td></tr>
        <tr><td>Schuldzinsen</td><td class="amount">${formatCHFCurrency(taxReport.deductions.interestOnDebt, currency)}</td></tr>
        <tr class="total-row"><td>Gesamtabzüge</td><td class="amount">${formatCHFCurrency(taxReport.deductions.total, currency)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Steuerberechnung</h2>
    <table>
      <thead>
        <tr><th>Steuerart</th><th class="amount">Betrag</th><th>Satz</th></tr>
      </thead>
      <tbody>
        <tr><td>Bundessteuer</td><td class="amount">${formatCHFCurrency(taxReport.tax.federal, currency)}</td><td>Progressiv</td></tr>
        <tr><td>Kantonssteuer</td><td class="amount">${formatCHFCurrency(taxReport.tax.cantonal, currency)}</td><td>(geschätzt)</td></tr>
        <tr class="total-row"><td>Gesamtsteuer</td><td class="amount">${formatCHFCurrency(taxReport.tax.total, currency)}</td><td>${taxReport.tax.effectiveRate}%</td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Generiert von Money App | Schweizer Einkommensteuer | ${new Date().toLocaleDateString('de-CH')}</p>
    <p><em>Hinweis: Diese Berechnung ist unverbindlich. Konsultieren Sie einen Steuerberater.</em></p>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Hilfsfunktionen
 */

function filterByQuarter(transactions, year, quarter) {
  const quarterMonths = {
    1: ['01', '02', '03'],
    2: ['04', '05', '06'],
    3: ['07', '08', '09'],
    4: ['10', '11', '12']
  };
  const months = quarterMonths[quarter] || [];
  return transactions.filter(t => {
    const match = t.date?.match(/^(\d{4})-(\d{2})/);
    if (!match) return false;
    return parseInt(match[1]) === year && months.includes(match[2]);
  });
}

function filterByYear(transactions, year) {
  return transactions.filter(t => {
    const match = t.date?.match(/^(\d{4})/);
    return match && parseInt(match[1]) === year;
  });
}

function calculateDeductions({ maritalStatus, childrenCount, pillar3aContribution, deductions }) {
  // Use provided values or defaults for Swiss tax calculation
  // Default professional expenses: 3% of gross income or minimum CHF 2,000
  const professionalExpenses = deductions.professionalExpenses || 2000;
  const insurancePremiums = deductions.insurancePremiums || 0;
  const pillar3a = Math.min(pillar3aContribution || 0, 7056);
  const interestOnDebt = deductions.interestOnDebt || 0;
  const childDeduction = childrenCount * 0; // Simplified, actual varies by canton
  const other = deductions.other || 0;

  return professionalExpenses + insurancePremiums + pillar3a + interestOnDebt + childDeduction + other;
}

function calculateFederalTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  for (const bracket of SWISS_FEDERAL_TAX_BRACKETS) {
    if (taxableIncome <= bracket.min) break;

    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }

  return Math.round(tax * 100) / 100;
}

function estimateCantonalTaxRate(canton, taxableIncome) {
  // Simplified cantonal tax rate estimates (varies significantly)
  const rates = {
    'ZH': 0.10, // Zurich
    'BE': 0.13, // Bern
    'LU': 0.09, // Lucerne
    'UR': 0.08,
    'SZ': 0.08,
    'OW': 0.08,
    'NW': 0.09,
    'GL': 0.08,
    'ZG': 0.07,
    'FR': 0.12,
    'SO': 0.11,
    'BS': 0.14,
    'BL': 0.12,
    'SH': 0.10,
    'AR': 0.09,
    'AI': 0.08,
    'SG': 0.10,
    'GR': 0.10,
    'AG': 0.10,
    'TG': 0.10,
    'TI': 0.12,
    'VD': 0.13,
    'VS': 0.11,
    'NE': 0.12,
    'GE': 0.14,
    'JU': 0.12
  };
  return rates[canton] || 0.10;
}

function formatCHDate(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

function formatCHAmount(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return "0.00";
  return num.toFixed(2).replace('.', ',');
}

function formatCHFCurrency(amount, currency = 'CHF') {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return `0.00 ${currency}`;
  return `${num.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
