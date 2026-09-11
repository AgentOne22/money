import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SUPPORTED_CURRENCIES,
  fetchExchangeRates,
  convertCurrency,
  convertTransactions,
  calculateTotalInCurrency,
  formatCurrency,
  getCurrencyInfo,
  ExchangeRateCache,
  calculateCurrencyTrend,
  calculatePortfolioValue,
  getFallbackRates
} from '$lib/currency';

describe('Currency - Supported Currencies', () => {
  it('has 20 supported currencies', () => {
    expect(SUPPORTED_CURRENCIES).toHaveLength(20);
  });

  it('includes major currencies', () => {
    const codes = SUPPORTED_CURRENCIES.map(c => c.code);
    expect(codes).toContain('EUR');
    expect(codes).toContain('USD');
    expect(codes).toContain('GBP');
    expect(codes).toContain('CHF');
    expect(codes).toContain('JPY');
  });

  it('has correct structure for each currency', () => {
    for (const currency of SUPPORTED_CURRENCIES) {
      expect(currency).toHaveProperty('code');
      expect(currency).toHaveProperty('name');
      expect(currency).toHaveProperty('symbol');
      expect(currency).toHaveProperty('locale');
    }
  });
});

describe('Currency - Fetch Exchange Rates', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches rates successfully', async () => {
    const mockRates = { USD: 1.08, GBP: 0.85 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        base: 'EUR',
        date: '2026-01-01',
        rates: mockRates
      })
    });

    const result = await fetchExchangeRates('EUR');
    expect(result.base).toBe('EUR');
    expect(result.rates).toEqual(mockRates);
  });

  it('uses fallback on API error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    const result = await fetchExchangeRates('EUR');
    expect(result).toHaveProperty('rates');
    expect(result.fallback).toBe(true);
  });

  it('uses fallback on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    });

    const result = await fetchExchangeRates('EUR');
    expect(result).toHaveProperty('rates');
    expect(result.fallback).toBe(true);
  });
});

describe('Currency - Convert Currency', () => {
  const rates = { USD: 1.08, GBP: 0.85, CHF: 0.94 };

  it('converts EUR to USD', () => {
    const result = convertCurrency(100, 'EUR', 'USD', rates);
    expect(result).toBeCloseTo(108, 0);
  });

  it('converts USD to EUR', () => {
    const result = convertCurrency(108, 'USD', 'EUR', rates);
    expect(result).toBeCloseTo(100, 0);
  });

  it('converts USD to GBP', () => {
    const result = convertCurrency(100, 'USD', 'GBP', rates);
    expect(result).toBeCloseTo(78.7, 0);
  });

  it('returns same amount for same currency', () => {
    const result = convertCurrency(100, 'EUR', 'EUR', rates);
    expect(result).toBe(100);
  });

  it('throws for unknown target currency', () => {
    expect(() => convertCurrency(100, 'EUR', 'XYZ', rates)).toThrow();
  });

  it('throws for unknown source currency', () => {
    expect(() => convertCurrency(100, 'XYZ', 'EUR', rates)).toThrow();
  });

  it('throws for empty rates', () => {
    expect(() => convertCurrency(100, 'EUR', 'USD', {})).toThrow();
  });
});

describe('Currency - Convert Transactions', () => {
  const rates = { USD: 1.08, GBP: 0.85 };

  it('converts transactions with different currency', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Test', amount: 100, currency: 'USD' }
    ];
    const result = convertTransactions(transactions, 'EUR', rates);
    expect(result[0].convertedAmount).toBeCloseTo(92.59, 1);
    expect(result[0].originalAmount).toBe(100);
    expect(result[0].originalCurrency).toBe('USD');
  });

  it('keeps EUR transactions unchanged', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Test', amount: 100, currency: 'EUR' }
    ];
    const result = convertTransactions(transactions, 'EUR', rates);
    expect(result[0].convertedAmount).toBe(100);
  });

  it('handles transactions without currency', () => {
    const transactions = [
      { date: '2026-01-01', description: 'Test', amount: 100 }
    ];
    const result = convertTransactions(transactions, 'EUR', rates);
    expect(result[0].convertedAmount).toBe(100);
  });
});

describe('Currency - Calculate Total', () => {
  const rates = { USD: 1.08, GBP: 0.85 };

  it('calculates total in target currency', () => {
    const transactions = [
      { amount: 100, currency: 'EUR' },
      { amount: 108, currency: 'USD' },
      { amount: 85, currency: 'GBP' }
    ];
    const total = calculateTotalInCurrency(transactions, 'EUR', rates);
    expect(total).toBeCloseTo(300, 0);
  });

  it('handles all EUR transactions', () => {
    const transactions = [
      { amount: 100, currency: 'EUR' },
      { amount: 200, currency: 'EUR' }
    ];
    const total = calculateTotalInCurrency(transactions, 'EUR', rates);
    expect(total).toBe(300);
  });
});

describe('Currency - Format Currency', () => {
  it('formats EUR correctly', () => {
    const result = formatCurrency(1234.56, 'EUR');
    expect(result).toContain('1.234,56');
    expect(result).toContain('€');
  });

  it('formats USD correctly', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toContain('1,234.56');
    expect(result).toContain('$');
  });

  it('handles zero', () => {
    const result = formatCurrency(0, 'EUR');
    expect(result).toContain('0,00');
  });

  it('handles negative amounts', () => {
    const result = formatCurrency(-50.25, 'EUR');
    expect(result).toContain('-50,25');
  });
});

describe('Currency - Get Currency Info', () => {
  it('returns info for EUR', () => {
    const info = getCurrencyInfo('EUR');
    expect(info.code).toBe('EUR');
    expect(info.symbol).toBe('€');
  });

  it('returns fallback for unknown currency', () => {
    const info = getCurrencyInfo('XYZ');
    expect(info.code).toBe('XYZ');
  });
});

describe('Currency - Exchange Rate Cache', () => {
  it('stores and retrieves rates', () => {
    const cache = new ExchangeRateCache(60);
    const rates = { base: 'EUR', rates: { USD: 1.08 } };
    cache.set('EUR', rates);
    
    const cached = cache.get('EUR');
    expect(cached).toEqual(rates);
  });

  it('returns null for expired cache', () => {
    const cache = new ExchangeRateCache(0); // 0 TTL = immediate expiry
    cache.set('EUR', { rates: {} });
    
    // With 0 TTL, the cache should be expired immediately
    // The check is: Date.now() - entry.timestamp > this.ttlMs
    // With ttlMs = 0, any positive time difference will expire it
    // But since we just set it, Date.now() - timestamp might be 0
    // Let's use a small negative TTL to force expiry
    const cache2 = new ExchangeRateCache(-1); // Negative TTL = always expired
    cache2.set('EUR', { rates: {} });
    const cached = cache2.get('EUR');
    expect(cached).toBeNull();
  });

  it('returns null for missing cache', () => {
    const cache = new ExchangeRateCache(60);
    expect(cache.get('USD')).toBeNull();
  });

  it('clears cache', () => {
    const cache = new ExchangeRateCache(60);
    cache.set('EUR', { rates: {} });
    cache.clear();
    expect(cache.get('EUR')).toBeNull();
  });

  it('checks validity', () => {
    const cache = new ExchangeRateCache(60);
    cache.set('EUR', { rates: {} });
    expect(cache.isValid('EUR')).toBe(true);
    expect(cache.isValid('USD')).toBe(false);
  });
});

describe('Currency - Calculate Trend', () => {
  it('detects upward trend', () => {
    const trend = calculateCurrencyTrend(1.10, 1.05);
    expect(trend.trend).toBe('up');
    expect(trend.change).toBeCloseTo(0.05, 2);
  });

  it('detects downward trend', () => {
    const trend = calculateCurrencyTrend(0.95, 1.00);
    expect(trend.trend).toBe('down');
    expect(trend.change).toBeCloseTo(-0.05, 2);
  });

  it('detects stable trend', () => {
    const trend = calculateCurrencyTrend(1.001, 1.000);
    expect(trend.trend).toBe('stable');
  });

  it('handles zero previous rate', () => {
    const trend = calculateCurrencyTrend(1.10, 0);
    expect(trend.trend).toBe('stable');
  });

  it('handles null previous rate', () => {
    const trend = calculateCurrencyTrend(1.10, null);
    expect(trend.trend).toBe('stable');
  });
});

describe('Currency - Portfolio Value', () => {
  const rates = { USD: 1.08, GBP: 0.85 };

  it('calculates portfolio value in base currency', () => {
    const holdings = [
      { amount: 108, currency: 'USD' },
      { amount: 85, currency: 'GBP' }
    ];
    const result = calculatePortfolioValue(holdings, 'EUR', rates);
    expect(result.totalValue).toBeCloseTo(200, 0);
    expect(result.baseCurrency).toBe('EUR');
    expect(result.breakdown).toHaveLength(2);
  });

  it('handles single holding', () => {
    const holdings = [{ amount: 100, currency: 'USD' }];
    const result = calculatePortfolioValue(holdings, 'EUR', rates);
    expect(result.breakdown[0].valueInBase).toBeCloseTo(92.59, 1);
  });
});

describe('Currency - Fallback Rates', () => {
  it('returns fallback rates for EUR', () => {
    const result = getFallbackRates('EUR');
    expect(result.base).toBe('EUR');
    expect(result.rates).toHaveProperty('USD');
    expect(result.fallback).toBe(true);
  });

  it('returns fallback rates for USD', () => {
    const result = getFallbackRates('USD');
    expect(result.base).toBe('USD');
    expect(result.rates).toHaveProperty('EUR');
  });
});
