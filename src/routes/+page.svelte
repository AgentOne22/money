<script>
  import { onMount } from 'svelte';
  import { getAllCategories, categorize } from '$lib/categorizer';
  import { parseCSV, detectFormat } from '$lib/csv';
  import { getBudgetProgress, getMonthlyBalance, getMonthlyOverview, getSavingsProgress } from '$lib/dashboard';

  let transactions = [];
  let budgets = {
    food: 300,
    transport: 150,
    entertainment: 100,
    shopping: 200,
    other: 100
  };

  let savingsGoal = {
    target: 5000,
    deadline: '2026-12-31',
    current: 2500
  };

  let showImport = false;
  let importMessage = '';
  let selectedFile = null;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const categories = getAllCategories();
  const budgetProgress = getBudgetProgress(transactions, budgets, currentYear, currentMonth);
  const monthlyBalance = getMonthlyBalance(transactions, currentYear, currentMonth);
  const monthlyOverview = getMonthlyOverview(transactions);
  const savingsProgress = getSavingsProgress(savingsGoal, savingsGoal.current);

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const format = detectFormat(csvText);
        const imported = parseCSV(csvText, format);

        // Auto-categorize
        imported.forEach((t) => {
          t.category = categorize(t.description);
        });

        transactions = [...transactions, ...imported];
        importMessage = `${imported.length} Transaktionen importiert (${format.toUpperCase()})`;
        showImport = false;
      } catch (err) {
        importMessage = `Fehler: ${err.message}`;
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  function addTransaction() {
    const desc = prompt('Beschreibung:');
    if (!desc) return;
    const amountStr = prompt('Betrag (negativ für Ausgaben):');
    if (!amountStr) return;
    const dateStr = prompt('Datum (YYYY-MM-DD):') || new Date().toISOString().split('T')[0];

    const amount = parseFloat(amountStr);
    const category = categorize(desc);

    transactions = [
      ...transactions,
      { date: dateStr, description: desc, amount, category, source: 'manual' }
    ];
  }

  function deleteTransaction(index) {
    transactions = transactions.filter((_, i) => i !== index);
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <header class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold">💰 Money</h1>
      <p class="text-gray-500">Dein Finanz-Tracker</p>
    </div>
    <div class="flex gap-2">
      <button
        class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        on:click={addTransaction}
      >
        + Transaktion
      </button>
      <button
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        on:click={() => (showImport = !showImport)}
      >
        📁 CSV Import
      </button>
    </div>
  </header>

  {#if showImport}
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 class="text-lg font-semibold mb-2">CSV-Import</h2>
      <p class="text-sm text-gray-500 mb-3">
        Wähle eine CSV-Datei von deiner Bank aus (DKB, N26, Revolut, Comdirect)
      </p>
      <input
        type="file"
        accept=".csv"
        on:change={handleFileUpload}
        class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {#if importMessage}
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{importMessage}</p>
      {/if}
    </div>
  {/if}

  <!-- Monthly Overview -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <p class="text-sm text-gray-500">Einnahmen</p>
      <p class="text-2xl font-bold text-green-600">{formatCurrency(monthlyBalance.income)}</p>
    </div>
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <p class="text-sm text-gray-500">Ausgaben</p>
      <p class="text-2xl font-bold text-red-600">{formatCurrency(monthlyBalance.expenses)}</p>
    </div>
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <p class="text-sm text-gray-500">Saldo</p>
      <p class="text-2xl font-bold" class:text-green-600={monthlyBalance.balance >= 0} class:text-red-600={monthlyBalance.balance < 0}>
        {formatCurrency(monthlyBalance.balance)}
      </p>
    </div>
  </div>

  <!-- Budget Progress -->
  <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
    <h2 class="text-lg font-semibold mb-3">📊 Budget-Übersicht</h2>
    <div class="space-y-3">
      {#each budgetProgress as item}
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span>{item.category}</span>
            <span>{formatCurrency(item.spent)} / {formatCurrency(item.limit)}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3">
            <div
              class="h-3 rounded-full"
              class:bg-green-500={item.status === 'ok'}
              class:bg-yellow-500={item.status === 'warning'}
              class:bg-red-500={item.status === 'exceeded'}
              style="width: {Math.min(item.percentage, 100)}%"
            ></div>
          </div>
          <p class="text-xs text-gray-500 mt-1">{item.percentage}% verbraucht</p>
        </div>
      {/each}
    </div>
  </div>

  <!-- Savings Goal -->
  {#if savingsProgress}
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 class="text-lg font-semibold mb-3">🎯 Sparziel</h2>
      <div class="flex justify-between text-sm mb-2">
        <span>{formatCurrency(savingsProgress.current)} gespart</span>
        <span>Ziel: {formatCurrency(savingsProgress.target)}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-4">
        <div
          class="h-4 rounded-full bg-green-500"
          style="width: {savingsProgress.percentage}%"
        ></div>
      </div>
      <p class="text-xs text-gray-500 mt-1">{savingsProgress.percentage}% erreicht</p>
      {#if savingsProgress.remaining > 0}
        <p class="text-xs text-gray-500 mt-1">Noch {formatCurrency(savingsProgress.remaining)} bis zum Ziel</p>
      {/if}
    </div>
  {/if}

  <!-- Transactions List -->
  <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
    <h2 class="text-lg font-semibold mb-3">📋 Transaktionen</h2>
    {#if transactions.length === 0}
      <p class="text-gray-500 text-center py-8">Noch keine Transaktionen. Importiere eine CSV-Datei oder füge manuell hinzu.</p>
    {:else}
      <div class="space-y-2 max-h-96 overflow-y-auto">
        {#each transactions as t, i}
          <div class="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
            <div class="flex-1">
              <p class="font-medium text-sm">{t.description}</p>
              <div class="flex gap-2 text-xs text-gray-500">
                <span>{t.date}</span>
                <span class="px-1.5 py-0.5 rounded text-white text-xs" style="background-color: {categories.find(c => c.id === t.category)?.color || '#6b7280'}">
                  {categories.find(c => c.id === t.category)?.name || t.category}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold" class:text-green-600={t.amount >= 0} class:text-red-600={t.amount < 0}>
                {formatCurrency(t.amount)}
              </span>
              <button
                class="text-red-500 hover:text-red-700 text-sm"
                on:click={() => deleteTransaction(i)}
              >
                ×
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Monthly Overview Chart -->
  {#if monthlyOverview.length > 0}
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 class="text-lg font-semibold mb-3">📈 Monatsübersicht</h2>
      <div class="space-y-2">
        {#each monthlyOverview as m}
          <div class="flex items-center gap-2 text-sm">
            <span class="w-16">{m.month}</span>
            <div class="flex-1 flex gap-1">
              <div class="h-4 bg-green-400 rounded" style="width: {(m.income / Math.max(m.income, m.expenses)) * 50}%"></div>
              <div class="h-4 bg-red-400 rounded" style="width: {(m.expenses / Math.max(m.income, m.expenses)) * 50}%"></div>
            </div>
            <span class="w-20 text-right" class:text-green-600={m.balance >= 0} class:text-red-600={m.balance < 0}>
              {formatCurrency(m.balance)}
            </span>
          </div>
        {/each}
      </div>
      <div class="flex gap-4 mt-3 text-xs">
        <span class="flex items-center gap-1"><span class="w-3 h-3 bg-green-400 rounded"></span> Einnahmen</span>
        <span class="flex items-center gap-1"><span class="w-3 h-3 bg-red-400 rounded"></span> Ausgaben</span>
      </div>
    </div>
  {/if}
</div>
