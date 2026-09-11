/**
 * Receipt Scanner: OCR für Quittungen & Fotos
 * 
 * Nutzt tesseract.js für Texterkennung und extrahiert
 * automatisch Betrag, Datum, Händler und Kategorie.
 */

import { createWorker } from 'tesseract.js';
import { categorize } from './categorizer.js';

// Deutsche Währungssymbole und Formate
const CURRENCY_PATTERNS = {
  EUR: /€|EUR|Euro/i,
  USD: /\$|USD|Dollar/i,
  GBP: /£|GBP|Pfund/i,
  CHF: /CHF|Franken/i
};

// Häufige deutsche Receipt-Header
const RECEIPT_PATTERNS = {
  total: /(?:Gesamt|Summe|Total|Endbetrag|Zahlen|Bar|EC-Karte|Mastercard|Visa)[\s:]*([0-9]+[.,][0-9]{2})/i,
  date: /(\d{1,2}[./]\d{1,2}[./]\d{2,4})|(\d{4}-\d{2}-\d{2})/,
  time: /(\d{1,2}[:]\d{2})/,
  tax: /(?:MwSt|USt|Umsatzsteuer|Steuer)[\s:]*([0-9]+[.,][0-9]{2})/i,
  cashGiven: /(?:Bar|Bargeld)[\s:]*([0-9]+[.,][0-9]{2})/i,
  change: /(?:Rückgeld|Wechselgeld|Change)[\s:]*([0-9]+[.,][0-9]{2})/i
};

// Bekannte deutsche Händler
const KNOWN_MERCHANTS = [
  { name: 'REWE', pattern: /rewe/i, category: 'groceries' },
  { name: 'EDEKA', pattern: /edeka/i, category: 'groceries' },
  { name: 'LIDL', pattern: /lidl/i, category: 'groceries' },
  { name: 'ALDI', pattern: /aldi/i, category: 'groceries' },
  { name: 'NETTO', pattern: /netto/i, category: 'groceries' },
  { name: 'KAUFLAND', pattern: /kaufland/i, category: 'groceries' },
  { name: 'PENNY', pattern: /penny/i, category: 'groceries' },
  { name: 'DM', pattern: /\bdm\b|dm-drogerie/i, category: 'health' },
  { name: 'ROSSMANN', pattern: /rossmann/i, category: 'health' },
  { name: 'Müller', pattern: /müller/i, category: 'health' },
  { name: 'IKEA', pattern: /ikea/i, category: 'shopping' },
  { name: 'H&M', pattern: /h\s*&\s*m/i, category: 'shopping' },
  { name: 'ZALANDO', pattern: /zalando/i, category: 'shopping' },
  { name: 'AMAZON', pattern: /amazon/i, category: 'shopping' },
  { name: 'Shell', pattern: /shell/i, category: 'transport' },
  { name: 'Aral', pattern: /aral/i, category: 'transport' },
  { name: 'JET', pattern: /\bjet\b/i, category: 'transport' },
  { name: 'McDonalds', pattern: /mcdonalds|mcdonald/i, category: 'food' },
  { name: 'Burger King', pattern: /burger\s*king/i, category: 'food' },
  { name: 'Starbucks', pattern: /starbucks/i, category: 'food' },
  { name: 'Backwerk', pattern: /backwerk/i, category: 'food' },
  { name: 'Döner', pattern: /döner|doener|kebab/i, category: 'food' },
  { name: 'Apotheke', pattern: /apotheke/i, category: 'health' },
  { name: 'Mediamarkt', pattern: /mediamarkt/i, category: 'shopping' },
  { name: 'Saturn', pattern: /saturn/i, category: 'shopping' },
  { name: 'Otto', pattern: /otto/i, category: 'shopping' },
  { name: 'Deutsche Bahn', pattern: /deutsche\s*bahn|db\s*bahnhof/i, category: 'transport' },
  { name: 'VBB', pattern: /\bvbb\b/i, category: 'transport' },
  { name: 'BVG', pattern: /\bbvg\b/i, category: 'transport' },
  { name: 'Netflix', pattern: /netflix/i, category: 'entertainment' },
  { name: 'Spotify', pattern: /spotify/i, category: 'entertainment' },
  { name: 'Eventim', pattern: /eventim/i, category: 'entertainment' },
  { name: 'Cineplex', pattern: /cineplex/i, category: 'entertainment' },
  { name: 'Cinema', pattern: /kino|cinema/i, category: 'entertainment' }
];

/**
 * Initialisiert den OCR Worker
 */
let worker = null;
let workerReady = false;

export async function initOCR(lang = 'deu+eng') {
  if (worker && workerReady) return worker;
  
  try {
    worker = await createWorker(lang);
    workerReady = true;
    return worker;
  } catch (error) {
    console.error('OCR Worker konnte nicht initialisiert werden:', error);
    throw new Error('OCR Engine nicht verfügbar');
  }
}

/**
 * Führt OCR auf einem Bild durch
 */
export async function scanReceipt(imageSource) {
  const ocrWorker = await initOCR();
  
  try {
    const result = await ocrWorker.recognize(imageSource);
    return {
      text: result.data.text,
      confidence: result.data.confidence,
      lines: result.data.lines?.map(l => ({
        text: l.text,
        confidence: l.confidence,
        bbox: l.bbox
      })) || [],
      words: result.data.words?.map(w => ({
        text: w.text,
        confidence: w.confidence,
        bbox: w.bbox
      })) || []
    };
  } catch (error) {
    console.error('OCR Fehler:', error);
    throw new Error('Texterkennung fehlgeschlagen');
  }
}

/**
 * Extrahiert Transaktionsdaten aus OCR-Text
 */
export function parseReceiptText(ocrResult) {
  if (!ocrResult || !ocrResult.text) {
    return null;
  }
  
  const text = ocrResult.text;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const extracted = {
    merchant: extractMerchant(text, lines),
    total: extractTotal(text),
    date: extractDate(text),
    time: extractTime(text),
    tax: extractTax(text),
    currency: extractCurrency(text),
    items: extractItems(lines),
    category: 'other',
    rawText: text,
    confidence: ocrResult.confidence || 0
  };
  
  // Kategorie basierend auf Händler oder Textinhalt
  extracted.category = determineCategory(extracted);
  
  return extracted;
}

/**
 * Extrahiert den Händlernamen
 */
export function extractMerchant(text, lines) {
  // Bekannte Händler suchen
  for (const merchant of KNOWN_MERCHANTS) {
    if (merchant.pattern.test(text)) {
      return merchant.name;
    }
  }
  
  // Heuristik: Erste nicht-numerische Zeile ist oft der Händler
  for (const line of lines) {
    if (line.length > 2 && 
        !RECEIPT_PATTERNS.total.test(line) &&
        !RECEIPT_PATTERNS.date.test(line) &&
        !RECEIPT_PATTERNS.time.test(line) &&
        !/^\d/.test(line) &&
        !/^(Tel|IBAN|USt|Steuernr|MWST)/i.test(line)) {
      return line;
    }
  }
  
  return 'Unbekannt';
}

/**
 * Extrahiert den Gesamtbetrag
 */
export function extractTotal(text) {
  // Suche nach Gesamt/Summe/Total
  const totalMatch = text.match(RECEIPT_PATTERNS.total);
  if (totalMatch && totalMatch[1]) {
    return parseAmount(totalMatch[1]);
  }
  
  // Suche nach dem größten Betrag im Text (oft der Gesamtbetrag)
  const amounts = text.match(/[0-9]+[.,][0-9]{2}/g);
  if (amounts && amounts.length > 0) {
    const parsed = amounts.map(a => parseAmount(a));
    return Math.max(...parsed);
  }
  
  return 0;
}

/**
 * Extrahiert das Datum
 */
export function extractDate(text) {
  const dateMatch = text.match(RECEIPT_PATTERNS.date);
  if (dateMatch) {
    const dateStr = dateMatch[0];
    return normalizeDate(dateStr);
  }
  
  return new Date().toISOString().split('T')[0];
}

/**
 * Extrahiert die Uhrzeit
 */
function extractTime(text) {
  const timeMatch = text.match(RECEIPT_PATTERNS.time);
  if (timeMatch) {
    return timeMatch[1];
  }
  return null;
}

/**
 * Extrahiert die Steuer
 */
function extractTax(text) {
  const taxMatch = text.match(RECEIPT_PATTERNS.tax);
  if (taxMatch && taxMatch[1]) {
    return parseAmount(taxMatch[1]);
  }
  return null;
}

/**
 * Extrahiert die Währung
 */
export function extractCurrency(text) {
  for (const [currency, pattern] of Object.entries(CURRENCY_PATTERNS)) {
    if (pattern.test(text)) {
      return currency;
    }
  }
  return 'EUR'; // Standard
}

/**
 * Extrahiert einzelne Positionen
 */
export function extractItems(lines) {
  const items = [];
  
  for (const line of lines) {
    // Suche nach Zeilen mit Betrag am Ende
    const itemMatch = line.match(/^(.+?)\s+([0-9]+[.,][0-9]{2})\s*$/);
    if (itemMatch) {
      const description = itemMatch[1].trim();
      const amount = parseAmount(itemMatch[2]);
      
      // Filtere Summen- und Header-Zeilen
      if (!/^(Gesamt|Summe|Total|Bar|Steuer|MwSt|USt|Zahlen)/i.test(description) &&
          description.length > 1) {
        items.push({
          description,
          amount,
          quantity: 1
        });
      }
    }
  }
  
  return items;
}

/**
 * Bestimmt die Kategorie basierend auf Händler und Text
 */
export function determineCategory(extracted) {
  // Bekannte Händler durchsuchen
  for (const merchant of KNOWN_MERCHANTS) {
    if (merchant.pattern.test(extracted.merchant) || merchant.pattern.test(extracted.rawText)) {
      return merchant.category;
    }
  }
  
  // KI-Kategorisierung basierend auf Händlername
  return categorize(extracted.merchant);
}

/**
 * Parst einen Betrag (deutsches Format mit Komma)
 */
export function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  // Entferne Währungssymbole
  const cleaned = amountStr.replace(/[€$£]/g, '').trim();
  
  // Deutsches Format: 1.234,56 -> 1234.56
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // Komma ist Dezimaltrennzeichen
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      // Punkt ist Dezimaltrennzeichen
      return parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
  } else if (cleaned.includes(',')) {
    // Nur Komma - deutsches Dezimalformat
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }
  
  return parseFloat(cleaned) || 0;
}

/**
 * Normalisiert ein Datum in ISO-Format
 */
export function normalizeDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // ISO-Format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Deutsches Format: DD.MM.YYYY oder DD.MM.YY
  const deMatch = dateStr.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (deMatch) {
    let day = deMatch[1].padStart(2, '0');
    let month = deMatch[2].padStart(2, '0');
    let year = deMatch[3];
    
    if (year.length === 2) {
      year = '20' + year;
    }
    
    return `${year}-${month}-${day}`;
  }
  
  return new Date().toISOString().split('T')[0];
}

/**
 * Konvertiert geparste Daten in eine Transaktion
 */
export function toTransaction(parsedReceipt, options = {}) {
  if (!parsedReceipt) return null;
  
  return {
    id: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: parsedReceipt.date,
    time: parsedReceipt.time,
    description: parsedReceipt.merchant,
    amount: -Math.abs(parsedReceipt.total), // Ausgaben sind negativ
    category: parsedReceipt.category,
    source: 'receipt',
    currency: parsedReceipt.currency || 'EUR',
    tax: parsedReceipt.tax,
    items: parsedReceipt.items,
    confidence: parsedReceipt.confidence,
    rawText: parsedReceipt.rawText,
    createdAt: new Date().toISOString(),
    ...options
  };
}

/**
 * Vollständiger Scan-Prozess: Bild -> Transaktion
 */
export async function scanToTransaction(imageSource, options = {}) {
  const ocrResult = await scanReceipt(imageSource);
  const parsed = parseReceiptText(ocrResult);
  
  if (!parsed) {
    throw new Error('Keine Daten auf dem Beleg gefunden');
  }
  
  return toTransaction(parsed, options);
}

/**
 * Batch-Scan mehrerer Bilder
 */
export async function scanMultiple(imageSources, options = {}) {
  const results = [];
  
  for (const source of imageSources) {
    try {
      const transaction = await scanToTransaction(source, options);
      results.push({ success: true, transaction });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Beendet den OCR Worker
 */
export async function terminateOCR() {
  if (worker) {
    await worker.terminate();
    worker = null;
    workerReady = false;
  }
}

/**
 * Prüft ob OCR verfügbar ist
 */
export function isOCREnabled() {
  return workerReady;
}

/**
 * Gibt OCR-Statistiken zurück
 */
export function getOCRStats() {
  return {
    ready: workerReady,
    hasWorker: !!worker
  };
}
