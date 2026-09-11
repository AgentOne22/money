import { describe, it, expect } from 'vitest';
import {
  createInvestment,
  calculateInvestmentValue,
  calculatePortfolioStats,
  updateInvestmentsWithPrices,
  formatMoney,
  formatPercent,
  PriceCache,
  CRYPTO_ASSETS,
  STOCK_ASSETS
} from '$lib/investments';

describe('Investments - Creation', () => {
  it('creates a crypto investment with defaults', () => {
    const inv = createInvestment();
    expect(inv.id).toBeDefined();
    expect(inv.type).toBe('crypto');
    expect(inv.amount).toBe(0);
    expect(inv.buyPrice).toBe(0);
    expect(inv.currency).toBe('EUR');
  });

  it('creates a stock investment with custom values', () => {
    const inv = createInvestment({
      type: 'stock',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      amount: 10,
      buyPrice: 150.0,
      currency: 'USD'
    });
    expect(inv.type).toBe('stock');
    expect(inv.symbol).toBe('AAPL');
    expect(inv.amount).toBe(10);
    expect(inv.buyPrice).toBe(150.0);
    expect(inv.currency).toBe('USD');
  });

  it('ensures non-negative amounts', () => {
    const inv = createInvestment({ amount: -5, buyPrice: -100 });
    expect(inv.amount).toBe(0);
    expect(inv.buyPrice).toBe(0);
  });

  it('generates unique IDs', () => {
    const inv1 = createInvestment();
    const inv2 = createInvestment();
    expect(inv1.id).not.toBe(inv2.id);
  });

  it('sets current date as default buyDate', () => {
    const inv = createInvestment();
    expect(inv.buyDate).toBe(new Date().toISOString().split('T')[0]);
  });
});

describe('Investments - Value Calculation', () => {
  it('calculates profit correctly', () => {
    const inv = createInvestment({
      type: 'stock',
      symbol: 'AAPL',
      amount: 10,
      buyPrice: 100
    });
    const result = calculateInvestmentValue(inv, 150);
    expect(result.currentValue).toBe(1500);
    expect(result.costBasis).toBe(1000);
    expect(result.profitLoss).toBe(500);
    expect(result.profitLossPercent).toBe(50);
  });

  it('calculates loss correctly', () => {
    const inv = createInvestment({
      type: 'crypto',
      symbol: 'BTC',
      amount: 1,
      buyPrice: 70000
    });
    const result = calculateInvestmentValue(inv, 60000);
    expect(result.currentValue).toBe(60000);
    expect(result.profitLoss).toBe(-10000);
    expect(result.profitLossPercent).toBeCloseTo(-14.29, 1);
  });

  it('returns null for invalid input', () => {
    expect(calculateInvestmentValue(null, 100)).toBeNull();
    expect(calculateInvestmentValue({}, null)).toBeNull();
  });

  it('sets lastUpdated timestamp', () => {
    const inv = createInvestment({ amount: 1, buyPrice: 100 });
    const result = calculateInvestmentValue(inv, 120);
    expect(result.lastUpdated).toBeDefined();
  });
});

describe('Investments - Portfolio Stats', () => {
  const investments = [
    createInvestment({ type: 'stock', symbol: 'AAPL', amount: 10, buyPrice: 100 }),
    createInvestment({ type: 'crypto', symbol: 'BTC', amount: 0.5, buyPrice: 50000 })
  ].map((inv, i) => {
    const prices = [150, 60000];
    return calculateInvestmentValue(inv, prices[i]);
  });

  it('calculates total portfolio value', () => {
    const stats = calculatePortfolioStats(investments);
    expect(stats.totalValue).toBe(1500 + 30000);
  });

  it('calculates total cost', () => {
    const stats = calculatePortfolioStats(investments);
    expect(stats.totalCost).toBe(1000 + 25000);
  });

  it('calculates total profit/loss', () => {
    const stats = calculatePortfolioStats(investments);
    expect(stats.totalProfitLoss).toBe(500 + 5000);
  });

  it('separates crypto and stock values', () => {
    const stats = calculatePortfolioStats(investments);
    expect(stats.cryptoValue).toBe(30000);
    expect(stats.stockValue).toBe(1500);
  });

  it('returns correct allocation percentages', () => {
    const stats = calculatePortfolioStats(investments);
    expect(stats.cryptoPercent).toBe(95);
    expect(stats.stockPercent).toBe(5);
  });

  it('identifies best and worst performers', () => {
    const stats = calculatePortfolioStats(investments);
    // AAPL has 50% gain (best), BTC has 20% gain (worst)
    expect(stats.bestPerformer.symbol).toBe('AAPL');
    expect(stats.worstPerformer.symbol).toBe('BTC');
  });

  it('returns empty stats for empty array', () => {
    const stats = calculatePortfolioStats([]);
    expect(stats.totalValue).toBe(0);
    expect(stats.totalCost).toBe(0);
    expect(stats.allocation).toEqual([]);
  });
});

describe('Investments - Price Updates', () => {
  const investments = [
    createInvestment({ type: 'crypto', symbol: 'BTC', amount: 1, buyPrice: 60000 }),
    createInvestment({ type: 'crypto', symbol: 'ETH', amount: 5, buyPrice: 3000 }),
    createInvestment({ type: 'stock', symbol: 'AAPL', amount: 10, buyPrice: 150 })
  ];

  it('updates crypto investments with prices', () => {
    const cryptoPrices = {
      bitcoin: { price: 65000, change24h: 2.5 },
      ethereum: { price: 3500, change24h: -1.2 }
    };
    const updated = updateInvestmentsWithPrices(investments, cryptoPrices, {});

    const btc = updated.find(i => i.symbol === 'BTC');
    expect(btc.currentValue).toBe(65000);
    expect(btc.profitLoss).toBe(5000);

    const eth = updated.find(i => i.symbol === 'ETH');
    expect(eth.currentValue).toBe(17500);
    expect(eth.profitLoss).toBe(2500);
  });

  it('updates stock investments with prices', () => {
    const stockPrices = {
      AAPL: { price: 180, change24h: 1.5 }
    };
    const updated = updateInvestmentsWithPrices(investments, {}, stockPrices);

    const aapl = updated.find(i => i.symbol === 'AAPL');
    expect(aapl.currentValue).toBe(1800);
    expect(aapl.profitLoss).toBe(300);
  });

  it('leaves investments without prices unchanged', () => {
    const updated = updateInvestmentsWithPrices(investments, {}, {});
    const btc = updated.find(i => i.symbol === 'BTC');
    expect(btc.currentValue).toBeNull();
  });
});

describe('Investments - Formatting', () => {
  it('formats EUR currency', () => {
    const formatted = formatMoney(1234.56, 'EUR');
    expect(formatted).toContain('1.234,56');
  });

  it('formats USD currency', () => {
    const formatted = formatMoney(1234.56, 'USD');
    // German locale formats USD as "1.234,56 $"
    expect(formatted).toContain('1.234,56');
  });

  it('formats positive percent with plus sign', () => {
    expect(formatPercent(5.5)).toBe('+5.50%');
  });

  it('formats negative percent with minus sign', () => {
    expect(formatPercent(-3.2)).toBe('-3.20%');
  });

  it('formats zero percent', () => {
    expect(formatPercent(0)).toBe('+0.00%');
  });
});

describe('Investments - Price Cache', () => {
  it('stores and retrieves data', () => {
    const cache = new PriceCache();
    cache.set('BTC', { price: 65000 });
    expect(cache.get('BTC')).toEqual({ price: 65000 });
  });

  it('returns null for missing key', () => {
    const cache = new PriceCache();
    expect(cache.get('ETH')).toBeNull();
  });

  it('expires entries after TTL', () => {
    const cache = new PriceCache(0); // 0 minute TTL
    cache.set('BTC', { price: 65000 });
    expect(cache.get('BTC')).toBeNull();
  });

  it('clears all entries', () => {
    const cache = new PriceCache();
    cache.set('BTC', { price: 65000 });
    cache.set('ETH', { price: 3500 });
    cache.clear();
    expect(cache.get('BTC')).toBeNull();
    expect(cache.get('ETH')).toBeNull();
  });
});

describe('Investments - Asset Lists', () => {
  it('has crypto assets defined', () => {
    expect(CRYPTO_ASSETS.length).toBeGreaterThan(0);
    expect(CRYPTO_ASSETS[0]).toHaveProperty('id');
    expect(CRYPTO_ASSETS[0]).toHaveProperty('symbol');
    expect(CRYPTO_ASSETS[0]).toHaveProperty('name');
  });

  it('has stock assets defined', () => {
    expect(STOCK_ASSETS.length).toBeGreaterThan(0);
    expect(STOCK_ASSETS[0]).toHaveProperty('symbol');
    expect(STOCK_ASSETS[0]).toHaveProperty('name');
  });

  it('includes major cryptocurrencies', () => {
    const symbols = CRYPTO_ASSETS.map(c => c.symbol);
    expect(symbols).toContain('BTC');
    expect(symbols).toContain('ETH');
    expect(symbols).toContain('SOL');
  });

  it('includes major stocks', () => {
    const symbols = STOCK_ASSETS.map(s => s.symbol);
    expect(symbols).toContain('AAPL');
    expect(symbols).toContain('MSFT');
    expect(symbols).toContain('GOOGL');
  });
});
