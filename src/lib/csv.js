/**
 * CSV Parser für Bank-Statements
 * Unterstützt: DKB, N26, Revolut, Comdirect
 */

export const BANK_FORMATS = {
  dkb: {
    name: 'DKB',
    delimiter: ';',
    encoding: 'utf-8',
    skipLines: 3,
    columns: {
      date: 0,
      description: 3,
      amount: 7
    },
    dateFormat: 'DD.MM.YYYY'
  },
  n26: {
    name: 'N26',
    delimiter: ',',
    encoding: 'utf-8',
    skipLines: 1,
    columns: {
      date: 0,
      description: 4,
      amount: 6
    },
    dateFormat: 'YYYY-MM-DD'
  },
  revolut: {
    name: 'Revolut',
    delimiter: ',',
    encoding: 'utf-8',
    skipLines: 1,
    columns: {
      date: 0,
      description: 2,
      amount: 5
    },
    dateFormat: 'YYYY-MM-DD'
  },
  comdirect: {
    name: 'Comdirect',
    delimiter: ';',
    encoding: 'latin1',
    skipLines: 4,
    columns: {
      date: 0,
      description: 2,
      amount: 3
    },
    dateFormat: 'DD.MM.YYYY'
  }
};

/**
 * Parse CSV text into transaction objects
 */
export function parseCSV(csvText, format = 'dkb') {
  const config = BANK_FORMATS[format];
  if (!config) {
    throw new Error(`Unknown bank format: ${format}`);
  }

  const lines = csvText.split('\n');
  const dataLines = lines.slice(config.skipLines);
  const transactions = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;

    const columns = line.split(config.delimiter).map((col) => col.replace(/^"|"$/g, '').trim());

    const rawDate = columns[config.columns.date];
    const description = columns[config.columns.description];
    const rawAmount = columns[config.columns.amount];

    if (!rawDate || !description || rawAmount === undefined) continue;

    const date = parseDate(rawDate, config.dateFormat);
    const amount = parseAmount(rawAmount);

    if (!date || isNaN(amount)) continue;

    transactions.push({
      date: date.toISOString().split('T')[0],
      description,
      amount,
      category: null,
      source: format
    });
  }

  return transactions;
}

function parseDate(dateStr, format) {
  if (!dateStr) return null;

  if (format === 'DD.MM.YYYY') {
    const parts = dateStr.split('.');
    if (parts.length !== 3) return null;
    return new Date(Date.UTC(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])));
  }

  if (format === 'YYYY-MM-DD') {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
  }

  return new Date(dateStr);
}

function parseAmount(amountStr) {
  if (!amountStr) return NaN;

  // German format: 1.234,56 -> 1234.56
  if (amountStr.includes(',') && amountStr.includes('.')) {
    let cleaned = amountStr.replace(/\./g, '').replace(',', '.');
    cleaned = cleaned.replace(/[^\d.-]/g, '');
    return parseFloat(cleaned);
  }

  // If only comma, it's likely German decimal format
  if (amountStr.includes(',') && !amountStr.includes('.')) {
    let cleaned = amountStr.replace(',', '.');
    cleaned = cleaned.replace(/[^\d.-]/g, '');
    return parseFloat(cleaned);
  }

  // Standard format with dot as decimal separator
  let cleaned = amountStr.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned);
}

/**
 * Auto-detect bank format from CSV header
 */
export function detectFormat(csvText) {
  const firstLines = csvText.split('\n').slice(0, 10).join('\n').toLowerCase();

  // DKB: has "buchungstag" and "verwendungszweck"
  if (firstLines.includes('buchungstag') && firstLines.includes('verwendungszweck')) {
    return 'dkb';
  }
  // N26: has "date" and "payee" and "amount (eur)"
  if (firstLines.includes('date') && firstLines.includes('payee') && firstLines.includes('amount (eur)')) {
    return 'n26';
  }
  // Revolut: has "completed date" and "reference"
  if (firstLines.includes('completed date') && firstLines.includes('reference')) {
    return 'revolut';
  }
  // Comdirect: has "auftragskonto" and "verwendungszweck"
  if (firstLines.includes('auftragskonto') && firstLines.includes('verwendungszweck')) {
    return 'comdirect';
  }

  return 'dkb'; // default
}
