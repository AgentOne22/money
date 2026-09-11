/**
 * Plaid API Integration — Live + Mock
 * Uses the official `plaid` npm package when credentials are available.
 * Falls back to realistic mock mode for development/MVP.
 */

import { PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

export const PLAID_ENV = {
  sandbox: 'sandbox',
  development: 'development',
  production: 'production'
};

export const PLAID_PRODUCTS = [Products.Transactions, Products.Auth, Products.Identity];

export const PLAID_COUNTRY_CODES = [
  CountryCode.De,
  CountryCode.Us,
  CountryCode.Gb,
  CountryCode.Fr,
  CountryCode.It,
  CountryCode.Es,
  CountryCode.Nl,
  CountryCode.Be
];

// Deutsche Banken mit Plaid-Support
export const PLAID_BANK_INFO = {
  sparkasse: { name: 'Sparkasse', country: 'DE' },
  postbank: { name: 'Postbank', country: 'DE' },
  commerzbank: { name: 'Commerzbank', country: 'DE' },
  deutsche_bank: { name: 'Deutsche Bank', country: 'DE' },
  ing: { name: 'ING', country: 'DE' },
  n26: { name: 'N26', country: 'DE' },
  volksbank: { name: 'Volksbank', country: 'DE' },
  rabobank: { name: 'Rabobank', country: 'NL' },
  ing_nl: { name: 'ING NL', country: 'NL' }
};

export const PLAID_ERRORS = {
  INVALID_CREDENTIALS: 'Ungültige Plaid-Zugangsdaten',
  ITEM_LOGIN_REQUIRED: 'Login erforderlich',
  RATE_LIMIT: 'Rate-Limit erreicht',
  NO_ACCOUNTS: 'Keine Konten gefunden',
  CONNECTION_ERROR: 'Verbindungsfehler zum Plaid-API'
};

/**
 * Plaid Client — supports both live API and mock mode
 */
export class PlaidClient {
  constructor(config = {}) {
    this.clientId = config.clientId || null;
    this.secret = config.secret || null;
    this.env = config.env || PLAID_ENV.sandbox;
    this.products = config.products || PLAID_PRODUCTS;
    this.countryCodes = config.countryCodes || PLAID_COUNTRY_CODES;
    this.isMock = !this.clientId || !this.secret;

    if (!this.isMock) {
      this.client = new PlaidApi({
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': this.clientId,
            'PLAID-SECRET': this.secret
          }
        },
        basePath: PlaidEnvironments[this.env]
      });
    }
  }

  /**
   * Erstellt einen Link Token für die Bank-Auswahl
   */
  async createLinkToken(userId, redirectUri = null) {
    if (this.isMock) {
      return {
        success: true,
        mock: true,
        link_token: `link-sandbox-mock-${Date.now()}`,
        expiration: new Date(Date.now() + 3600000).toISOString()
      };
    }

    try {
      const response = await this.client.linkTokenCreate({
        user: { client_user_id: userId },
        client_name: 'Money',
        products: this.products,
        country_codes: this.countryCodes,
        language: 'de',
        redirect_uri: redirectUri || undefined
      });

      return {
        success: true,
        link_token: response.data.link_token,
        expiration: response.data.expiration,
        request_id: response.data.request_id
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error_message || PLAID_ERRORS.CONNECTION_ERROR
      };
    }
  }

  /**
   * Tauscht Public Token gegen Access Token
   */
  async exchangePublicToken(publicToken) {
    if (this.isMock) {
      return {
        success: true,
        mock: true,
        access_token: `access-sandbox-mock-${Date.now()}`,
        item_id: `item-mock-${Date.now()}`
      };
    }

    try {
      const response = await this.client.itemPublicTokenExchange({
        public_token: publicToken
      });

      return {
        success: true,
        access_token: response.data.access_token,
        item_id: response.data.item_id,
        request_id: response.data.request_id
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error_message || PLAID_ERRORS.CONNECTION_ERROR
      };
    }
  }

  /**
   * Ruft Konten eines Items ab
   */
  async getAccounts(accessToken) {
    if (this.isMock) {
      return {
        success: true,
        mock: true,
        accounts: [
          {
            account_id: 'acc-checking-001',
            name: 'Girokonto',
            type: 'depository',
            subtype: 'checking',
            balances: {
              available: 4250.75,
              current: 4250.75,
              currency: 'EUR'
            },
            iban: 'DE89370400440532013000',
            bic: 'COBADEFFXXX'
          }
        ]
      };
    }

    try {
      const response = await this.client.accountsGet({ access_token: accessToken });
      const accounts = response.data.accounts.map((acc) => ({
        account_id: acc.account_id,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        balances: {
          available: acc.balances.available,
          current: acc.balances.current,
          currency: acc.balances.iso_currency_code
        },
        mask: acc.mask
      }));

      return {
        success: true,
        accounts,
        item_id: response.data.item.item_id,
        request_id: response.data.request_id
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error_message || PLAID_ERRORS.CONNECTION_ERROR
      };
    }
  }

  /**
   * Ruft Transaktionen ab (mit Cursor-basierter Pagination)
   */
  async getTransactions(accessToken, startDate, endDate, options = {}) {
    if (this.isMock) {
      const transactions = this.generateMockTransactions(startDate, endDate);
      return {
        success: true,
        mock: true,
        transactions,
        total_transactions: transactions.length,
        has_more: false
      };
    }

    try {
      const response = await this.client.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: {
          count: options.count || 500,
          offset: options.offset || 0
        }
      });

      const transactions = response.data.transactions.map((tx) => ({
        transaction_id: tx.transaction_id,
        account_id: tx.account_id,
        amount: tx.amount,
        iso_currency_code: tx.iso_currency_code,
        date: tx.date,
        datetime: tx.datetime || tx.date,
        name: tx.name,
        merchant_name: tx.merchant_name,
        category: tx.category,
        category_id: tx.category_id,
        pending: tx.pending,
        transaction_type: tx.transaction_type,
        payment_channel: tx.payment_channel,
        source: 'plaid',
        type: tx.category?.[1] || 'other'
      }));

      return {
        success: true,
        transactions,
        total_transactions: response.data.total_transactions,
        has_more: transactions.length < response.data.total_transactions
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error_message || PLAID_ERRORS.CONNECTION_ERROR
      };
    }
  }

  /**
   * Ruft Item-Informationen ab
   */
  async getItem(accessToken) {
    if (this.isMock) {
      return {
        success: true,
        mock: true,
        item: {
          item_id: 'item-mock-001',
          institution_id: 'ins_109508',
          available_products: PLAID_PRODUCTS,
          billed_products: ['transactions'],
          webhook: null,
          error: null
        }
      };
    }

    try {
      const response = await this.client.itemGet({ access_token: accessToken });
      return {
        success: true,
        item: {
          item_id: response.data.item.item_id,
          institution_id: response.data.item.institution_id,
          available_products: response.data.item.available_products,
          billed_products: response.data.item.billed_products,
          webhook: response.data.item.webhook,
          error: response.data.item.error
        },
        request_id: response.data.request_id
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error_message || PLAID_ERRORS.CONNECTION_ERROR
      };
    }
  }

  /**
   * Löscht ein Item (trennt die Bankverbindung)
   */
  async removeItem(accessToken) {
    if (this.isMock) {
      return {
        success: true,
        mock: true,
        removed: true
      };
    }

    try {
      await this.client.itemRemove({ access_token: accessToken });
      return {
        success: true,
        removed: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error_message || PLAID_ERRORS.CONNECTION_ERROR
      };
    }
  }

  /**
   * Ruft Institution/Bank-Infos ab
   */
  async getInstitutionById(institutionId) {
    if (this.isMock) {
      return {
        success: true,
        mock: true,
        institution: {
          institution_id: institutionId,
          name: 'Mock Bank',
          country_codes: ['DE'],
          products: PLAID_PRODUCTS
        }
      };
    }

    try {
      const response = await this.client.institutionsGetById({
        institution_id: institutionId,
        country_codes: this.countryCodes
      });
      return {
        success: true,
        institution: response.data.institution,
        request_id: response.data.request_id
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error_message || PLAID_ERRORS.CONNECTION_ERROR
      };
    }
  }

  /**
   * Generiert realistische Mock-Transaktionen für Plaid
   */
  generateMockTransactions(startDate, endDate) {
    const descriptions = [
      { desc: 'Gehalt Firma GmbH', amount: 3500, category: 'Transfer', type: 'income', date: 1 },
      { desc: 'REWE Markt GmbH', amount: -85.43, category: 'Food and Drink', type: 'groceries', date: 2 },
      { desc: 'Einkauf Edeka', amount: -62.17, category: 'Food and Drink', type: 'groceries', date: 5 },
      { desc: 'Netflix', amount: -15.99, category: 'Entertainment', type: 'entertainment', date: 7 },
      { desc: 'Spotify', amount: -9.99, category: 'Entertainment', type: 'subscriptions', date: 7 },
      { desc: 'Shell Tankstelle', amount: -65.00, category: 'Travel', type: 'transport', date: 10 },
      { desc: 'Aldi Süd', amount: -43.21, category: 'Food and Drink', type: 'groceries', date: 12 },
      { desc: 'Apotheke am Markt', amount: -24.95, category: 'Health', type: 'health', date: 15 },
      { desc: 'Amazon.de', amount: -49.99, category: 'Shopping', type: 'shopping', date: 18 },
      { desc: 'Miete Januar', amount: -850.00, category: 'Payment', type: 'rent', date: 1 },
      { desc: 'Allianz Versicherung', amount: -45.00, category: 'Payment', type: 'utilities', date: 3 },
      { desc: 'McDonalds', amount: -8.50, category: 'Food and Drink', type: 'food', date: 20 },
      { desc: 'Überweisung Sparbuch', amount: -500.00, category: 'Transfer', type: 'savings', date: 25 },
      { desc: 'Lidl', amount: -37.89, category: 'Food and Drink', type: 'groceries', date: 8 },
      { desc: 'Decathlon', amount: -89.99, category: 'Shopping', type: 'shopping', date: 22 }
    ];

    const start = new Date(startDate);
    const end = new Date(endDate);
    const transactions = [];

    for (const template of descriptions) {
      if (template.date >= start.getDate() && template.date <= end.getDate()) {
        const date = new Date(start);
        date.setDate(template.date);

        if (date >= start && date <= end) {
          transactions.push({
            transaction_id: `tx-${template.desc.replace(/\s/g, '-').toLowerCase()}-${Date.now()}`,
            account_id: 'acc-checking-001',
            amount: template.amount,
            iso_currency_code: 'EUR',
            date: date.toISOString().split('T')[0],
            datetime: date.toISOString(),
            name: template.desc,
            merchant_name: template.desc,
            category: [template.category, template.type],
            category_id: this.getCategoryId(template.category),
            pending: false,
            transaction_type: template.amount > 0 ? 'special' : 'place',
            payment_channel: 'online',
            source: 'plaid',
            type: template.type
          });
        }
      }
    }

    return transactions.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Kategorie-ID Mapping (Plaid-kompatibel)
   */
  getCategoryId(plaidCategory) {
    const mapping = {
      'Food and Drink': '13000000',
      'Transfer': '21000000',
      'Entertainment': '17000000',
      'Travel': '22000000',
      'Health': '14000000',
      'Shopping': '19000000',
      'Payment': '20000000'
    };
    return mapping[plaidCategory] || '10000000';
  }
}

/**
 * Konfiguriert einen neuen Plaid-Client
 */
export function createPlaidConfig(overrides = {}) {
  return {
    env: overrides.env || PLAID_ENV.sandbox,
    clientId: overrides.clientId || null,
    secret: overrides.secret || null,
    products: overrides.products || PLAID_PRODUCTS,
    countryCodes: overrides.countryCodes || PLAID_COUNTRY_CODES,
    ...overrides
  };
}

/**
 * Konvertiert Plaid-Transaktionen ins interne Format
 */
export function normalizePlaidTransactions(plaidTransactions) {
  return plaidTransactions.map((t) => ({
    date: t.date,
    description: t.name || t.merchant_name || 'Unbekannt',
    amount: typeof t.amount === 'number' ? t.amount : parseFloat(t.amount),
    category: t.type || (Array.isArray(t.category) ? t.category[1] : 'other'),
    source: 'plaid',
    accountId: t.account_id,
    transactionId: t.transaction_id,
    currency: t.iso_currency_code || 'EUR',
    pending: t.pending || false
  }));
}

/**
 * Validiert Plaid-Konfiguration
 */
export function validatePlaidConfig(config) {
  const errors = [];

  if (!config.env || !Object.values(PLAID_ENV).includes(config.env)) {
    errors.push('Gültige Plaid-Umgebung erforderlich (sandbox/development/production)');
  }

  if (!config.products || config.products.length === 0) {
    errors.push('Mindestens ein Plaid-Produkt erforderlich');
  }

  if (!config.countryCodes || config.countryCodes.length === 0) {
    errors.push('Mindestens ein Ländercode erforderlich');
  }

  return {
    valid: errors.length === 0,
    errors,
    isMock: !config.clientId || !config.secret
  };
}

/**
 * Factory: Erstellt einen Plaid-Client aus Umgebungsvariablen
 */
export function createPlaidClientFromEnv() {
  return new PlaidClient({
    clientId: process.env.PLAID_CLIENT_ID,
    secret: process.env.PLAID_SECRET,
    env: process.env.PLAID_ENV || PLAID_ENV.sandbox,
    products: process.env.PLAID_PRODUCTS
      ? process.env.PLAID_PRODUCTS.split(',')
      : PLAID_PRODUCTS,
    countryCodes: process.env.PLAID_COUNTRY_CODES
      ? process.env.PLAID_COUNTRY_CODES.split(',')
      : PLAID_COUNTRY_CODES
  });
}
