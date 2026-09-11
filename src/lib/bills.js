/**
 * Bill Detection: Automatische Rechnungserkennung aus Bank-Transaktionen
 * Erkennt Rechnungen anhand von Mustern, Beträgen und Metadaten
 */

// Bekannte Rechnungs-Muster (besonders Schweiz/Deutschland)
export const BILL_PATTERNS = {
  // Schweizer Versicherungen
  insurance: [
    /helsana/i,
    /swica/i,
    /css/i,
    /sanitas/i,
    /visana/i,
    /kmu/i,
    /krankenkasse/i,
    /grundversorgung/i,
    /zusatzversicherung/i,
    /Helsana/i,
    /Swica/i,
    /CSS/i,
    /Sanitas/i,
    /Visana/i,
    /KMU/i,
    /Krankenkasse/i,
    /Grundversorgung/i,
    /Zusatzversicherung/i
  ],
  // Schweizer Energie/Wasser
  utilities: [
    /ewz/i,
    /ibw/i,
    /wvz/i,
    /energie/i,
    /strom/i,
    /gas/i,
    /wasser/i,
    /EWZ/i,
    /IBW/i,
    /WVZ/i,
    /Energie/i,
    /Strom/i,
    /Gas/i,
    /Wasser/i
  ],
  // Schweizer Telekommunikation
  telecom: [
    /swisscom/i,
    /sunrise/i,
    /salt/i,
    /telekom/i,
    /mobile/i,
    /internet/i,
    /Swisscom/i,
    /Sunrise/i,
    /Salt/i,
    /Telekom/i,
    /Mobile/i,
    /Internet/i
  ],
  // Schweizer Gesundheit
  health: [
    /arzt/i,
    /praxis/i,
    /klinik/i,
    /spital/i,
    /apotheke/i,
    /medikament/i,
    /Arzt/i,
    /Praxis/i,
    /Klinik/i,
    /Spital/i,
    /Apotheke/i,
    /Medikament/i
  ],
  // Allgemeine Rechnungsmuster
  general: [
    /rechnung/i,
    /invoice/i,
    /rechnungsnummer/i,
    /invoice number/i,
    /rechnungsdatum/i,
    /invoice date/i,
    /zahlbar bis/i,
    /due date/i,
    /rechnungsnr/i,
    /invoice nr/i,
    /rechnung nr/i,
    /invoice no/i,
    /rechnung no/i,
    /rechnungsnr\./i,
    /invoice nr\./i,
    /rechnung nr\./i,
    /invoice no\./i,
    /rechnung no\./i
  ]
};

// Bekannte Rechnungsbeträge (typische Werte)
export const TYPICAL_BILL_AMOUNTS = {
  insurance: { min: 200, max: 800 },
  utilities: { min: 50, max: 500 },
  telecom: { min: 30, max: 200 },
  health: { min: 20, max: 1000 },
  rent: { min: 500, max: 5000 },
  subscription: { min: 5, max: 100 }
};

/**
 * Erkennt Rechnungen aus einer Liste von Transaktionen
 * @param {Array} transactions - Transaktionen mit date, description, amount
 * @param {Object} options - Konfiguration
 * @returns {Array} Erkannte Rechnungen
 */
export function detectBills(transactions, options = {}) {
  const minConfidence = options.minConfidence || 0.5;
  const includeRecurring = options.includeRecurring !== false;

  const bills = [];

  for (const tx of transactions) {
    const bill = analyzeTransaction(tx, options);
    if (bill && bill.confidence >= minConfidence) {
      bills.push(bill);
    }
  }

  // Sort by confidence descending
  bills.sort((a, b) => b.confidence - a.confidence);

  // Deduplicate (same provider, same amount, same month)
  const deduplicated = deduplicateBills(bills);

  return deduplicated;
}

/**
 * Analysiert eine einzelne Transaktion auf Rechnungsmerkmale
 */
function analyzeTransaction(transaction, options = {}) {
  const description = transaction.description || '';
  const amount = transaction.amount || 0;

  // Rechnungen sind typischerweise Ausgaben
  if (amount >= 0 && !options.includeIncome) {
    return null;
  }

  const absAmount = Math.abs(amount);

  // Kategorie erkennen
  const category = detectBillCategory(description);

  // Konfidenz berechnen
  let confidence = 0;
  const signals = [];

  // Signal 1: Bekanntes Muster in Beschreibung
  const patternMatch = matchBillPattern(description);
  if (patternMatch) {
    confidence += 0.4;
    signals.push({ type: 'pattern', value: patternMatch, weight: 0.4 });
  }

  // Signal 2: Typischer Rechnungsbetrag
  if (isTypicalBillAmount(absAmount, category)) {
    confidence += 0.2;
    signals.push({ type: 'amount', value: absAmount, weight: 0.2 });
  }

  // Signal 3: Runder Betrag (typisch für Rechnungen)
  if (isRoundAmount(absAmount)) {
    confidence += 0.1;
    signals.push({ type: 'round', value: absAmount, weight: 0.1 });
  }

  // Signal 4: Kategorie-basiert
  if (category !== 'unknown') {
    confidence += 0.2;
    signals.push({ type: 'category', value: category, weight: 0.2 });
  }

  // Signal 5: Referenz-Nummer in Beschreibung
  if (hasReferenceNumber(description)) {
    confidence += 0.1;
    signals.push({ type: 'reference', value: true, weight: 0.1 });
  }

  confidence = Math.min(confidence, 1);

  if (confidence < 0.3) return null;

  return {
    id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    transactionId: transaction.id || null,
    date: transaction.date,
    description: description,
    amount: amount,
    absAmount: absAmount,
    category: category,
    confidence: Math.round(confidence * 100) / 100,
    signals: signals,
    provider: extractProvider(description),
    referenceNumber: extractReferenceNumber(description),
    isRecurring: transaction.isRecurring || false,
    detectedAt: new Date().toISOString()
  };
}

/**
 * Erkennt die Kategorie einer Rechnung
 */
function detectBillCategory(description) {
  const desc = description.toLowerCase();

  for (const [category, patterns] of Object.entries(BILL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(desc)) {
        return category;
      }
    }
  }

  return 'unknown';
}

/**
 * Prüft ob die Beschreibung ein bekanntes Rechnungsmuster enthält
 */
function matchBillPattern(description) {
  for (const [category, patterns] of Object.entries(BILL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(description)) {
        return { category, pattern: pattern.source };
      }
    }
  }
  return null;
}

/**
 * Prüft ob ein Betrag typisch für eine Rechnung ist
 */
function isTypicalBillAmount(amount, category) {
  const range = TYPICAL_BILL_AMOUNTS[category];
  if (!range) return false;
  return amount >= range.min && amount <= range.max;
}

/**
 * Prüft ob ein Betrag "rund" ist (typisch für Rechnungen)
 */
function isRoundAmount(amount) {
  // Ganze Zahlen oder .00
  if (amount === Math.floor(amount)) return true;
  // .00, .50, .90
  const cents = Math.round((amount - Math.floor(amount)) * 100);
  return cents === 0 || cents === 50 || cents === 90 || cents === 95 || cents === 99;
}

/**
 * Prüft ob eine Referenznummer in der Beschreibung enthalten ist
 */
function extractReferenceNumber(description) {
  // Typische Referenznummern: 123456789, REF-12345, INV-2024-001
  const patterns = [
    /(?:ref|invoice|rechnung|nr|no)[.\s-]*([a-z0-9-]{4,20})/i,
    /\b(\d{6,12})\b/,
    /\b([a-z]{2,4}-\d{3,8})\b/i
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Prüft ob eine Referenznummer vorhanden ist
 */
function hasReferenceNumber(description) {
  return extractReferenceNumber(description) !== null;
}

/**
 * Extrahiert den Anbieter aus der Beschreibung
 */
function extractProvider(description) {
  // Erstes Wort oder erste Wörter vor Zahlen/Sonderzeichen
  const match = description.match(/^([a-záàâäéèêëíìîïóòôöúùûüñçæœ\s]{2,30}?)(?:\s[\d-]|\s{2,}|$)/i);
  if (match) return match[1].trim();

  // Fallback: Erstes Wort
  const words = description.split(/\s+/);
  return words[0] || 'Unbekannt';
}

/**
 * Dedupliziert Rechnungen (gleicher Anbieter, gleicher Betrag, gleicher Monat)
 */
function deduplicateBills(bills) {
  const seen = new Map();

  return bills.filter(bill => {
    const key = `${bill.provider}_${bill.absAmount}_${bill.date?.substring(0, 7)}`;
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });
}

/**
 * Gruppiert erkannte Rechnungen nach Kategorie
 */
export function groupBillsByCategory(bills) {
  const groups = {};

  for (const bill of bills) {
    const category = bill.category || 'unknown';
    if (!groups[category]) {
      groups[category] = {
        category,
        bills: [],
        totalAmount: 0,
        count: 0
      };
    }
    groups[category].bills.push(bill);
    groups[category].totalAmount += bill.absAmount;
    groups[category].count++;
  }

  return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Berechnet monatliche Rechnungsausgaben
 */
export function calculateMonthlyBillExpenses(bills) {
  const monthly = {};

  for (const bill of bills) {
    const month = bill.date?.substring(0, 7);
    if (!month) continue;

    if (!monthly[month]) {
      monthly[month] = { month, total: 0, count: 0, bills: [] };
    }
    monthly[month].total += bill.absAmount;
    monthly[month].count++;
    monthly[month].bills.push(bill);
  }

  return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Erstellt eine Zusammenfassung der erkannten Rechnungen
 */
export function getBillsSummary(bills) {
  const byCategory = groupBillsByCategory(bills);
  const monthly = calculateMonthlyBillExpenses(bills);

  const totalAmount = bills.reduce((sum, b) => sum + b.absAmount, 0);
  const avgAmount = bills.length > 0 ? totalAmount / bills.length : 0;

  // Top-Anbieter
  const providerCounts = {};
  for (const bill of bills) {
    const provider = bill.provider || 'Unbekannt';
    if (!providerCounts[provider]) {
      providerCounts[provider] = { provider, count: 0, total: 0 };
    }
    providerCounts[provider].count++;
    providerCounts[provider].total += bill.absAmount;
  }
  const topProviders = Object.values(providerCounts)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    totalBills: bills.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    avgAmount: Math.round(avgAmount * 100) / 100,
    byCategory,
    monthly,
    topProviders,
    recurringBills: bills.filter(b => b.isRecurring).length,
    avgConfidence: bills.length > 0
      ? Math.round((bills.reduce((sum, b) => sum + b.confidence, 0) / bills.length) * 100) / 100
      : 0
  };
}

/**
 * Exportiert erkannte Rechnungen als CSV
 */
export function exportBillsToCSV(bills, options = {}) {
  const delimiter = options.delimiter || ';';
  const currency = options.currency || 'CHF';

  let csv = '';
  csv += `"Datum"${delimiter}"Beschreibung"${delimiter}"Anbieter"${delimiter}"Kategorie"${delimiter}"Betrag"${delimiter}"Währung"${delimiter}"Konfidenz"${delimiter}"Referenz"${delimiter}\\r\\n`;

  for (const bill of bills) {
    csv += `"${bill.date || ''}"${delimiter}"${(bill.description || '').replace(/"/g, '""')}"${delimiter}"${bill.provider || ''}"${delimiter}"${bill.category || 'unknown'}"${delimiter}"${formatCHAmount(bill.absAmount)}"${delimiter}"${currency}"${delimiter}"${Math.round(bill.confidence * 100)}%"${delimiter}"${bill.referenceNumber || ''}"${delimiter}\\r\\n`;
  }

  return csv;
}

/**
 * Exportiert Rechnungen als PDF-HTML
 */
export function exportBillsToPDF(bills, options = {}) {
  const currency = options.currency || 'CHF';
  const summary = getBillsSummary(bills);

  let html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Rechnungsübersicht</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #7c3aed; }
    .header h1 { font-size: 24px; color: #5b21b6; }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 16px; margin-bottom: 12px; color: #5b21b6; padding-bottom: 8px; border-bottom: 1px solid #ede9fe; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    th { background: #f5f3ff; font-weight: 500; color: #5b21b6; font-size: 11px; text-transform: uppercase; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .summary-card { background: #f5f3ff; padding: 16px; border-radius: 8px; border: 1px solid #ddd6fe; }
    .summary-card h3 { font-size: 11px; text-transform: uppercase; color: #5b21b6; margin-bottom: 4px; }
    .summary-card .value { font-size: 18px; font-weight: 600; }
    .confidence { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
    .confidence-high { background: #dcfce7; color: #166534; }
    .confidence-medium { background: #fef3c7; color: #92400e; }
    .confidence-low { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Rechnungsübersicht</h1>
      <p>Erstellt am ${formatCHDate(new Date().toISOString())}</p>
    </div>
    <div style="text-align: right;">
      <p>🇨🇭 Schweiz</p>
      <p>${bills.length} Rechnungen erkannt</p>
    </div>
  </div>

  <div class="section">
    <h2>Zusammenfassung</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <h3>Gesamtbetrag</h3>
        <div class="value">${formatCHFCurrency(summary.totalAmount, currency)}</div>
      </div>
      <div class="summary-card">
        <h3>Rechnungen</h3>
        <div class="value">${summary.totalBills}</div>
      </div>
      <div class="summary-card">
        <h3>Durchschnitt</h3>
        <div class="value">${formatCHFCurrency(summary.avgAmount, currency)}</div>
      </div>
      <div class="summary-card">
        <h3>Ø Konfidenz</h3>
        <div class="value">${Math.round(summary.avgConfidence * 100)}%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Alle Rechnungen</h2>
    <table>
      <thead>
        <tr><th>Datum</th><th>Beschreibung</th><th>Anbieter</th><th>Kategorie</th><th class="amount">Betrag</th><th>Konfidenz</th><th>Referenz</th></tr>
      </thead>
      <tbody>`;

  for (const bill of bills) {
    const confClass = bill.confidence >= 0.7 ? 'confidence-high' : bill.confidence >= 0.5 ? 'confidence-medium' : 'confidence-low';
    html += `<tr><td>${bill.date || ''}</td><td>${escapeHtml(bill.description)}</td><td>${escapeHtml(bill.provider)}</td><td>${bill.category}</td><td class="amount">${formatCHFCurrency(bill.absAmount, currency)}</td><td><span class="confidence ${confClass}">${Math.round(bill.confidence * 100)}%</span></td><td>${bill.referenceNumber || '-'}</td></tr>`;
  }

  html += `</tbody>
    </table>
  </div>

  <div class="footer">
    <p>Generiert von Money App | Rechnungserkennung | ${new Date().toLocaleDateString('de-CH')}</p>
  </div>
</body>
</html>`;

  return html;
}

// Hilfsfunktionen
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

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
