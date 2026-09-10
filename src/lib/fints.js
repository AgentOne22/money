/**
 * finTS (FinTS/HBCI) Integration für automatische Kontozugriffe
 * Unterstützt das deutsche Banken-Protokoll für Kontoumsätze
 */

export const FINTS_ERRORS = {
  NO_CONNECTION: 'Keine Verbindung zum Bank-Server',
  INVALID_CREDENTIALS: 'Ungültige Zugangsdaten',
  ACCOUNT_LOCKED: 'Konto gesperrt',
  TRANSACTION_FAILED: 'Transaktion fehlgeschlagen'
};

export const BANK_INFO = {
  dkb: {
    name: 'DKB',
    fintsUrl: 'https://banking-dkb-a-de.s-fints-pt-dkb.de/fints30',
    blz: '12030000'
  },
  n26: {
    name: 'N26',
    fintsUrl: 'https://fints.n26.com/fints30',
    blz: '10011001'
  },
  comdirect: {
    name: 'Comdirect',
    fintsUrl: 'https://fints.comdirect.de/fints30',
    'blz': '42450000'
  },
  ing: {
    name: 'ING',
    fintsUrl: 'https://fints.ing.de/fints30',
    'blz': '50010517'
  },
  sparkasse: {
    name: 'Sparkasse',
    fintsUrl: 'https://banking-sn-s-fints-pt-sn.de/fints30',
    blz: '86050000'
  }
};

/**
 * Erstellt eine finTS-Verbindungskonfiguration
 */
export function createFinTSConfig(bankCode, username, pin, url = null) {
  const bank = BANK_INFO[bankCode];
  if (!bank) {
    throw new Error(`Bank nicht unterstützt: ${bankCode}`);
  }

  return {
    bankCode,
    blz: bank.blz,
    url: url || bank.fintsUrl,
    user: username,
    pin,
    systemId: 'MONEY_APP',
    version: '3.0'
  };
}

/**
 * Simuliert die finTS-Kontoverbindung (Mock für MVP)
 * In Produktion: echte finTS-Bibliothek wie 'hbci4java' oder 'python-fints'
 */
export function mockFinTSConnect(config) {
  if (!config.user || !config.pin) {
    return { success: false, error: FINTS_ERRORS.INVALID_CREDENTIALS };
  }

  if (config.pin === '0000') {
    return { success: false, error: FINTS_ERRORS.ACCOUNT_LOCKED };
  }

  return {
    success: true,
    connectionId: `fints_${Date.now()}`,
    bankName: BANK_INFO[config.bankCode]?.name || 'Unknown',
    accounts: [
      {
        iban: 'DE89370400440532013000',
        bic: 'COBADEFFXXX',
        type: 'Girokonto',
        balance: 4250.75,
        currency: 'EUR'
      }
    ]
  };
}

/**
 * Simuliert Abruf der Umsätze via finTS
 * Generiert realistische Transaktionsdaten
 */
export function mockFetchTransactions(config, accountId, startDate, endDate) {
  if (!config.user) {
    return { success: false, error: FINTS_ERRORS.INVALID_CREDENTIALS };
  }

  const transactions = generateMockTransactions(startDate, endDate);

  return {
    success: true,
    accountId,
    transactions,
    balance: {
      available: 4250.75,
      booked: 4250.75,
      currency: 'EUR'
    }
  };
}

/**
 * Generiert realistische Mock-Transaktionen für Testzwecke
 */
function generateMockTransactions(startDate, endDate) {
  const descriptions = [
    { desc: 'Gehalt Firma GmbH', amount: 3500, category: 'income' },
    { desc: 'REWE Markt GmbH', amount: -85.43, category: 'groceries' },
    { desc: 'Einkauf Edeka', amount: -62.17, category: 'groceries' },
    { desc: 'Netflix Abo', amount: -15.99, category: 'entertainment' },
    { desc: 'Spotify Premium', amount: -9.99, category: 'subscriptions' },
    { desc: 'Shell Tankstelle', amount: -65.00, category: 'transport' },
    { desc: 'Aldi Süd', amount: -43.21, category: 'groceries' },
    { desc: 'Apotheke am Markt', amount: -24.95, category: 'health' },
    { desc: 'Amazon.de', amount: -49.99, category: 'shopping' },
    { desc: 'Miete Januar', amount: -850.00, category: 'rent' },
    { desc: 'Versicherung Deloitte', amount: -45.00, category: 'utilities' },
    { desc: 'McDonalds Berlin', amount: -8.50, category: 'food' }
  ];

  const transactions = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  let currentDate = new Date(start);

  let i = 0;
  while (currentDate <= end) {
    const day = currentDate.getDate();
    const numTx = Math.floor(Math.random() * 3) + 1;

    for (let j = 0; j < numTx; i++, j++) {
      if (i >= descriptions.length) i = 0;
      const template = descriptions[i];

      transactions.push({
        date: currentDate.toISOString().split('T')[0],
        description: template.desc,
        amount: template.amount,
        category: template.category,
        source: 'fints',
        accountId: null
      });
    }

    currentDate.setDate(day + Math.floor(Math.random() * 3) + 1);
  }

  return transactions.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Parst MT940-Format (Standard für finTS-Umsätze)
 */
export function parseMT940(mt940Text) {
  const transactions = [];
  const blocks = mt940Text.split(':61:');

  for (const block of blocks.slice(1)) {
    const lines = block.split('\n');
    const line1 = lines[0] || '';
    const line2 = lines[1] || '';

    // Buchungsdatum (YYMMDD)
    const dateMatch = line1.match(/^(\d{6})/);
    const amountMatch = line1.match(/[CD](\d+,\d{0,2})/);

    if (dateMatch && amountMatch) {
      const year = 2000 + parseInt(dateMatch[1].substring(0, 2));
      const month = parseInt(dateMatch[1].substring(2, 4));
      const day = parseInt(dateMatch[1].substring(4, 6));
      const amount = parseFloat(amountMatch[1].replace(',', '.'));

      const isDebit = !line1.includes('C') && line1.includes('D');
      const finalAmount = isDebit ? -amount : amount;

      // Verwendungszweck aus :61: Zeile extrahieren (nach NTRF oder Tag)
      // Versuche erst NTRF-Referenz, dann :86: Zeile
      const ntrfMatch = line1.match(/NTRF(.+?)(?=\n|:|$)/);
      let description = ntrfMatch ? ntrfMatch[1].trim() : '';
      if (!description && line2) {
        description = line2.replace(/^:/, '').trim();
      }
      if (!description) description = 'MT940 Buchung';

      transactions.push({
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        description,
        amount: finalAmount,
        category: null,
        source: 'mt940'
      });
    }
  }

  return transactions;
}

/**
 * Konvertiert finTS-Transaktionen ins interne Format
 */
export function normalizeFinTSTransactions(fintsTransactions) {
  return fintsTransactions.map((t) => ({
    date: t.date || t.date_booked,
    description: t.description || t.purpose || 'Unbekannt',
    amount: typeof t.amount === 'number' ? t.amount : parseFloat(t.amount),
    category: t.category || null,
    source: 'fints',
    accountId: t.account_id || t.accountId || null
  }));
}

/**
 * Validiert finTS-Konfiguration
 */
export function validateFinTSConfig(config) {
  const errors = [];

  if (!config.bankCode) {
    errors.push('Bankleitzahl (bankCode) erforderlich');
  }

  if (!config.user || config.user.length < 3) {
    errors.push('Benutzername muss mindestens 3 Zeichen haben');
  }

  if (!config.pin || config.pin.length < 4) {
    errors.push('PIN muss mindestens 4 Zeichen haben');
  }

  if (!config.url) {
    errors.push('finTS-URL erforderlich');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
