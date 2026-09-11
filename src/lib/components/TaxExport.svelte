<script>
  import { onMount } from 'svelte';
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
  import { downloadFile } from '$lib/export';

  export let transactions = [];

  let activeTab = 'vat';
  let selectedYear = new Date().getFullYear();
  let selectedQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  let vatRate = SWISS_VAT_RATES.standard;
  let reportingMethod = 'effective';
  let maritalStatus = 'single';
  let childrenCount = 0;
  let pillar3a = 7056;
  let canton = 'ZH';

  let vatReport = null;
  let incomeTaxReport = null;
  let showPreview = false;

  const cantons = [
    'ZH', 'BE', 'LU', 'UR', 'SZ', 'OW', 'NW', 'GL', 'ZG', 'FR',
    'SO', 'BS', 'BL', 'SH', 'AR', 'AI', 'SG', 'GR', 'AG', 'TG',
    'TI', 'VD', 'VS', 'NE', 'GE', 'JU'
  ];

  function calculateVAT() {
    vatReport = generateVATReport(transactions, {
      year: selectedYear,
      quarter: selectedQuarter
    }, {
      vatRate,
      reportingMethod
    });
    showPreview = true;
  }

  function calculateIncomeTax() {
    incomeTaxReport = generateIncomeTaxReport(transactions, selectedYear, {
      maritalStatus,
      childrenCount,
      pillar3aContribution: pillar3a,
      canton
    });
    showPreview = true;
  }

  function downloadVATCSV() {
    const csv = exportVATToCSV(vatReport);
    downloadFile(csv, 'mwst_' + selectedYear + '_Q' + selectedQuarter + '.csv', 'text/csv');
  }

  function downloadIncomeTaxCSV() {
    const csv = exportIncomeTaxToCSV(incomeTaxReport);
    downloadFile(csv, 'einkommensteuer_' + selectedYear + '.csv', 'text/csv');
  }

  function downloadVATPDF() {
    const html = exportVATToPDF(vatReport);
    downloadFile(html, 'mwst_' + selectedYear + '_Q' + selectedQuarter + '.html', 'text/html');
  }

  function downloadIncomeTaxPDF() {
    const html = exportIncomeTaxToPDF(incomeTaxReport);
    downloadFile(html, 'einkommensteuer_' + selectedYear + '.html', 'text/html');
  }

  function formatCHF(amount) {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount);
  }
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
  <div class="flex items-center gap-3 mb-6">
    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-lg">🇨🇭</div>
    <div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Steuer-Export</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">Schweizer MWST & Einkommensteuer</p>
    </div>
  </div>

  <!-- Tab Navigation -->
  <div class="flex gap-2 mb-6">
    <button
      class="px-4 py-2 rounded-lg font-medium transition-all {activeTab === 'vat' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
      on:click={() => activeTab = 'vat'}
    >
      MWST
    </button>
    <button
      class="px-4 py-2 rounded-lg font-medium transition-all {activeTab === 'income' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
      on:click={() => activeTab = 'income'}
    >
      Einkommensteuer
    </button>
  </div>

  {#if activeTab === 'vat'}
    <div class="space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jahr</label>
          <select bind:value={selectedYear} class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
            {#each [2024, 2025, 2026, 2027] as year}
              <option value={year}>{year}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quartal</label>
          <select bind:value={selectedQuarter} class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
            {#each [1, 2, 3, 4] as q}
              <option value={q}>Q{q}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">MWST-Satz</label>
          <select bind:value={vatRate} class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
            <option value={SWISS_VAT_RATES.standard}>Normal ({SWISS_VAT_RATES.standard}%)</option>
            <option value={SWISS_VAT_RATES.reduced}>Reduziert ({SWISS_VAT_RATES.reduced}%)</option>
            <option value={SWISS_VAT_RATES.accommodation}>Beherbergung ({SWISS_VAT_RATES.accommodation}%)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Methode</label>
          <select bind:value={reportingMethod} class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
            <option value="effective">Effektiv</option>
            <option value="net-tax">Netto-Steuer</option>
          </select>
        </div>
      </div>

      <button
        on:click={calculateVAT}
        class="w-full py-2.5 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all"
      >
        MWST berechnen
      </button>

      {#if vatReport}
        <div class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
          <h4 class="font-semibold text-red-800 dark:text-red-200 mb-3">Ergebnis Q{vatReport.quarter} {vatReport.year}</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Gesamtumsatz</span>
              <p class="font-semibold">{formatCHF(vatReport.turnover.total)}</p>
            </div>
            <div>
              <span class="text-gray-500">MWST auf Umsatz</span>
              <p class="font-semibold">{formatCHF(vatReport.vat.onTurnover)}</p>
            </div>
            <div>
              <span class="text-gray-500">Vorsteuer</span>
              <p class="font-semibold text-red-600">-{formatCHF(vatReport.vat.onExpenses)}</p>
            </div>
            <div>
              <span class="text-gray-500">Zahlbare MWST</span>
              <p class="font-bold text-lg">{formatCHF(vatReport.vat.netPayable)}</p>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button on:click={downloadVATCSV} class="flex-1 py-2 px-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600">
              CSV
            </button>
            <button on:click={downloadVATPDF} class="flex-1 py-2 px-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600">
              PDF
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  {#if activeTab === 'income'}
    <div class="space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jahr</label>
          <select bind:value={selectedYear} class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
            {#each [2024, 2025, 2026, 2027] as year}
              <option value={year}>{year}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kanton</label>
          <select bind:value={canton} class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
            {#each cantons as c}
              <option value={c}>{c}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Familienstand</label>
          <select bind:value={maritalStatus} class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
            <option value="single">Ledig</option>
            <option value="married">Verheiratet</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kinder</label>
          <input type="number" bind:value={childrenCount} min="0" class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Säule 3a (CHF)</label>
          <input type="number" bind:value={pillar3a} min="0" max="7056" class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
        </div>
      </div>

      <button
        on:click={calculateIncomeTax}
        class="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
      >
        Steuer berechnen
      </button>

      {#if incomeTaxReport}
        <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
          <h4 class="font-semibold text-blue-800 dark:text-blue-200 mb-3">Ergebnis {incomeTaxReport.year}</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Bruttoeinkommen</span>
              <p class="font-semibold">{formatCHF(incomeTaxReport.income.gross)}</p>
            </div>
            <div>
              <span class="text-gray-500">Abzüge</span>
              <p class="font-semibold text-red-600">-{formatCHF(incomeTaxReport.deductions.total)}</p>
            </div>
            <div>
              <span class="text-gray-500">Steuerbares Einkommen</span>
              <p class="font-semibold">{formatCHF(incomeTaxReport.taxableIncome)}</p>
            </div>
            <div>
              <span class="text-gray-500">Gesamtsteuer</span>
              <p class="font-bold text-lg text-red-600">{formatCHF(incomeTaxReport.tax.total)}</p>
            </div>
          </div>
          <div class="mt-2 text-sm text-gray-500">
            Effektiver Steuersatz: {incomeTaxReport.tax.effectiveRate}%
          </div>
          <div class="flex gap-2 mt-4">
            <button on:click={downloadIncomeTaxCSV} class="flex-1 py-2 px-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600">
              CSV
            </button>
            <button on:click={downloadIncomeTaxPDF} class="flex-1 py-2 px-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600">
              PDF
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <div class="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
    <p class="text-xs text-gray-400 text-center">
      Berechnungen sind unverbindlich. Konsultieren Sie einen Steuerberater.
    </p>
  </div>
</div>
