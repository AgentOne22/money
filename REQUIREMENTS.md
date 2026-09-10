# Money — Anforderungserhebung

Stand: 09.09.2026  
Projekt: Money (Minimalistischer deutscher Finanz-Tracker)  
Konzept-Basis: [KONZEPT.md](/home/mica/dev/money/KONZEPT.md)  
Zielgruppe: DE-Nutzer 18–35, Finanz-Einsteiger  
Technik: SvelteKit + TailwindCSS + Pocketbase (self-hosted, SQLite)

---

## Methodik

Jedes Feature ist bewertet mit:
- **Impact** (1–5): Wie stark beeinflusst es die Kernnutzung oder Monetarisierung?
- **Aufwand** (1–5): Geschätzter Entwicklungsaufwand (1 = gering, 5 = hoch).
- **Priorität** = Impact ÷ Aufwand (absteigend). Je höher, desto früher im MVP.

---

## Features (priorisiert)

| # | Feature | Impact | Aufwand | Priorität | Kategorie | Beschreibung |
|---|---------|--------|---------|-----------|-----------|--------------|
| 1 | **Transaktion erfassen (manuell)** | 5 | 2 | 2.50 | Transaktionen | Formular zum Erstellen von Transaktionen mit Betrag, Datum, Kategorie, Notiz. Sofort in der Liste sichtbar. |
| 2 | **Transaktion löschen & bearbeiten** | 4 | 1 | 4.00 | Transaktionen | Bestehende Transaktionen können korrigiert oder entfernt werden. Unverzichtbar für Datenqualität. |
| 3 | **Kategorisierung (automatisch + manuell)** | 5 | 3 | 1.67 | Transaktionen | Vordefinierte Kategorien (Essen, Transport, Miete, Freizeit, Einnahmen, Sonstiges). Manuelle Zuordnung bei CSV-Import. |
| 4 | **Monatsbudget pro Kategorie** | 5 | 3 | 1.67 | Budgets | Benutzer definiert ein monatliches Limit pro Kategorie. Fortschrittsbalken zeigt Verbrauch vs. Limit. |
| 5 | **Sparziel mit Fortschritt** | 5 | 3 | 1.67 | Ziele | Sparziel definieren (Betrag + Deadline). Fortschrittsanzeige in % und €-Rest. |
| 6 | **CSV-Import (DKB, N26, Revolut, Comdirect)** | 5 | 4 | 1.25 | Transaktionen | Parser für gängige deutsche Bank-CSV-Formate. Drag & Drop oder Dateiauswahl. Automatische Kategorisierung nach Mustern. |
| 7 | **Ausgaben/Einnahmen-Charts (Balkendiagramm)** | 5 | 4 | 1.25 | Auswertungen | Monatliche Übersicht als Balkendiagramm. Vergleich Vorjahr. Einfache, klare Darstellung (BIP-Analogie). |
| 8 | **Jahresvergleich (Ausgaben vs. Einnahmen)** | 4 | 3 | 1.33 | Auswertungen | Gesamtübersicht des Jahres: Summe pro Monat, Kategorien-Vergleich. Zeigt Sparfortschritt über 12 Monate. |
| 9 | **PWA (Installierbar auf Android/iOS)** | 4 | 4 | 1.00 | Plattform | Service Worker für Offline-Nutzung. Add-to-Home-Screen. Mobil-first Responsive Design mit Tailwind. |
| 10 | **Auth (Email + Passwort)** | 5 | 3 | 1.67 | Sicherheit | Registrierung, Login, Passwort-Reset über Pocketbase. Keine Telefonnummer, kein Social Login. Lokale Verschlüsselung der Datenbank. |
| 11 | **Dashboard (Übersichtsseite)** | 5 | 3 | 1.67 | Auswertungen | Erste Seite nach Login: Heutige Transaktionen, Monatsbudget-Status, Sparziel-Fortschritt, Schnellzugang zu +Transaction. |
| 12 | **GDPR-konforme Datenverwaltung** | 4 | 3 | 1.33 | Recht | Datenexport (JSON/CSV), Datenlöschung auf Wunsch, Datenschutzerklärung, Cookie-Consent (bei Analytics). |
| 13 | **Such- und Filterfunktion** | 3 | 2 | 1.50 | Transaktionen | Filter nach Datumsbereich, Kategorie, Betrag (min/max), Typ (Einnahme/Ausgabe). |
| 14 | **Benachrichtigungen (Budget-Warnung)** | 4 | 2 | 2.00 | Budgets | Push-Benachrichtigung (PWA), wenn Kategorie-Budget zu 80 % / 100 % erreicht ist. |
| 15 | **Dark Mode / Light Mode** | 2 | 1 | 2.00 | UX | Toggle zwischen Dunkel- und Hell-Design. System-Override via CSS media query. |
| 16 | **Mehrwährungsunterstützung (EUR-Standard)** | 2 | 3 | 0.67 | Transaktionen | Währungsauswahl (standardmäßig EUR). Future-proof für DE-Nutzer im Ausland. |
| 17 | **Export als PDF/CSV** | 3 | 3 | 1.00 | Auswertungen | Monats- oder Jahresbericht als CSV-Download. Optional PDF für Steuerunterlagen (geplant, nicht MVP). |
| 18 | **Wiederkehrende Transaktionen** | 3 | 3 | 1.00 | Transaktionen | Miete, Abo, Gehalt als wiederkehrende Transaktion anlegen. Automatische Erstellung monatlich. |
| 19 | **Notizen & Belege (Foto)** | 2 | 3 | 0.67 | Transaktionen | Foto von Quittungen an Transaktion anhängen. Später für Steuer-Export relevant (Scope: Post-MVP). |
| 20 | **Offline-First (Service Worker Cache)** | 4 | 4 | 1.00 | Plattform | Transaktionen auch ohne Internet möglich. Sync bei Verbindungswiederherstellung. |

---

## Tech-Stack-Anforderungen

| Komponente | Technologie | Begründung |
|------------|-------------|------------|
| Frontend | SvelteKit 5 | Komponenbasiert, schnell, SSR+för SEO, geringe Bundle-Size |
| Styling | TailwindCSS | Rapid UI-Development, konsistentes Design-System |
| Backend/API | PocketBase | Self-hosted, SQLite, REST+Realtime-API, Auth integriert |
| Datenbank | SQLite (PocketBase-intern) | Lokale First-Party-Analyse, kein Cloud-Abhängig |
| Auth | PocketBase Auth | Email+Passwort, Passwort-Reset, Session-Management |
| Charts | Chart.js (oder Svelte-Charts) | Leichtgewichtig, gut für Balken/Donut-Diagramme |
| PWA | Vite PWA Plugin | Service Worker, Manifest, Installierbarkeit |
| Hosting | Selbsthosted (Hetzner/OVH) | Datenschutzkonform, deutsche Infrastruktur |
| CI/CD | GitHub Actions | Automated testing + deployment |
| Testing | Vitest + Playwright | Unit + E2E Testing |

---

## Nicht im MVP (Post-Launch)

| Feature | Grund für Verschiebung |
|---------|----------------------|
| FinTS-Banking-Anbindung | Hoher technischer Aufwand, Bank-Zertifizierung nötig |
| KI-gestützte Empfehlungen | Verstößt gegen Datenschutz-Grundsatz; Halluzinationsrisiko |
| Community-Features | Nicht für Zielgruppe relevant; erhöht Komplexität |
| Steuerexport | Nur für Gewerbetreibende relevant, nicht für Zielgruppe |
| Anlagetracking | Neues Projekt, separate Scope |
| Beleg-Fotos | Post-MVP, wenn Steuer-Export geplant |

---

## Monetarisierung (Optionsfelder)

1. **Freemium**: Grundfunktionen kostenlos, Premium-Features (z. B. Export, Mehrwährung, Belege) als Einmalkauf oder kleine Abogebühr (€2–3/Monat).
2. **Self-Hosting**: Community-Version zum Selbstkostenpreis.
3. **Spenden/Patronage**: Open-Source-Lizenz, Spenden-Button (PayPal/Krypto). Kein Tracking, kein Ads.

Bevorzugtes Modell: **Option 2/3** — passt zur Privacy-First-Philosophie der Zielgruppe. Premium als optionale Erweiterung, nicht als Bezahlwall.

---

## Abhängigkeiten & Grenzen

- PocketBase muss stabil laufen; bei Ausfall sind keine Transaktionen möglich (Offline-PWA fängt Teilweise ab).
- Keine Banking-API im MVP → manuelle CSV-Eingabe ist Pflicht für Dateneingabe.
- GDPR-Compliance muss vor Launch geprüft werden (DSB, Datenschutzerklärung).
- PocketBase-Updates müssen getestet werden, bevor sie deployed werden (SQLite-Migrationen).

---

## Nächste Schritte

1. Wireframes für Dashboard, Transaktionsformular, Budget-Seite erstellen (Figma oder Svelte-Komponenten).
2. Tech-Repo initialisieren (SvelteKit + Tailwind + PocketBase Docker-Compose).
3. Auth-System implementieren als erstes Backend-Feature.
4. Transaktions-CRUD als erstes Frontend-Feature.
5. CSV-Parser als nächstes Feature (höchster Impact/Aufwand im Import-Bereich).

---

*Dokument erstellt am 09.09.2026. Basiert auf KONZEPT.md (t_270a5a3f) und aktueller Marktanalyse.*
