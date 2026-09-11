/**
 * Export Module: CSV/PDF Export von Transaktionen und Reports
 * PDF: HTML-basierter Export (Browser-kompatibel ohne externe Bibliothek)
 * CSV: Standard CSV mit deutschem Format
 */

/**
 * Exportiert Transaktionen als CSV
 */
export function exportTransactionsToCSV(transactions, options = {}) {
  const delimiter = options.delimiter || ';';
  const includeHeader = options.includeHeader !== false;
  const dateFormat = options.dateFormat || 'DD.MM.YYYY';
  const columns = options.columns || ['date', 'description', 'amount', 'category', 'source'];

  const formatters = {
    date: (t) => formatDate(t.date, dateFormat),
    description: (t) => `"${(t.description || '').replace(/"/g, '""')}"`,
    amount: (t) => formatAmount(t.amount, options.decimalSeparator || ','),
    category: (t) => t.category || 'other',
    source: (t) => t.source || 'manual',
    accountId: (t) => t.accountId || '',
    currency: (t) => t.currency || 'EUR',
    type: (t) => t.type || ''
  };

  const headers = {
    date: 'Datum',
    description: 'Beschreibung',
    amount: 'Betrag',
    category: 'Kategorie',
    source: 'Quelle',
    accountId: 'Konto-ID',
    currency: 'Währung',
    type: 'Typ'
  };

  let csv = '';

  if (includeHeader) {
    csv += columns.map(col => headers[col] || col).join(delimiter) + '\r\n';
  }

  for (const t of transactions) {
    const row = columns.map(col => {
      const formatter = formatters[col];
      return formatter ? formatter(t) : (t[col] || '');
    });
    csv += row.join(delimiter) + '\r\n';
  }

  return csv;
}

/**
 * Exportiert Report als CSV
 */
export function exportReportToCSV(report, options = {}) {
  const delimiter = options.delimiter || ';';
  let csv = '';

  csv += `"${report.title || 'Finanzreport'}"${delimiter}\r\n`;
  csv += `"Erstellt am"${delimiter}${formatDate(new Date().toISOString(), options.dateFormat || 'DD.MM.YYYY')}\r\n`;
  csv += `"Zeitraum"${delimiter}${report.period || ''}\r\n\r\n`;

  if (report.summary) {
    csv += `"Zusammenfassung"${delimiter}\r\n`;
    for (const [key, value] of Object.entries(report.summary)) {
      csv += `"${key}"${delimiter}"${formatNumber(value)}"\r\n`;
    }
    csv += '\r\n';
  }

  if (report.details && report.details.length > 0) {
    const columns = Object.keys(report.details[0]);
    csv += columns.map(col => getColumnHeader(col)).join(delimiter) + '\r\n';

    for (const row of report.details) {
      const rowValues = columns.map(col => {
        const val = row[col];
        if (typeof val === 'string' && val.includes(delimiter)) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csv += rowValues.join(delimiter) + '\r\n';
    }
  }

  return csv;
}

/**
 * Exportiert Transaktionen als PDF (HTML-basiert)
 */
export function exportTransactionsToPDF(transactions, options = {}) {
  const title = options.title || 'Transaktionsübersicht';
  const subtitle = options.subtitle || '';
  const dateFormat = options.dateFormat || 'DD.MM.YYYY';

  const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome + totalExpenses;

  const byCategory = {};
  for (const t of transactions) {
    const cat = t.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = { count: 0, total: 0 };
    byCategory[cat].count++;
    byCategory[cat].total += t.amount;
  }

  let html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .header h1 { font-size: 24px; color: #111827; }
    .header p { color: #6b7280; font-size: 14px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
    .summary-card { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .summary-card h3 { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
    .summary-card .value { font-size: 20px; font-weight: 600; }
    .income .value { color: #16a34a; }
    .expenses .value { color: #dc2626; }
    .balance .value { color: ${balance >= 0 ? '#16a34a' : '#dc2626'}; }
    .section { margin-bottom: 40px; }
    .section h2 { font-size: 16px; margin-bottom: 16px; color: #111827; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 500; color: #6b7280; font-size: 11px; text-transform: uppercase; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }
    .amount.positive { color: #16a34a; }
    .amount.negative { color: #dc2626; }
    .category-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .category-item { display: flex; justify-content: space-between; padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div style="text-align: right;">
      <p>Erstellt am ${formatDate(new Date().toISOString(), dateFormat)}</p>
      <p>${transactions.length} Transaktionen</p>
    </div>
  </div>
  <div class="summary">
    <div class="summary-card income"><h3>Einnahmen</h3><div class="value">${formatCurrency(totalIncome)}</div></div>
    <div class="summary-card expenses"><h3>Ausgaben</h3><div class="value">${formatCurrency(Math.abs(totalExpenses))}</div></div>
    <div class="summary-card balance"><h3>Saldo</h3><div class="value">${formatCurrency(balance)}</div></div>
  </div>
  <div class="section">
    <h2>Kategorieübersicht</h2>
    <div class="category-grid">`;

  for (const [category, data] of Object.entries(byCategory)) {
    html += `<div class="category-item"><span>${category}</span><span class="${data.total >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.total)}</span></div>`;
  }

  html += `</div></div><div class="section"><h2>Alle Transaktionen</h2><table><thead><tr><th>Datum</th><th>Beschreibung</th><th>Kategorie</th><th>Quelle</th><th class="amount">Betrag</th></tr></thead><tbody>`;

  const sortedTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  for (const t of sortedTransactions) {
    html += `<tr><td>${formatDate(t.date, dateFormat)}</td><td>${escapeHtml(t.description || '')}</td><td>${t.category || 'other'}</td><td>${t.source || 'manual'}</td><td class="amount ${t.amount >= 0 ? 'positive' : 'negative'}">${formatCurrency(t.amount)}</td></tr>`;
  }

  html += `</tbody></table></div><div class="footer"><p>Generiert von Money App | ${new Date().toLocaleDateString('de-DE')}</p></div></body></html>`;
  return html;
}

/**
 * Erstellt einen vollständigen Finanzreport als PDF-HTML
 */
export function generateFinancialReport(reportData, options = {}) {
  const { transactions = [], budgets = {}, recurring = [], period = {}, savings = [] } = reportData;
  const title = options.title || 'Finanzreport';
  const dateFormat = options.dateFormat || 'DD.MM.YYYY';

  const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome + totalExpenses;

  const monthlyData = {};
  for (const t of transactions) {
    const month = t.date.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0 };
    if (t.amount > 0) monthlyData[month].income += t.amount;
    else monthlyData[month].expenses += t.amount;
  }

  let html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .header h1 { font-size: 28px; color: #111827; }
    .header p { color: #6b7280; font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
    .stat-card { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center; }
    .stat-card h3 { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
    .stat-card .value { font-size: 18px; font-weight: 600; }
    .positive { color: #16a34a; }
    .negative { color: #dc2626; }
    .section { margin-bottom: 40px; }
    .section h2 { font-size: 16px; margin-bottom: 16px; color: #111827; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 500; color: #6b7280; font-size: 11px; text-transform: uppercase; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-success { background: #dcfce7; color: #166534; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
  </style></head><body>
  <div class="header"><div><h1>${title}</h1><p>Zeitraum: ${period.start || '–'} bis ${period.end || '–'}</p></div><div style="text-align: right;"><p>Erstellt am ${formatDate(new Date().toISOString(), dateFormat)}</p></div></div>
  <div class="grid">
    <div class="stat-card"><h3>Gesamteinnahmen</h3><div class="value positive">${formatCurrency(totalIncome)}</div></div>
    <div class="stat-card"><h3>Gesamtausgaben</h3><div class="value negative">${formatCurrency(Math.abs(totalExpenses))}</div></div>
    <div class="stat-card"><h3>Saldo</h3><div class="value ${balance >= 0 ? 'positive' : 'negative'}">${formatCurrency(balance)}</div></div>
    <div class="stat-card"><h3>Transaktionen</h3><div class="value">${transactions.length}</div></div>
  </div>`;

  if (Object.keys(monthlyData).length > 0) {
    html += `<div class="section"><h2>Monatsübersicht</h2><table><thead><tr><th>Monat</th><th class="amount">Einnahmen</th><th class="amount">Ausgaben</th><th class="amount">Saldo</th></tr></thead><tbody>`;
    for (const [month, data] of Object.entries(monthlyData).sort()) {
      const monthBalance = data.income + data.expenses;
      html += `<tr><td>${month}</td><td class="amount positive">${formatCurrency(data.income)}</td><td class="amount negative">${formatCurrency(Math.abs(data.expenses))}</td><td class="amount ${monthBalance >= 0 ? 'positive' : 'negative'}">${formatCurrency(monthBalance)}</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }

  if (Object.keys(budgets).length > 0) {
    html += `<div class="section"><h2>Budget-Status</h2><table><thead><tr><th>Kategorie</th><th class="amount">Budget</th><th class="amount">Ausgegeben</th><th class="amount">Verbleibend</th><th>Status</th></tr></thead><tbody>`;
    for (const [category, budget] of Object.entries(budgets)) {
      const spent = transactions.filter(t => t.category === category && t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const percentage = budget > 0 ? (spent / budget) * 100 : 0;
      const remaining = budget - spent;
      let statusClass = 'badge-success'; let statusText = 'OK';
      if (percentage >= 100) { statusClass = 'badge-danger'; statusText = 'Überschritten'; }
      else if (percentage >= 80) { statusClass = 'badge-warning'; statusText = 'Warnung'; }
      html += `<tr><td>${category}</td><td class="amount">${formatCurrency(budget)}</td><td class="amount">${formatCurrency(spent)}</td><td class="amount ${remaining >= 0 ? 'positive' : 'negative'}">${formatCurrency(remaining)}</td><td><span class="badge ${statusClass}">${statusText}</span></td></tr>`;
    }
    html += `</tbody></table></div>`;
  }

  if (recurring.length > 0) {
    html += `<div class="section"><h2>Wiederkehrende Zahlungen</h2><table><thead><tr><th>Beschreibung</th><th>Typ</th><th>Intervall</th><th class="amount">Betrag</th><th>Nächste Zahlung</th></tr></thead><tbody>`;
    for (const rt of recurring) {
      html += `<tr><td>${escapeHtml(rt.description)}</td><td>${rt.type}</td><td>${rt.interval}</td><td class="amount negative">${formatCurrency(Math.abs(rt.amount))}</td><td>${formatDate(rt.nextPredictedDate, dateFormat)}</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }

  html += `<div class="footer"><p>Generiert von Money App | ${new Date().toLocaleDateString('de-DE')}</p></div></body></html>`;
  return html;
}

/**
 * Hilfsfunktionen
 */
function formatDate(dateStr, format) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (format === 'DD.MM.YYYY') return `${day}.${month}.${year}`;
  return `${year}-${month}-${day}`;
}

function formatAmount(amount, decimalSeparator = ',') {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return '';
  return num.toFixed(2).replace('.', decimalSeparator);
}

function formatCurrency(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return '0,00 €';
  // Use regular space instead of non-breaking space for consistency
  return num.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }).replace(/\u00A0/g, ' ');
}

function formatNumber(value) {
  if (typeof value === 'number') return formatCurrency(value);
  return value;
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getColumnHeader(col) {
  const headers = { category: 'Kategorie', spent: 'Ausgegeben', limit: 'Budget', remaining: 'Verbleibend', percentage: 'Prozent', status: 'Status', description: 'Beschreibung', amount: 'Betrag', date: 'Datum' };
  return headers[col] || col;
}

/**
 * Lädt Datei herunter (Browser-Kontext)
 */
export function downloadFile(content, filename, mimeType = 'text/csv') {
  if (typeof window === 'undefined' || typeof URL === 'undefined' || typeof document === 'undefined') {
    console.warn('downloadFile kann nur im Browser verwendet werden');
    return;
  }

  if (typeof URL.createObjectURL !== 'function') {
    console.warn('URL.createObjectURL wird nicht unterstützt');
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Speichert Datei als JSON
 */
export function exportTransactionsToJSON(transactions) {
  return JSON.stringify(transactions, null, 2);
}
