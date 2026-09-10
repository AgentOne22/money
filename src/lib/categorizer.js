/**
 * KI-Kategorisierung für Transaktionen
 * Keyword-basiert mit optionaler OpenAI-API
 */

export const CATEGORIES = [
  { id: 'income', name: 'Einnahmen', color: '#22c55e' },
  { id: 'food', name: 'Essen & Trinken', color: '#f97316' },
  { id: 'groceries', name: 'Lebensmittel', color: '#eab308' },
  { id: 'transport', name: 'Transport', color: '#3b82f6' },
  { id: 'rent', name: 'Miete & Nebenkosten', color: '#8b5cf6' },
  { id: 'utilities', name: 'Versicherungen', color: '#ec4899' },
  { id: 'entertainment', name: 'Freizeit & Unterhaltung', color: '#14b8a6' },
  { id: 'shopping', name: 'Shopping', color: '#f43f5e' },
  { id: 'health', name: 'Gesundheit', color: '#06b6d4' },
  { id: 'subscriptions', name: 'Abonnements', color: '#a855f7' },
  { id: 'education', name: 'Bildung', color: '#84cc16' },
  { id: 'other', name: 'Sonstiges', color: '#6b7280' }
];

const KEYWORDS = {
  income: ['gehalt', 'lohn', 'einnahmen', 'überweisung', 'gutschrift', 'einzahlung', 'lohn/gehalt'],
  food: ['restaurant', 'imbiss', 'pizza', 'burger', 'cafe', 'café', 'bäckerei', 'döner', 'sushi', 'mcdonalds', 'subway', 'backwerk', 'starbucks'],
  groceries: ['rewe', 'edeka', 'lidl', 'aldi', 'netto', 'kaufland', 'penny', 'tengelmann', 'real', 'aldi süd', 'bio', 'supermarkt', 'denns', 'basic'],
  transport: ['tankstelle', 'shell', 'aral', 'jet', 'total', 'esso', 'bahn', 'deutsche bahn', 'flixbus', 'taxi', 'uber', 'bolt', 'vbb', 'bvg', 'parken', 'parkplatz', 'parkhaus'],
  rent: ['miete', 'mietzuschuss', 'wohngeld', 'rent'],
  utilities: ['versicherung', 'haftpflicht', 'hausrat', 'kfz-versicherung', 'beitrag', 'allzur', 'deloitte', 'signal iduna', 'zurich', 'gothaer', 'debeka', 'continenc'],
  entertainment: ['netflix', 'spotify', 'amazon prime', 'disney+', 'kinos', 'kino', 'theater', 'eventim', 'ticket', 'konzert', 'oper', 'bar', 'club', 'disco'],
  shopping: ['amazon', 'zalando', 'h&m', 'mediamarkt', 'saturn', 'ikea', 'otto', 'about you', 'shein', 'nike', 'adidas', 'dm', 'rossmann', 'kaufhof', 'galeria', 'boll'],
  health: ['apotheke', 'arzt', 'praxis', 'klinik', 'krankenhaus', 'zahnarzt', 'dm-drogerie', 'logopäde', 'physio', 'krankenkasse', 'tk', 'aok', 'barmer', 'dak'],
  subscriptions: ['abo', 'subscription', 'mitgliedschaft', 'fitnessstudio', 'cleverfit', 'mcfit', 'reedir', 'monthly'],
  education: ['schule', 'universität', 'studium', 'bildung', 'kurs', 'buch', 'thalia', 'hugendubel', 'sprachkurs', 'udemy', 'coursera']
};

/**
 * Kategorisiere Transaktion anhand der Beschreibung
 */
export function categorize(description) {
  if (!description) return 'other';

  const lower = description.toLowerCase();

  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
  }

  return 'other';
}

/**
 * Batch-Kategorisierung
 */
export function categorizeBatch(transactions) {
  return transactions.map((t) => ({
    ...t,
    category: t.category || categorize(t.description)
  }));
}

/**
 * Kategorie-Info abrufen
 */
export function getCategoryInfo(categoryId) {
  return CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];
}

/**
 * Alle Kategorien abrufen
 */
export function getAllCategories() {
  return CATEGORIES;
}
