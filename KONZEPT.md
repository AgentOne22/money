# Projekt Money — Konzept

Stand: 09.09.2026

## Zielsetzung

Ein minimalistisches, deutsches Finanz-Tool für den Alltag: Einnahmen & Ausgaben transparent erfassen, Ziele definieren und langfristig sparsamer werden — ohne klassische Banking-Apps, ohne Komplexität. Fokus auf Datenschutz (lokale First-Party-Analyse), keine Werbung, keine KI-Halluzinationen.

## Zielgruppe

- 18–35 Jahre, digital affine Nutzer in Deutschland
- Einsteiger in die Finanzplanung, die von Bestandskonten überfordert sind
- Wunsch nach Kontrolle, ohne alle Finanzdaten an einen Anbieter zu geben
- Mobil- und web-first, aber nicht abhängig von Bank-Credentials (CSV/beliebige Imports)

## Umsetzungsidee

### Kernprodukt
Finanz-Tracker mit drei Säulen:
1. **Transaktionen** — manuell oder per CSV-Import (Bank- und Wallet-Statements)
2. **Budgets & Ziele** — monatliche Budgets, Sparziele mit Fortschrittsanzeige
3. **Auswertungen** — einfache Charts (BIP/Berliner Impulsgrafik-Analogie: klare, einprägsame Balken)

### Technische Umsetzung (MVP)
- **Frontend:** SvelteKit + TailwindCSS (deutsch, offline-first via Service Worker)
- **Backend:** Pocketbase (selbst gehostet, SQLite-basiert) als Headless-API
- **Auth:** Email + Passwort (kein Tracking, kein Telefon)
- **Banking-Anbindung:** Manuelle CSV-Imports (DKB, Comdirect, N26, Revolut), später ggf. via FinTS (Open-Banking-konform, DE-Typ-3-Zugang)

### Scope (MVP)
- Transaktion erfassen, kategorisieren, löschen
- Transaktionen importieren (CSV-Vorlage + Drag & Drop)
- Monatsbudget pro Kategorie definieren
- Sparziel mit Prozentsatz-Anzeige
- Jahresvergleich (Ausgaben/ Einnahmen)
- Web-App, PWA (Android/iOS-Install)

### Scope (nicht im MVP)
- Echtzeit-Banking-Anbindung (FinTS)
- KI-gestützte Kaufempfehlungen
- Community-Features
- Steuereken-Export
- Anlagetracking

## Meilensteine

| Nr | Meilenstein               | Scope                  | Owner       | Deadline (Prognose) |
|----|---------------------------|------------------------|-------------|----------------------|
| M1 | Projekt-Setup & Wireframes| Repo, Tech-Stack, Figma | builder     | 16.09.2026           |
| M2 | Kern-Frontend (Transaktionen) | SvelteKit + Tailwind + erster Screen | builder | 30.09.2026 |
| M3 | Backend (Pocketbase API)  | Auth, DB-Schema, REST-Endpunkte | builder     | 07.10.2026           |
| M4 | CSV-Import + Kategorisierung | Parser + Mapping       | builder     | 14.10.2026           |
| M5 | Budgets & Ziele           | UI + Logik            | builder     | 21.10.2026           |
| M6 | Auswertungen / Charts     | Balken/Donut-Charts   | builder     | 28.10.2026           |
| M7 | PWA + Deployment          | Selfhost, CI/CD       | builder     | 04.11.2026           |
| M8 | Beta-Launch (3 User)      | Testphase mit Freunden | builder + 3 Tester | 11.11.2026     |

## Quellen

- [10 Best Fintech Apps For Personal Finance In 2026](https://www.fin3go.com/best-fintech-apps-for-personal-finance/)
- [Fintech Trends 2026](https://www.innreg.com/blog/fintech-trends-2026)
- [Fintech Companies in Germany](https://www.f6s.com/companies/fintech/germany/co)
- [How to Build a Personal Finance App](https://www.mindinventory.com/blog/personal-finance-app-development-guide/)

## Nächste Schritte

1. Figma-Wireframes erstellen (M1)
2. GitHub-Repo initialisieren
3. SvelteKit + Tailwind bootstrappen

Dokument: KONZEPT.md im Projektordner /home/mica/dev/money/