import { describe, it, expect } from 'vitest';
import { parseCSV, detectFormat, BANK_FORMATS } from '$lib/csv';

// DKB format: header lines then semicolon-delimited data
const SAMPLE_DKB = `Umsätze Girokonto;;;;
;;;;;;
Buchungstag;Wertstellung;Auftraggeber;Verwendungszweck;BIC;IBAN;Währung;Umsatz;;;;
01.01.2026;01.01.2026;Gehalt Firma GmbH;Gehalt Jana;;DE123;EUR;3500,00;;;;
02.01.2026;02.01.2026;REWE Markt GmbH;Einkauf REWE;;DE456;EUR;-85,43;;;;
03.01.2026;03.01.2026;Netflix;Abo Netflix;;DE789;EUR;-15,99;;;;
04.01.2026;04.01.2026;Shell Tankstelle;Tanken;;DE012;EUR;-65,00;;;;`;

// N26 format: standard CSV
const SAMPLE_N26 = `Date,Payee,Account number,Transaction type,Payment reference,Category,Amount (EUR),Amount (Foreign Currency),Type Foreign Currency,Exchange Rate
2026-01-01,Gehalt Firma GmbH,,Income,Gehalt Jana,,3500.00,,,
2026-01-02,REWE Markt GmbH,,Spending,Einkauf REWE,,-85.43,,,
2026-01-03,Netflix,,Spending,Abo Netflix,,-15.99,,,
2026-01-04,Shell Tankstelle,,Spending,Tanken,,-65.00,,,`;

describe('CSV Parser', () => {
  it('parses DKB format correctly', () => {
    const result = parseCSV(SAMPLE_DKB, 'dkb');
    expect(result).toHaveLength(4);
    expect(result[0]).toMatchObject({
      date: '2026-01-01',
      description: 'Gehalt Jana',
      amount: 3500,
      source: 'dkb'
    });
    expect(result[1]).toMatchObject({
      date: '2026-01-02',
      description: 'Einkauf REWE',
      amount: -85.43,
      source: 'dkb'
    });
  });

  it('parses N26 format correctly', () => {
    const result = parseCSV(SAMPLE_N26, 'n26');
    expect(result).toHaveLength(4);
    expect(result[0]).toMatchObject({
      date: '2026-01-01',
      description: 'Gehalt Jana',
      amount: 3500,
      source: 'n26'
    });
  });

  it('detects DKB format from content', () => {
    expect(detectFormat(SAMPLE_DKB)).toBe('dkb');
  });

  it('detects N26 format from content', () => {
    expect(detectFormat(SAMPLE_N26)).toBe('n26');
  });

  it('handles German number format (1.234,56)', () => {
    const csv = `Umsätze Girokonto;;;;
;;;;;;
Buchungstag;Wertstellung;Auftraggeber;Verwendungszweck;BIC;IBAN;Währung;Umsatz;;;;
01.01.2026;01.01.2026;Test Firma;Test;;DE123;EUR;1.234,56;;;;`;
    const result = parseCSV(csv, 'dkb');
    expect(result[0].amount).toBe(1234.56);
  });

  it('handles negative amounts', () => {
    const csv = `Umsätze Girokonto;;;;
;;;;;;
Buchungstag;Wertstellung;Auftraggeber;Verwendungszweck;BIC;IBAN;Währung;Umsatz;;;;
01.01.2026;01.01.2026;Test Firma;Test;;DE123;EUR;-50,00;;;;`;
    const result = parseCSV(csv, 'dkb');
    expect(result[0].amount).toBe(-50);
  });

  it('skips empty lines', () => {
    const csv = `Umsätze Girokonto;;;;
;;;;;;
Buchungstag;Wertstellung;Auftraggeber;Verwendungszweck;BIC;IBAN;Währung;Umsatz;;;;
01.01.2026;01.01.2026;Test Firma;Test;;DE123;EUR;10,00;;;;


02.01.2026;02.01.2026;Test2 Firma;Test2;;DE456;EUR;20,00;;;;`;
    const result = parseCSV(csv, 'dkb');
    expect(result).toHaveLength(2);
  });

  it('throws for unknown format', () => {
    expect(() => parseCSV('', 'unknown')).toThrow();
  });
});
