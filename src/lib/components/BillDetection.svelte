<script>
  import { onMount } from 'svelte';
  import {
    detectBills,
    groupBillsByCategory,
    getBillsSummary,
    exportBillsToCSV,
    exportBillsToPDF
  } from '$lib/bills';
  import { downloadFile } from '$lib/export';

  export let transactions = [];

  let bills = [];
  let summary = null;
  let selectedCategory = 'all';
  let minConfidence = 0.5;
  let loading = false;

  const categories = [
    { id: 'all', name: 'Alle', icon: '📋' },
    { id: 'insurance', name: 'Versicherung', icon: '🛡️' },
    { id: 'utilities', name: 'Energie/Wasser', icon: '⚡' },
    { id: 'telecom', name: 'Telekom', icon: '📱' },
    { id: 'health', name: 'Gesundheit', icon: '🏥' },
    { id: 'unknown', name: 'Sonstige', icon: '📦' }
  ];

  function analyzeBills() {
    loading = true;
    bills = detectBills(transactions, { minConfidence });
    summary = getBillsSummary(bills);
    loading = false;
  }

  $: filteredBills = selectedCategory === 'all'
    ? bills
    : bills.filter(b => b.category === selectedCategory);

  function downloadCSV() {
    const csv = exportBillsToCSV(bills);
    downloadFile(csv, 'rechnungen.csv', 'text/csv');
  }

  function downloadPDF() {
    const html = exportBillsToPDF(bills);
    downloadFile(html, 'rechnungen.html', 'text/html');
  }

  function formatCHF(amount) {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount);
  }

  function getConfidenceClass(confidence) {
    if (confidence >= 0.7) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  }

  onMount(() => {
    if (transactions.length > 0) {
      analyzeBills();
    }
  });
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
  <div class="flex items-center gap-3 mb-6">
    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-lg">📄</div>
    <div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Rechnungserkennung</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">Automatische Erkennung aus Bank-Transaktionen</p>
    </div>
  </div>

  <!-- Controls -->
  <div class="flex flex-col sm:flex-row gap-4 mb-6">
    <div class="flex-1">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min. Konfidenz</label>
      <input
        type="range"
        bind:value={minConfidence}
        min="0.3"
        max="0.9"
        step="0.1"
        class="w-full"
      />
      <span class="text-xs text-gray-500">{Math.round(minConfidence * 100)}%</span>
    </div>
    <button
      on:click={analyzeBills}
      disabled={loading || transactions.length === 0}
      class="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if loading}
        Analysiere...
      {:else}
        Rechnungen erkennen
      {/if}
    </button>
  </div>

  <!-- Summary Cards -->
  {#if summary}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
        <p class="text-xs text-purple-600 dark:text-purple-400">Rechnungen</p>
        <p class="text-xl font-bold text-gray-900 dark:text-gray-100">{summary.totalBills}</p>
      </div>
      <div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
        <p class="text-xs text-purple-600 dark:text-purple-400">Gesamt</p>
        <p class="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCHF(summary.totalAmount)}</p>
      </div>
      <div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
        <p class="text-xs text-purple-600 dark:text-purple-400">Durchschnitt</p>
        <p class="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCHF(summary.avgAmount)}</p>
      </div>
      <div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
        <p class="text-xs text-purple-600 dark:text-purple-400">Ø Konfidenz</p>
        <p class="text-xl font-bold text-gray-900 dark:text-gray-100">{Math.round(summary.avgConfidence * 100)}%</p>
      </div>
    </div>
  {/if}

  <!-- Category Filter -->
  {#if bills.length > 0}
    <div class="flex flex-wrap gap-2 mb-4">
      {#each categories as cat}
        <button
          on:click={() => selectedCategory = cat.id}
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all {selectedCategory === cat.id ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
        >
          {cat.icon} {cat.name}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Bills List -->
  {#if filteredBills.length > 0}
    <div class="space-y-2 max-h-96 overflow-y-auto">
      {#each filteredBills as bill}
        <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-gray-100 truncate">{bill.description}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-gray-500">{bill.date}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                  {bill.category}
                </span>
                {#if bill.referenceNumber}
                  <span class="text-xs text-gray-400">Ref: {bill.referenceNumber}</span>
                {/if}
              </div>
            </div>
            <div class="text-right ml-4">
              <p class="font-semibold text-gray-900 dark:text-gray-100">{formatCHF(bill.absAmount)}</p>
              <span class="text-xs px-2 py-0.5 rounded-full {getConfidenceClass(bill.confidence)}">
                {Math.round(bill.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else if transactions.length > 0}
    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
      <p class="text-4xl mb-2">📄</p>
      <p class="font-medium">Keine Rechnungen erkannt</p>
      <p class="text-sm mt-1">Klicke auf "Rechnungen erkennen" um die Analyse zu starten</p>
    </div>
  {:else}
    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
      <p class="text-4xl mb-2">📄</p>
      <p class="font-medium">Keine Transaktionen</p>
      <p class="text-sm mt-1">Importiere Transaktionen um Rechnungen zu erkennen</p>
    </div>
  {/if}

  <!-- Export Buttons -->
  {#if bills.length > 0}
    <div class="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
      <button
        on:click={downloadCSV}
        class="flex-1 py-2 px-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
      >
        CSV Export
      </button>
      <button
        on:click={downloadPDF}
        class="flex-1 py-2 px-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
      >
        PDF Export
      </button>
    </div>
  {/if}
</div>
