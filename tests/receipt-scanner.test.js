import { describe, it, expect } from 'vitest';
import {
  parseReceiptText,
  toTransaction,
  extractMerchant,
  extractTotal,
  extractDate,
  extractCurrency,
  extractItems,
  determineCategory,
  parseAmount,
  normalizeDate
} from '../src/lib/receipt-scanner';

describe('Receipt Scanner - parseAmount', () => {
  it('parses German format with comma', () => {
    expect(parseAmount('12,50')).toBe(12.5);
    expect(parseAmount('1.234,56')).toBe(1234.56);
  });

  it('parses English format with dot', () => {
    expect(parseAmount('12.50')).toBe(12.5);
    expect(parseAmount('1,234.56')).toBe(1234.56);
  });

  it('handles currency symbols', () => {
    expect(parseAmount('12,50 €')).toBe(12.5);
    expect(parseAmount('$12.50')).toBe(12.5);
  });

  it('returns 0 for invalid input', () => {
    expect(parseAmount('abc')).toBe(0);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount(null)).toBe(0);
  });
});

describe('Receipt Scanner - normalizeDate', () => {
  it('normalizes German DD.MM.YYYY format', () => {
    expect(normalizeDate('15.03.2026')).toBe('2026-03-15');
    expect(normalizeDate('1.1.2025')).toBe('2025-01-01');
  });

  it('normalizes DD/MM/YYYY format', () => {
    expect(normalizeDate('15/03/2026')).toBe('2026-03-15');
  });

  it('keeps ISO format', () => {
    expect(normalizeDate('2026-03-15')).toBe('2026-03-15');
  });

  it('expands 2-digit year', () => {
    expect(normalizeDate('15.03.26')).toBe('2026-03-15');
  });

  it('returns today for invalid input', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(normalizeDate('invalid')).toBe(today);
    expect(normalizeDate(null)).toBe(today);
  });
});

describe('Receipt Scanner - extractCurrency', () => {
  it('detects EUR', () => {
    expect(extractCurrency('Preis: 12,50 €')).toBe('EUR');
    expect(extractCurrency('Betrag: 100 EUR')).toBe('EUR');
    expect(extractCurrency('50 Euro')).toBe('EUR');
  });

  it('detects USD', () => {
    expect(extractCurrency('Price: $12.50')).toBe('USD');
    expect(extractCurrency('Amount: 100 USD')).toBe('USD');
  });

  it('detects GBP', () => {
    expect(extractCurrency('Price: £12.50')).toBe('GBP');
    expect(extractCurrency('Amount: 100 GBP')).toBe('GBP');
  });

  it('defaults to EUR', () => {
    expect(extractCurrency('Preis: 12.50')).toBe('EUR');
  });
});

describe('Receipt Scanner - extractMerchant', () => {
  it('recognizes REWE', () => {
    expect(extractMerchant('REWE Markt Müller', ['REWE', 'Preis: 10€'])).toBe('REWE');
  });

  it('recognizes EDEKA', () => {
    expect(extractMerchant('EDEKA Schmidt', ['EDEKA', '12,50€'])).toBe('EDEKA');
  });

  it('recognizes LIDL', () => {
    expect(extractMerchant('LIDL Vertriebs GmbH', ['LIDL'])).toBe('LIDL');
  });

  it('recognizes Shell', () => {
    expect(extractMerchant('Shell Tankstelle', ['Shell', 'Benzin'])).toBe('Shell');
  });

  it('falls back to first meaningful line', () => {
    const lines = ['Supermarkt Schmidt', 'Gesamt: 12,50', 'Vielen Dank'];
    expect(extractMerchant('Belegtext', lines)).toBe('Supermarkt Schmidt');
  });

  it('returns unknown when no match', () => {
    expect(extractMerchant('xyz', [])).toBe('Unbekannt');
  });
});

describe('Receipt Scanner - extractTotal', () => {
  it('extracts total with Gesamt', () => {
    expect(extractTotal('Gesamt: 12,50')).toBe(12.5);
    expect(extractTotal('Gesamtbetrag 123,45 EUR')).toBe(123.45);
  });

  it('extracts total with Summe', () => {
    expect(extractTotal('Summe: 8,99')).toBe(8.99);
  });

  it('extracts total with Total', () => {
    expect(extractTotal('Total 45,00')).toBe(45);
  });

  it('extracts largest amount if no keyword', () => {
    expect(extractTotal('2,50 5,99 12,50')).toBe(12.5);
  });

  it('returns 0 for no amounts', () => {
    expect(extractTotal('Kein Betrag')).toBe(0);
  });
});

describe('Receipt Scanner - extractDate', () => {
  it('extracts German date format', () => {
    expect(extractDate('Datum: 15.03.2026')).toBe('2026-03-15');
  });

  it('extracts ISO date', () => {
    expect(extractDate('2026-03-15 14:30')).toBe('2026-03-15');
  });

  it('returns today for no match', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(extractDate('Kein Datum')).toBe(today);
  });
});

describe('Receipt Scanner - extractItems', () => {
  it('extracts items with amounts', () => {
    const lines = [
      'Brot 3,50',
      'Milch 1,99',
      'Gesamt 5,49'
    ];
    const items = extractItems(lines);
    
    expect(items.length).toBe(2);
    expect(items[0]).toMatchObject({ description: 'Brot', amount: 3.5 });
    expect(items[1]).toMatchObject({ description: 'Milch', amount: 1.99 });
  });

  it('ignores summary lines', () => {
    const lines = [
      'Artikel 1 10,00',
      'Gesamt 10,00',
      'Bar 10,00'
    ];
    const items = extractItems(lines);
    
    expect(items.length).toBe(1);
    expect(items[0].description).toBe('Artikel 1');
  });

  it('handles single char descriptions', () => {
    const lines = ['X 5,00', 'Langer Text 10,00'];
    const items = extractItems(lines);
    expect(items.length).toBe(1);
  });
});

describe('Receipt Scanner - determineCategory', () => {
  it('returns groceries for REWE', () => {
    expect(determineCategory({ merchant: 'REWE', rawText: '' })).toBe('groceries');
  });

  it('returns transport for Shell', () => {
    expect(determineCategory({ merchant: 'Shell', rawText: '' })).toBe('transport');
  });

  it('returns food for McDonalds', () => {
    expect(determineCategory({ merchant: 'McDonalds', rawText: '' })).toBe('food');
  });

  it('returns entertainment for Netflix', () => {
    expect(determineCategory({ merchant: 'Netflix', rawText: '' })).toBe('entertainment');
  });

  it('returns other for unknown', () => {
    expect(determineCategory({ merchant: 'XYZ Unbekannt', rawText: '' })).toBe('other');
  });

  it('searches raw text if merchant unknown', () => {
    expect(determineCategory({ merchant: 'Unbekannt', rawText: 'EDEKA Markt' })).toBe('groceries');
  });
});

describe('Receipt Scanner - parseReceiptText', () => {
  it('parses complete OCR result', () => {
    const ocrResult = {
      text: 'REWE Markt\nBrot 3,50\nMilch 1,99\nGesamt 5,49 EUR\nDatum: 15.03.2026\n14:30',
      confidence: 85,
      lines: [],
      words: []
    };
    
    const parsed = parseReceiptText(ocrResult);
    
    expect(parsed.merchant).toBe('REWE');
    expect(parsed.total).toBe(5.49);
    expect(parsed.date).toBe('2026-03-15');
    expect(parsed.time).toBe('14:30');
    expect(parsed.currency).toBe('EUR');
    expect(parsed.category).toBe('groceries');
    expect(parsed.items.length).toBe(2);
  });

  it('handles minimal OCR result', () => {
    const ocrResult = {
      text: 'Bäcker\nBrötchen 2,50',
      confidence: 70,
      lines: [],
      words: []
    };
    
    const parsed = parseReceiptText(ocrResult);
    
    expect(parsed.merchant).toBe('Bäcker');
    expect(parsed.total).toBe(2.5);
    expect(parsed.currency).toBe('EUR');
    expect(parsed.category).toBe('other');
  });

  it('returns null for empty result', () => {
    expect(parseReceiptText(null)).toBeNull();
    expect(parseReceiptText({})).toBeNull();
    expect(parseReceiptText({ text: '' })).toBeNull();
  });

  it('includes confidence in result', () => {
    const ocrResult = {
      text: 'Test 10,00',
      confidence: 92,
      lines: [],
      words: []
    };
    
    const parsed = parseReceiptText(ocrResult);
    expect(parsed.confidence).toBe(92);
  });
});

describe('Receipt Scanner - toTransaction', () => {
  it('converts parsed receipt to transaction', () => {
    const parsed = {
      merchant: 'REWE',
      total: 5.49,
      date: '2026-03-15',
      time: '14:30',
      currency: 'EUR',
      tax: null,
      category: 'groceries',
      items: [{ description: 'Brot', amount: 3.5 }],
      confidence: 85,
      rawText: 'REWE...'
    };
    
    const transaction = toTransaction(parsed);
    
    expect(transaction.description).toBe('REWE');
    expect(transaction.amount).toBe(-5.49); // Expenses are negative
    expect(transaction.date).toBe('2026-03-15');
    expect(transaction.time).toBe('14:30');
    expect(transaction.currency).toBe('EUR');
    expect(transaction.category).toBe('groceries');
    expect(transaction.source).toBe('receipt');
    expect(transaction.confidence).toBe(85);
  });

  it('makes total negative even if positive', () => {
    const parsed = {
      merchant: 'Test',
      total: 10,
      date: '2026-03-15',
      currency: 'EUR',
      category: 'other',
      confidence: 0
    };
    
    const transaction = toTransaction(parsed);
    expect(transaction.amount).toBe(-10);
  });

  it('generates unique IDs', () => {
    const parsed = {
      merchant: 'Test',
      total: 10,
      date: '2026-03-15',
      currency: 'EUR',
      category: 'other',
      confidence: 0
    };
    
    const t1 = toTransaction(parsed);
    const t2 = toTransaction(parsed);
    
    expect(t1.id).not.toBe(t2.id);
  });

  it('returns null for undefined input', () => {
    expect(toTransaction(null)).toBeNull();
  });

  it('merges custom options', () => {
    const parsed = {
      merchant: 'Test',
      total: 10,
      date: '2026-03-15',
      currency: 'EUR',
      category: 'other',
      confidence: 0
    };
    
    const transaction = toTransaction(parsed, { sharedAccountId: 'shared_123' });
    expect(transaction.sharedAccountId).toBe('shared_123');
  });

  it('includes items array', () => {
    const parsed = {
      merchant: 'Test',
      total: 100,
      date: '2026-03-15',
      currency: 'EUR',
      category: 'food',
      items: [
        { description: 'Pizza', amount: 12.50 },
        { description: 'Pasta', amount: 9.50 }
      ],
      confidence: 80
    };
    
    const transaction = toTransaction(parsed);
    expect(transaction.items.length).toBe(2);
    expect(transaction.items[0].description).toBe('Pizza');
  });
});
