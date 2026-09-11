import { describe, it, expect } from 'vitest';
import {
  SWISS_VAT_RATES,
  SWISS_FEDERAL_TAX_BRACKETS,
  generateVATReport,
  generateIncomeTaxReport,
  exportVATToCSV,
  exportIncomeTaxToCSV,
  exportVATToPDF,
  exportIncomeTaxToPDF
} from '$lib/tax';

describe('Tax - VAT Report', () => {
  const transactions = [
    { date: '2026-01-05', description: 'Verkauf Produkt A', amount: 1000, category: 'income' },
    { date: '2026-01-10', description: 'Verkauf Produkt B', amount: 2500, category: 'income' },
    { date: '2026-02-15', description: 'Büromaterial', amount: -150, category: 'office' },
    { date: '2026-02-20', description: 'Software-Lizenz', amount: -299, category: 'software' },
    { date: '2026-03-01', description: 'Verkauf Produkt C', amount: 1800, category: 'income' },
    { date: '2026-03-10', description: 'Bewirtung', amount: -120, category: 'entertainment' },
  ];

  it('generates VAT report for Q1', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    expect(report.type).toBe('VAT');
    expect(report.year).toBe(2026);
    expect(report.quarter).toBe(1);
    expect(report.vatRate).toBe(SWISS_VAT_RATES.standard);
  });

  it('calculates turnover correctly', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    expect(report.turnover.total).toBe(5300); // 1000 + 2500 + 1800
  });

  it('calculates VAT on turnover', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    // 5300 * (8.1 / 108.1) ≈ 397.13
    expect(report.vat.onTurnover).toBeGreaterThan(350);
    expect(report.vat.onTurnover).toBeLessThan(450);
  });

  it('calculates VAT on expenses', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    // (150 + 299 + 120) * (8.1 / 108.1) ≈ 42.08
    expect(report.vat.onExpenses).toBeGreaterThan(30);
    expect(report.vat.onExpenses).toBeLessThan(60);
  });

  it('calculates net VAT payable', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    const expectedNet = report.vat.onTurnover - report.vat.onExpenses;
    expect(report.vat.netPayable).toBeCloseTo(expectedNet, 2);
  });

  it('groups by category', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    expect(report.byCategory.income).toBeDefined();
    expect(report.byCategory.income.count).toBe(3);
    expect(report.byCategory.office).toBeDefined();
    expect(report.byCategory.software).toBeDefined();
  });

  it('counts transactions correctly', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    expect(report.transactions.incoming).toBe(3);
    expect(report.transactions.outgoing).toBe(3);
    expect(report.transactions.total).toBe(6);
  });

  it('generates correct period label', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    expect(report.periodLabel).toBe('Q1 2026');
  });
});

describe('Tax - Income Tax Report', () => {
  const transactions = [
    { date: '2026-01-01', description: 'Gehalt Januar', amount: 5000, category: 'income' },
    { date: '2026-02-01', description: 'Gehalt Februar', amount: 5000, category: 'income' },
    { date: '2026-03-01', description: 'Gehalt März', amount: 5000, category: 'income' },
    { date: '2026-04-01', description: 'Gehalt April', amount: 5000, category: 'income' },
    { date: '2026-05-01', description: 'Gehalt Mai', amount: 5000, category: 'income' },
    { date: '2026-06-01', description: 'Gehalt Juni', amount: 5000, category: 'income' },
    { date: '2026-07-01', description: 'Gehalt Juli', amount: 5000, category: 'income' },
    { date: '2026-08-01', description: 'Gehalt August', amount: 5000, category: 'income' },
    { date: '2026-09-01', description: 'Gehalt September', amount: 5000, category: 'income' },
    { date: '2026-10-01', description: 'Gehalt Oktober', amount: 5000, category: 'income' },
    { date: '2026-11-01', description: 'Gehalt November', amount: 5000, category: 'income' },
    { date: '2026-12-01', description: 'Gehalt Dezember', amount: 5000, category: 'income' },
    { date: '2026-06-15', description: 'Miete', amount: -1200, category: 'housing' },
    { date: '2026-06-20', description: 'Versicherung', amount: -250, category: 'insurance' },
  ];

  it('generates income tax report for 2026', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    expect(report.type).toBe('INCOME_TAX');
    expect(report.year).toBe(2026);
  });

  it('calculates gross income correctly', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    expect(report.income.gross).toBe(60000);
  });

  it('groups income by category', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    expect(report.income.byCategory.income).toBeDefined();
    expect(report.income.byCategory.income.total).toBe(60000);
  });

  it('calculates monthly income', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    expect(report.income.monthly['2026-01']).toBe(5000);
    expect(report.income.monthly['2026-12']).toBe(5000);
  });

  it('calculates deductions', () => {
    const report = generateIncomeTaxReport(transactions, 2026, {
      pillar3aContribution: 7056
    });
    expect(report.deductions.pillar3a).toBe(7056);
    expect(report.deductions.total).toBeGreaterThan(0);
  });

  it('calculates taxable income', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    expect(report.taxableIncome).toBeLessThan(report.income.gross);
    expect(report.taxableIncome).toBeGreaterThan(0);
  });

  it('calculates federal tax', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    expect(report.tax.federal).toBeGreaterThan(0);
  });

  it('calculates effective tax rate', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    expect(report.tax.effectiveRate).toBeGreaterThan(0);
    expect(report.tax.effectiveRate).toBeLessThan(50);
  });

  it('counts transactions', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    expect(report.transactions.income).toBe(12);
    expect(report.transactions.expenses).toBe(2);
  });
});

describe('Tax - VAT Export CSV', () => {
  const transactions = [
    { date: '2026-01-05', description: 'Verkauf', amount: 1000, category: 'income' },
    { date: '2026-02-15', description: 'Material', amount: -200, category: 'office' },
  ];

  it('exports VAT report to CSV', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    const csv = exportVATToCSV(report);
    expect(csv).toContain('MWST-Abrechnung');
    expect(csv).toContain('Q1 2026');
  });

  it('includes summary in CSV', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    const csv = exportVATToCSV(report);
    expect(csv).toContain('Gesamtumsatz');
    expect(csv).toContain('MWST');
  });

  it('includes category breakdown', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    const csv = exportVATToCSV(report);
    expect(csv).toContain('income');
    expect(csv).toContain('office');
  });
});

describe('Tax - Income Tax Export CSV', () => {
  const transactions = [
    { date: '2026-01-01', description: 'Gehalt', amount: 5000, category: 'income' },
  ];

  it('exports income tax report to CSV', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    const csv = exportIncomeTaxToCSV(report);
    expect(csv).toContain('Einkommensteuer-Abrechnung');
    expect(csv).toContain('Steuerjahr 2026');
  });

  it('includes income section', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    const csv = exportIncomeTaxToCSV(report);
    expect(csv).toContain('Einkommen');
    expect(csv).toContain('Bruttoeinkommen');
  });

  it('includes deductions section', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    const csv = exportIncomeTaxToCSV(report);
    expect(csv).toContain('Abzüge');
    expect(csv).toContain('Berufskosten');
  });

  it('includes tax calculation section', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    const csv = exportIncomeTaxToCSV(report);
    expect(csv).toContain('Steuerberechnung');
    expect(csv).toContain('Bundessteuer');
  });
});

describe('Tax - VAT PDF', () => {
  const transactions = [
    { date: '2026-01-05', description: 'Verkauf', amount: 1000, category: 'income' },
  ];

  it('generates valid PDF-HTML', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    const html = exportVATToPDF(report);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('MWST-Abrechnung');
  });

  it('includes VAT rate', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    const html = exportVATToPDF(report);
    expect(html).toContain('8.1%');
  });

  it('includes CHF currency', () => {
    const report = generateVATReport(transactions, { year: 2026, quarter: 1 });
    const html = exportVATToPDF(report);
    expect(html).toContain('CHF');
  });
});

describe('Tax - Income Tax PDF', () => {
  const transactions = [
    { date: '2026-01-01', description: 'Gehalt', amount: 5000, category: 'income' },
  ];

  it('generates valid PDF-HTML', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    const html = exportIncomeTaxToPDF(report);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Einkommensteuer-Abrechnung');
  });

  it('includes tax year', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    const html = exportIncomeTaxToPDF(report);
    expect(html).toContain('2026');
  });

  it('includes canton', () => {
    const report = generateIncomeTaxReport(transactions, 2026);
    const html = exportIncomeTaxToPDF(report);
    expect(html).toContain('Kanton');
  });
});

describe('Tax - Constants', () => {
  it('has correct Swiss VAT rates', () => {
    expect(SWISS_VAT_RATES.standard).toBe(8.1);
    expect(SWISS_VAT_RATES.reduced).toBe(2.5);
    expect(SWISS_VAT_RATES.accommodation).toBe(3.7);
  });

  it('has federal tax brackets', () => {
    expect(SWISS_FEDERAL_TAX_BRACKETS.length).toBeGreaterThan(0);
    expect(SWISS_FEDERAL_TAX_BRACKETS[0].rate).toBe(0);
  });
});
