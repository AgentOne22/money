/**
 * Plaid API Integration für automatische Kontozugriffe
 * Unterstützt: Link Token, Account Sync, Transaction Import
 * Fallback: Mock-Modus für MVP (keine echten API-Calls ohne Credentials)
 */

export const PLAID_ENV = {
  sandbox: 'sandbox',
  development: 'development',
  production: 'production'
};

export const PLAID_PRODUCTS = ['transactions', 'auth', 'identity'];

export const PLAID_COUNTRY_CODES = ['DE', 'US', 'GB', 'FR', 'IT', 'ES', 'NL', 'BE'];

// Deutsche Banken mit Plaid-Support (vereinfacht)
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
 * Plaid Client - Mock-Modus für MVP
 * In Produktion: @plaid/node Bibliothek verwenden
 */
export class PlaidClient {
  constructor(config = {}) {
    this.clientId = config.clientId || null;
    this.secret = config.secret || null;
    this.env = config.env || PLAID_ENV.sandbox;
    this.products = config.products || PLAID_PRODUCTS;
    this.countryCodes = config.countryCodes || PLAID_COUNTRY_CODES;
    this.isMock = !this.clientId || !this.secret;
  }

  /**
   * Erstellt einen Link Token für die Bank-Auswahl
   * Mock: Gibt einen Test-Token zurück
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

    // Echter Plaid API-Call würde hier erfolgen
    // const response = await fetch(`https://${this.env}.plaid.com/link/token/create`, {...})
    return {
      success: false,
      error: 'Plaid API-Call nicht implementiert (MVP Mock-Modus aktiv)'
    };
  }

  /**
   * Tauscht Public Token gegen Access Token
   * Mock: Simuliert den Austausch
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

    return {
      success: false,
      error: 'Plaid API-Call nicht implementiert (MVP Mock-Modus aktiv)'
    };
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

    return { success: false, error: PLAID_ERRORS.CONNECTION_ERROR };
  }

  /**
   * Ruft Transaktionen ab
   * Unterstützt Cursor-basierte Pagination
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

    return { success: false, error: PLAID_ERRORS.CONNECTION_ERROR };
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
          institution_id: 'ins_109508', // ING Plaid ID
          available_products: PLAID_PRODUCTS,
          billed_products: ['transactions'],
          webhook: null,
          error: null
        }
      };
    }

    return { success: false, error: PLAID_ERRORS.CONNECTION_ERROR };
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

    return { success: false, error: PLAID_ERRORS.CONNECTION_ERROR };
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
