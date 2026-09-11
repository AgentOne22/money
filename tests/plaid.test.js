import { describe, it, expect } from 'vitest';
import {
  PlaidClient,
  createPlaidConfig,
  normalizePlaidTransactions,
  validatePlaidConfig,
  PLAID_ENV,
  PLAID_PRODUCTS,
  PLAID_COUNTRY_CODES,
  PLAID_ERRORS,
  PLAID_BANK_INFO
} from '$lib/plaid';

describe('Plaid - Configuration', () => {
  it('creates default config in sandbox mode', () => {
    const config = createPlaidConfig();
    expect(config.env).toBe(PLAID_ENV.sandbox);
    expect(config.products).toEqual(PLAID_PRODUCTS);
    expect(config.countryCodes).toEqual(PLAID_COUNTRY_CODES);
    expect(config.clientId).toBeNull();
    expect(config.secret).toBeNull();
  });

  it('applies custom overrides', () => {
    const config = createPlaidConfig({
      env: PLAID_ENV.development,
      clientId: 'test-client-id',
      secret: 'test-secret',
      products: ['transactions'],
      countryCodes: ['DE']
    });
    expect(config.env).toBe(PLAID_ENV.development);
    expect(config.clientId).toBe('test-client-id');
    expect(config.secret).toBe('test-secret');
    expect(config.products).toEqual(['transactions']);
    expect(config.countryCodes).toEqual(['DE']);
  });

  it('validates correct config', () => {
    const result = validatePlaidConfig({
      env: PLAID_ENV.sandbox,
      products: ['transactions'],
      countryCodes: ['DE']
    });
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('detects mock mode without credentials', () => {
    const result = validatePlaidConfig({
      env: PLAID_ENV.sandbox,
      products: ['transactions'],
      countryCodes: ['DE']
    });
    expect(result.isMock).toBe(true);
  });

  it('reports invalid environment', () => {
    const result = validatePlaidConfig({
      env: 'invalid',
      products: ['transactions'],
      countryCodes: ['DE']
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Gültige Plaid-Umgebung erforderlich (sandbox/development/production)');
  });

  it('reports missing products', () => {
    const result = validatePlaidConfig({
      env: PLAID_ENV.sandbox,
      products: [],
      countryCodes: ['DE']
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Mindestens ein Plaid-Produkt erforderlich');
  });

  it('reports missing country codes', () => {
    const result = validatePlaidConfig({
      env: PLAID_ENV.sandbox,
      products: ['transactions'],
      countryCodes: []
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Mindestens ein Ländercode erforderlich');
  });
});

describe('Plaid - Client Initialization', () => {
  it('initializes in mock mode without credentials', () => {
    const client = new PlaidClient();
    expect(client.isMock).toBe(true);
    expect(client.env).toBe(PLAID_ENV.sandbox);
  });

  it('initializes with provided config', () => {
    const client = new PlaidClient({
      clientId: 'test-id',
      secret: 'test-secret',
      env: PLAID_ENV.development
    });
    expect(client.isMock).toBe(false);
    expect(client.clientId).toBe('test-id');
    expect(client.env).toBe(PLAID_ENV.development);
  });
});

describe('Plaid - Link Token (Mock)', () => {
  it('creates link token successfully', async () => {
    const client = new PlaidClient();
    const result = await client.createLinkToken('user-123');
    expect(result.success).toBe(true);
    expect(result.mock).toBe(true);
    expect(result.link_token).toContain('link-sandbox-mock-');
    expect(result.expiration).toBeDefined();
  });

  it('creates link token with custom redirect URI', async () => {
    const client = new PlaidClient();
    const result = await client.createLinkToken('user-123', 'https://example.com/callback');
    expect(result.success).toBe(true);
    expect(result.link_token).toBeDefined();
  });
});

describe('Plaid - Token Exchange (Mock)', () => {
  it('exchanges public token successfully', async () => {
    const client = new PlaidClient();
    const result = await client.exchangePublicToken('public-sandbox-test');
    expect(result.success).toBe(true);
    expect(result.mock).toBe(true);
    expect(result.access_token).toContain('access-sandbox-mock-');
    expect(result.item_id).toContain('item-mock-');
  });
});

describe('Plaid - Accounts (Mock)', () => {
  it('fetches accounts successfully', async () => {
    const client = new PlaidClient();
    const result = await client.getAccounts('access-sandbox-test');
    expect(result.success).toBe(true);
    expect(result.mock).toBe(true);
    expect(result.accounts.length).toBeGreaterThan(0);
    expect(result.accounts[0].iban).toMatch(/^DE\d{20}$/);
    expect(result.accounts[0].balances.current).toBeGreaterThan(0);
    expect(result.accounts[0].balances.currency).toBe('EUR');
  });

  it('returns account with type checking', async () => {
    const client = new PlaidClient();
    const result = await client.getAccounts('access-sandbox-test');
    expect(result.accounts[0].type).toBe('depository');
    expect(result.accounts[0].subtype).toBe('checking');
  });
});

describe('Plaid - Transactions (Mock)', () => {
  it('fetches transactions for date range', async () => {
    const client = new PlaidClient();
    const result = await client.getTransactions('access-sandbox-test', '2026-01-01', '2026-01-31');
    expect(result.success).toBe(true);
    expect(result.mock).toBe(true);
    expect(result.transactions.length).toBeGreaterThan(0);
    expect(result.total_transactions).toBe(result.transactions.length);
  });

  it('transactions have required fields', async () => {
    const client = new PlaidClient();
    const result = await client.getTransactions('access-sandbox-test', '2026-01-01', '2026-01-31');
    const tx = result.transactions[0];
    expect(tx).toHaveProperty('transaction_id');
    expect(tx).toHaveProperty('account_id');
    expect(tx).toHaveProperty('amount');
    expect(tx).toHaveProperty('date');
    expect(tx).toHaveProperty('name');
    expect(tx).toHaveProperty('iso_currency_code');
  });

  it('returns transactions sorted by date', async () => {
    const client = new PlaidClient();
    const result = await client.getTransactions('access-sandbox-test', '2026-01-01', '2026-01-31');
    for (let i = 1; i < result.transactions.length; i++) {
      expect(result.transactions[i].date >= result.transactions[i - 1].date).toBe(true);
    }
  });

  it('has pagination info', async () => {
    const client = new PlaidClient();
    const result = await client.getTransactions('access-sandbox-test', '2026-01-01', '2026-01-31');
    expect(result.has_more).toBe(false);
  });
});

describe('Plaid - Item (Mock)', () => {
  it('fetches item info', async () => {
    const client = new PlaidClient();
    const result = await client.getItem('access-sandbox-test');
    expect(result.success).toBe(true);
    expect(result.mock).toBe(true);
    expect(result.item.item_id).toBeDefined();
    expect(result.item.institution_id).toBeDefined();
    expect(result.item.available_products).toEqual(PLAID_PRODUCTS);
  });

  it('removes item successfully', async () => {
    const client = new PlaidClient();
    const result = await client.removeItem('access-sandbox-test');
    expect(result.success).toBe(true);
    expect(result.removed).toBe(true);
  });
});

describe('Plaid - Normalization', () => {
  it('normalizes plaid transactions to internal format', () => {
    const plaidTx = [
      {
        transaction_id: 'tx-1',
        account_id: 'acc-1',
        amount: -85.43,
        iso_currency_code: 'EUR',
        date: '2026-01-15',
        name: 'REWE Markt',
        category: ['Food and Drink', 'groceries'],
        pending: false,
        source: 'plaid'
      }
    ];
    const result = normalizePlaidTransactions(plaidTx);
    expect(result[0]).toMatchObject({
      date: '2026-01-15',
      description: 'REWE Markt',
      amount: -85.43,
      category: 'groceries',
      source: 'plaid',
      accountId: 'acc-1',
      transactionId: 'tx-1',
      currency: 'EUR',
      pending: false
    });
  });

  it('handles merchant_name as fallback', () => {
    const plaidTx = [
      {
        transaction_id: 'tx-1',
        account_id: 'acc-1',
        amount: -15.99,
        iso_currency_code: 'EUR',
        date: '2026-01-07',
        merchant_name: 'Netflix',
        category: ['Entertainment', 'entertainment'],
        pending: false
      }
    ];
    const result = normalizePlaidTransactions(plaidTx);
    expect(result[0].description).toBe('Netflix');
  });
});

describe('Plaid - Bank Info', () => {
  it('has info for German banks', () => {
    expect(PLAID_BANK_INFO.sparkasse).toBeDefined();
    expect(PLAID_BANK_INFO.sparkasse.country).toBe('DE');
    expect(PLAID_BANK_INFO.ing).toBeDefined();
    expect(PLAID_BANK_INFO.n26).toBeDefined();
  });

  it('has error constants', () => {
    expect(PLAID_ERRORS.INVALID_CREDENTIALS).toBeDefined();
    expect(PLAID_ERRORS.ITEM_LOGIN_REQUIRED).toBeDefined();
    expect(PLAID_ERRORS.CONNECTION_ERROR).toBeDefined();
  });
});
