/**
 * Multi-Currency Support: Währungsumrechnung mit Exchange Rates API
 * Unterstützt: Echtzeit-Kurse, Historische Kurse, Batch-Konvertierung
 */

export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE' },
  { code: 'USD', name: 'US-Dollar', symbol: '$', locale: 'en-US' },
  { code: 'GBP', name: 'Britisches Pfund', symbol: '£', locale: 'en-GB' },
  { code: 'CHF', name: 'Schweizer Franken', symbol: 'CHF', locale: 'de-CH' },
  { code: 'JPY', name: 'Japanischer Yen', symbol: '¥', locale: 'ja-JP' },
  { code: 'CAD', name: 'Kanadischer Dollar', symbol: 'CA$', locale: 'en-CA' },
  { code: 'AUD', name: 'Australischer Dollar', symbol: 'A$', locale: 'en-AU' },
  { code: 'SEK', name: 'Schwedische Krone', symbol: 'kr', locale: 'sv-SE' },
  { code: 'NOK', name: 'Norwegische Krone', symbol: 'kr', locale: 'nb-NO' },
  { code: 'DKK', name: 'Dänische Krone', symbol: 'kr', locale: 'da-DK' },
  { code: 'PLN', name: 'Polnischer Zloty', symbol: 'zł', locale: 'pl-PL' },
  { code: 'CZK', name: 'Tschechische Krone', symbol: 'Kč', locale: 'cs-CZ' },
  { code: 'HUF', name: 'Ungarischer Forint', symbol: 'Ft', locale: 'hu-HU' },
  { code: 'TRY', name: 'Türkische Lira', symbol: '₺', locale: 'tr-TR' },
  { code: 'INR', name: 'Indische Rupie', symbol: '₹', locale: 'en-IN' },
  { code: 'BRL', name: 'Brasilianischer Real', symbol: 'R$', locale: 'pt-BR' },
  { code: 'CNY', name: 'Chinesischer Yuan', symbol: '¥', locale: 'zh-CN' },
  { code: 'KRW', name: 'Südkoreanischer Won', symbol: '₩', locale: 'ko-KR' },
  { code: 'SGD', name: 'Singapur-Dollar', symbol: 'S$', locale: 'en-SG' },
  { code: 'NZD', name: 'Neuseeland-Dollar', symbol: 'NZ$', locale: 'en-NZ' }
];

const BASE_URL = 'https://api.exchangerate.host';

/**
 * Holt aktuelle Wechselkurse
 */
export async function fetchExchangeRates(baseCurrency = 'EUR') {
  try {
    const response = await fetch(`${BASE_URL}/latest?base=${baseCurrency}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    if (!data.success && data.success !== undefined) {
      throw new Error(data.error?.info || 'API request failed');
    }
    return {
      base: data.base || baseCurrency,
      date: data.date || new Date().toISOString().split('T')[0],
      rates: data.rates || {},
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    return getFallbackRates(baseCurrency);
  }
}

/**
 * Holt historische Wechselkurse für ein bestimmtes Datum
 */
export async function fetchHistoricalRates(date, baseCurrency = 'EUR') {
  const dateStr = date || new Date().toISOString().split('T')[0];
  try {
    const response = await fetch(`${BASE_URL}/${dateStr}?base=${baseCurrency}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return {
      base: data.base || baseCurrency,
      date: data.date || dateStr,
      rates: data.rates || {},
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Failed to fetch historical rates:', error);
    return getFallbackRates(baseCurrency);
  }
}

/**
 * Konvertiert einen Betrag von einer Währung in eine andere
 */
export function convertCurrency(amount, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  if (!rates || Object.keys(rates).length === 0) {
    throw new Error('No exchange rates provided');
  }

  // Wenn fromCurrency nicht die Basiswährung ist, zuerst in Basiswährung umrechnen
  let amountInBase = amount;
  if (fromCurrency !== 'EUR') {
    const fromRate = rates[fromCurrency];
    if (!fromRate) {
      throw new Error(`Exchange rate not found for ${fromCurrency}`);
    }
    amountInBase = amount / fromRate;
  }

  // Von Basiswährung in Zielwährung umrechnen
  if (toCurrency === 'EUR') {
    return Math.round(amountInBase * 100) / 100;
  }

  const toRate = rates[toCurrency];
  if (!toRate) {
    throw new Error(`Exchange rate not found for ${toCurrency}`);
  }

  return Math.round(amountInBase * toRate * 100) / 100;
}

/**
 * Konvertiert mehrere Transaktionen in eine Zielwährung
 */
export function convertTransactions(transactions, targetCurrency, rates) {
  return transactions.map(t => {
    if (!t.currency || t.currency === targetCurrency) {
      return { ...t, convertedAmount: t.amount };
    }
    return {
      ...t,
      originalAmount: t.amount,
      originalCurrency: t.currency,
      convertedAmount: convertCurrency(t.amount, t.currency, targetCurrency, rates),
      currency: targetCurrency
    };
  });
}

/**
 * Berechnet den Gesamtbetrag in einer Zielwährung
 */
export function calculateTotalInCurrency(transactions, targetCurrency, rates) {
  let total = 0;
  for (const t of transactions) {
    const amount = t.currency === targetCurrency || !t.currency
      ? t.amount
      : convertCurrency(t.amount, t.currency, targetCurrency, rates);
    total += amount;
  }
  return Math.round(total * 100) / 100;
}

/**
 * Formatiert einen Betrag in der lokalen Währungsformatierung
 */
export function formatCurrency(amount, currencyCode = 'EUR') {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  const locale = currency?.locale || 'de-DE';
  
  // Für Safari-Kompatibilität
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  } catch {
    // Fallback
    const symbol = currency?.symbol || currencyCode;
    return `${amount.toFixed(2).replace('.', ',')} ${symbol}`;
  }
}

/**
 * Ermittelt Währungsinformationen
 */
export function getCurrencyInfo(currencyCode) {
  return SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || {
    code: currencyCode,
    name: currencyCode,
    symbol: currencyCode,
    locale: 'de-DE'
  };
}

/**
 * Cache für Wechselkurse (vermeidet wiederholte API-Aufrufe)
 */
export class ExchangeRateCache {
  constructor(ttlMinutes = 60) {
    this.cache = new Map();
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  get(baseCurrency) {
    const entry = this.cache.get(baseCurrency);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(baseCurrency);
      return null;
    }
    
    return entry.data;
  }

  set(baseCurrency, data) {
    this.cache.set(baseCurrency, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }

  isValid(baseCurrency) {
    return this.get(baseCurrency) !== null;
  }
}

/**
 * Holt Wechselkurse mit Caching
 */
export async function getCachedExchangeRates(baseCurrency = 'EUR', cache = null) {
  const rateCache = cache || new ExchangeRateCache();
  
  const cached = rateCache.get(baseCurrency);
  if (cached) return cached;
  
  const rates = await fetchExchangeRates(baseCurrency);
  rateCache.set(baseCurrency, rates);
  return rates;
}

/**
 * Erstellt einen Währungsrechner mit aktuellen Kursen
 */
export function createCurrencyConverter(rates) {
  return {
    rates,
    convert: (amount, from, to) => convertCurrency(amount, from, to, rates),
    format: (amount, currency) => formatCurrency(amount, currency),
    getRate: (from, to) => {
      if (from === to) return 1;
      return convertCurrency(1, from, to, rates);
    }
  };
}

/**
 * Fallback-Kurse für den Fall, dass die API nicht verfügbar ist
 */
export function getFallbackRates(baseCurrency) {
  const fallbackRates = {
    EUR: {
      USD: 1.08,
      GBP: 0.85,
      CHF: 0.94,
      JPY: 162.5,
      CAD: 1.47,
      AUD: 1.63,
      SEK: 11.42,
      NOK: 11.68,
      DKK: 7.46,
      PLN: 4.28,
      CZK: 25.15,
      HUF: 398.5,
      TRY: 34.5,
      INR: 90.2,
      BRL: 5.45,
      CNY: 7.82,
      KRW: 1445,
      SGD: 1.45,
      NZD: 1.78
    },
    USD: {
      EUR: 0.926,
      GBP: 0.787,
      CHF: 0.870,
      JPY: 150.5,
      CAD: 1.36,
      AUD: 1.51,
      SEK: 10.57,
      NOK: 10.81,
      DKK: 6.91,
      PLN: 3.96,
      CZK: 23.29,
      HUF: 368.9,
      TRY: 31.9,
      INR: 83.5,
      BRL: 5.05,
      CNY: 7.24,
      KRW: 1338,
      SGD: 1.34,
      NZD: 1.65
    }
  };

  const rates = fallbackRates[baseCurrency] || fallbackRates.EUR;
  
  return {
    base: baseCurrency,
    date: new Date().toISOString().split('T')[0],
    rates,
    timestamp: Date.now(),
    fallback: true
  };
}

/**
 * Berechnet Währungstrends (Änderung über Zeit)
 */
export function calculateCurrencyTrend(currentRate, previousRate) {
  if (!previousRate || previousRate === 0) {
    return { trend: 'stable', change: 0, percentage: 0 };
  }
  
  const change = currentRate - previousRate;
  const percentage = (change / previousRate) * 100;
  
  let trend = 'stable';
  if (percentage > 1) trend = 'up';
  else if (percentage < -1) trend = 'down';
  
  return { trend, change: Math.round(change * 10000) / 10000, percentage: Math.round(percentage * 100) / 100 };
}

/**
 * Berechnet Portfolio-Wert in Basiswährung
 */
export function calculatePortfolioValue(holdings, baseCurrency, rates) {
  let totalValue = 0;
  const breakdown = [];
  
  for (const holding of holdings) {
    const valueInBase = convertCurrency(
      holding.amount,
      holding.currency,
      baseCurrency,
      rates
    );
    totalValue += valueInBase;
    breakdown.push({
      ...holding,
      valueInBase: Math.round(valueInBase * 100) / 100,
      baseCurrency
    });
  }
  
  return {
    totalValue: Math.round(totalValue * 100) / 100,
    baseCurrency,
    breakdown
  };
}
