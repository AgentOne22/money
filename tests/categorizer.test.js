import { describe, it, expect } from 'vitest';
import { categorize, categorizeBatch, getCategoryInfo, getAllCategories } from '$lib/categorizer';

describe('Categorizer', () => {
  it('categorizes Gehalt as income', () => {
    expect(categorize('Gehalt Jana GmbH')).toBe('income');
  });

  it('categorizes REWE as groceries', () => {
    expect(categorize('Einkauf REWE Markt')).toBe('groceries');
  });

  it('categorizes Shell as transport', () => {
    expect(categorize('Shell Tankstelle')).toBe('transport');
  });

  it('categorizes Netflix as entertainment', () => {
    expect(categorize('Netflix Abo')).toBe('entertainment');
  });

  it('categorizes Amazon as shopping', () => {
    expect(categorize('Amazon.de')).toBe('shopping');
  });

  it('categorizes Apotheke as health', () => {
    expect(categorize('Apotheke am Markt')).toBe('health');
  });

  it('categorizes Miete as rent', () => {
    expect(categorize('Miete Januar')).toBe('rent');
  });

  it('categorizes Lidl as groceries', () => {
    expect(categorize('Lidl')).toBe('groceries');
  });

  it('categorizes Aldi as groceries', () => {
    expect(categorize('Aldi Süd')).toBe('groceries');
  });

  it('categorizes McDonalds as food', () => {
    expect(categorize('McDonalds Berlin')).toBe('food');
  });

  it('returns "other" for unknown description', () => {
    expect(categorize('XYZ Unknown')).toBe('other');
  });

  it('categorizes batch of transactions', () => {
    const transactions = [
      { description: 'Gehalt', amount: 3000 },
      { description: 'REWE', amount: -50 },
      { description: 'Unknown', amount: -10 }
    ];
    const result = categorizeBatch(transactions);
    expect(result[0].category).toBe('income');
    expect(result[1].category).toBe('groceries');
    expect(result[2].category).toBe('other');
  });

  it('preserves existing categories', () => {
    const transactions = [
      { description: 'Test', amount: 10, category: 'food' }
    ];
    const result = categorizeBatch(transactions);
    expect(result[0].category).toBe('food');
  });

  it('returns category info with color', () => {
    const info = getCategoryInfo('food');
    expect(info).toMatchObject({
      id: 'food',
      name: 'Essen & Trinken',
      color: '#f97316'
    });
  });

  it('returns all categories', () => {
    const categories = getAllCategories();
    expect(categories.length).toBeGreaterThan(10);
    expect(categories[0]).toHaveProperty('id');
    expect(categories[0]).toHaveProperty('name');
    expect(categories[0]).toHaveProperty('color');
  });

  it('handles empty description', () => {
    expect(categorize('')).toBe('other');
    expect(categorize(null)).toBe('other');
    expect(categorize(undefined)).toBe('other');
  });
});
