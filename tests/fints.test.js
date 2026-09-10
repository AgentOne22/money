import { describe, it, expect } from 'vitest';
import {
  createFinTSConfig,
  mockFinTSConnect,
  mockFetchTransactions,
  parseMT940,
  normalizeFinTSTransactions,
  validateFinTSConfig,
  FINTS_ERRORS,
  BANK_INFO
} from '$lib/fints';

describe('finTS - Configuration', () => {
  it('creates valid config for DKB', () => {
    const config = createFinTSConfig('dkb', 'user123', '1234');
    expect(config.bankCode).toBe('dkb');
    expect(config.url).toContain('dkb');
    expect(config.user).toBe('user123');
    expect(config.pin).toBe('1234');
  });

  it('creates valid config for ING', () => {
    const config = createFinTSConfig('ing', 'myuser', 'abcd');
    expect(config.bankCode).toBe('ing');
    expect(config.blz).toBe('50010517');
    expect(config.url).toContain('ing');
  });

  it('uses custom URL when provided', () => {
    const config = createFinTSConfig('dkb', 'user', '1234', 'https://custom.de/fints');
    expect(config.url).toBe('https://custom.de/fints');
  });

  it('throws for unknown bank code', () => {
    expect(() => createFinTSConfig('xyz', 'user', '1234')).toThrow('Bank nicht unterstützt');
  });

  it('has BANK_INFO for major German banks', () => {
    expect(BANK_INFO.dkb).toBeDefined();
    expect(BANK_INFO.n26).toBeDefined();
    expect(BANK_INFO.comdirect).toBeDefined();
    expect(BANK_INFO.ing).toBeDefined();
    expect(BANK_INFO.sparkasse).toBeDefined();
  });
});

describe('finTS - Connection', () => {
  it('connects successfully with valid credentials', () => {
    const config = createFinTSConfig('dkb', 'testuser', '5678');
    const result = mockFinTSConnect(config);
    expect(result.success).toBe(true);
    expect(result.connectionId).toContain('fints_');
    expect(result.accounts.length).toBeGreaterThan(0);
  });

  it('returns error for missing credentials', () => {
    const config = createFinTSConfig('dkb', '', '1234');
    const result = mockFinTSConnect(config);
    expect(result.success).toBe(false);
    expect(result.error).toBe(FINTS_ERRORS.INVALID_CREDENTIALS);
  });

  it('locks account after too many attempts', () => {
    const config = createFinTSConfig('dkb', 'user', '0000');
    const result = mockFinTSConnect(config);
    expect(result.success).toBe(false);
    expect(result.error).toBe(FINTS_ERRORS.ACCOUNT_LOCKED);
  });

  it('returns account with IBAN and balance', () => {
    const config = createFinTSConfig('dkb', 'testuser', '5678');
    const result = mockFinTSConnect(config);
    expect(result.accounts[0].iban).toMatch(/^DE\d{20}$/);
    expect(result.accounts[0].balance).toBeGreaterThan(0);
    expect(result.accounts[0].currency).toBe('EUR');
  });
});

describe('finTS - Transaction Fetching', () => {
  it('fetches transactions for date range', () => {
    const config = createFinTSConfig('dkb', 'user', '5678');
    const result = mockFetchTransactions(config, 'acc1', '2026-01-01', '2026-01-31');
    expect(result.success).toBe(true);
    expect(result.transactions.length).toBeGreaterThan(0);
  });

  it('transactions have required fields', () => {
    const config = createFinTSConfig('dkb', 'user', '5678');
    const result = mockFetchTransactions(config, 'acc1', '2026-01-01', '2026-01-31');
    const tx = result.transactions[0];
    expect(tx).toHaveProperty('date');
    expect(tx).toHaveProperty('description');
    expect(tx).toHaveProperty('amount');
    expect(tx).toHaveProperty('category');
    expect(tx.source).toBe('fints');
  });

  it('returns balance info', () => {
    const config = createFinTSConfig('dkb', 'user', '5678');
    const result = mockFetchTransactions(config, 'acc1', '2026-01-01', '2026-01-31');
    expect(result.balance.available).toBeGreaterThan(0);
    expect(result.balance.booked).toBeGreaterThan(0);
    expect(result.balance.currency).toBe('EUR');
  });

  it('fails for invalid config', () => {
    const result = mockFetchTransactions({ user: '' }, 'acc1', '2026-01-01', '2026-01-31');
    expect(result.success).toBe(false);
    expect(result.error).toBe(FINTS_ERRORS.INVALID_CREDENTIALS);
  });
});

describe('finTS - MT940 Parsing', () => {
  it('parses valid MT940 text', () => {
    const mt940 = `:20:STARTUMS
:25:12345678/DE89370400440532013000
:28C:00001
:60F:C260101EUR1000,00
:61:2601010101C500,00NTRFGehalt Firma GmbH
:86:105?00Gehalt?20Firma GmbH
:61:2601020102D85,43NTRFEinkauf REWE
:86:008?00Lebensmittel?20REWE Markt
:62F:C260102EUR1414,57
:64:C260102EUR1414,57
-`;

    const result = parseMT940(mt940);
    expect(result.length).toBe(2);
    expect(result[0].date).toBe('2026-01-01');
    expect(result[0].description).toBe('Gehalt Firma GmbH');
    expect(result[0].amount).toBe(500);
    expect(result[1].date).toBe('2026-01-02');
    expect(result[1].amount).toBe(-85.43);
  });

  it('handles debit amounts correctly', () => {
    const mt940 = `:61:260101D50,00NTRFTestausgabe
:61:260102C30,00NTRFEinnahme`;

    const result = parseMT940(mt940);
    expect(result[0].amount).toBe(-50);
    expect(result[1].amount).toBe(30);
  });

  it('returns empty array for empty text', () => {
    expect(parseMT940('')).toEqual([]);
  });

  it('sets source to mt940', () => {
    const mt940 = ':61:260101C100,00NTRFTest';
    const result = parseMT940(mt940);
    expect(result[0].source).toBe('mt940');
  });
});

describe('finTS - Normalization', () => {
  it('normalizes finTS transactions to internal format', () => {
    const fintsTx = [
      { date: '2026-01-01', description: 'Test', amount: 100, category: 'income' }
    ];
    const result = normalizeFinTSTransactions(fintsTx);
    expect(result[0]).toMatchObject({
      date: '2026-01-01',
      description: 'Test',
      amount: 100,
      source: 'fints'
    });
  });

  it('handles purpose as description fallback', () => {
    const fintsTx = [
      { date_booked: '2026-01-01', purpose: 'REWE Einkauf', amount: '50.00' }
    ];
    const result = normalizeFinTSTransactions(fintsTx);
    expect(result[0].description).toBe('REWE Einkauf');
    expect(result[0].amount).toBe(50);
  });
});

describe('finTS - Validation', () => {
  it('validates correct config', () => {
    const result = validateFinTSConfig({
      bankCode: 'dkb',
      user: 'validuser',
      pin: '1234',
      url: 'https://example.com'
    });
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('reports missing bank code', () => {
    const result = validateFinTSConfig({
      user: 'validuser',
      pin: '1234',
      url: 'https://example.com'
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Bankleitzahl (bankCode) erforderlich');
  });

  it('reports short username', () => {
    const result = validateFinTSConfig({
      bankCode: 'dkb',
      user: 'ab',
      pin: '1234',
      url: 'https://example.com'
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Benutzername muss mindestens 3 Zeichen haben');
  });

  it('reports short PIN', () => {
    const result = validateFinTSConfig({
      bankCode: 'dkb',
      user: 'validuser',
      pin: '12',
      url: 'https://example.com'
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('PIN muss mindestens 4 Zeichen haben');
  });

  it('reports missing URL', () => {
    const result = validateFinTSConfig({
      bankCode: 'dkb',
      user: 'validuser',
      pin: '1234',
      url: ''
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('finTS-URL erforderlich');
  });
});
