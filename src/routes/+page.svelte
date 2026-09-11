<script>
  import { onMount } from 'svelte';
  import { getAllCategories, categorize } from '$lib/categorizer';
  import { parseCSV, detectFormat } from '$lib/csv';
  import { getBudgetProgress, getMonthlyBalance, getMonthlyOverview } from '$lib/dashboard';
  import { getSavingsSummary } from '$lib/savings';
  import { calculateNetWorth, createAccount } from '$lib/networth';
  import { calculatePortfolioStats, createInvestment } from '$lib/investments';
  import DashboardCharts from '$lib/components/DashboardCharts.svelte';
  import BudgetProgress from '$lib/components/BudgetProgress.svelte';
  import SavingsGoals from '$lib/components/SavingsGoals.svelte';
  import InvestmentTracker from '$lib/components/InvestmentTracker.svelte';
  import NetWorthDashboard from '$lib/components/NetWorthDashboard.svelte';
  import PlaidLink from '$lib/components/PlaidLink.svelte';

  let transactions = [];
  let budgets = {
    food: 300,
    transport: 150,
    entertainment: 100,
    shopping: 200,
    other: 100
  };

  let savingsGoals = [
    {
      id: 'goal_vacation',
      name: 'Urlaub 2026',
      targetAmount: 3000,
      currentAmount: 1200,
      deadline: '2026-06-30',
      monthlyContribution: 200,
      interestRate: 2.5,
      compoundFrequency: 'monthly',
      category: 'vacation',
      priority: 'medium'
    },
    {
      id: 'goal_emergency',
      name: 'Notfallreserve',
      targetAmount: 6000,
      currentAmount: 2500,
      deadline: '2026-12-31',
      monthlyContribution: 300,
      interestRate: 3.0,
      compoundFrequency: 'monthly',
      category: 'emergency',
      priority: 'high'
    },
    {
      id: 'goal_car',
      name: 'Neues Auto',
      targetAmount: 15000,
      currentAmount: 5000,
      deadline: '2027-12-31',
      monthlyContribution: 500,
      interestRate: 2.0,
      compoundFrequency: 'monthly',
      category: 'car',
      priority: 'low'
    }
  ];

  // Demo transactions
  transactions = [
    { date: '2026-09-01', description: 'Gehalt', amount: 3500, category: 'income', source: 'manual' },
    { date: '2026-09-02', description: 'Miete', amount: -950, category: 'housing', source: 'manual' },
    { date: '2026-09-03', description: 'Supermarkt', amount: -85.50, category: 'food', source: 'manual' },
    { date: '2026-09-04', description: 'Benzin', amount: -65.00, category: 'transport', source: 'manual' },
    { date: '2026-09-05', description: 'Netflix', amount: -15.99, category: 'entertainment', source: 'manual' },
    { date: '2026-09-06', description: 'Restaurant', amount: -45.00, category: 'food', source: 'manual' },
    { date: '2026-09-07', description: 'Online Shop', amount: -129.99, category: 'shopping', source: 'manual' },
    { date: '2026-09-08', description: 'Tankstelle', amount: -70.00, category: 'transport', source: 'manual' },
    { date: '2026-09-09', description: 'Bäcker', amount: -12.50, category: 'food', source: 'manual' },
    { date: '2026-09-10', description: 'Kino', amount: -24.00, category: 'entertainment', source: 'manual' },
    { date: '2026-09-11', description: 'Gehalt Nebenjob', amount: 500, category: 'income', source: 'manual' },
    { date: '2026-08-15', description: 'Gehalt August', amount: 3500, category: 'income', source: 'manual' },
    { date: '2026-08-02', description: 'Miete August', amount: -950, category: 'housing', source: 'manual' },
    { date: '2026-08-05', description: 'Supermarkt', amount: -220.00, category: 'food', source: 'manual' },
    { date: '2026-08-10', description: 'Flugbuchen', amount: -380.00, category: 'transport', source: 'manual' },
    { date: '2026-08-20', description: 'Kleidung', amount: -180.00, category: 'shopping', source: 'manual' },
    { date: '2026-07-15', description: 'Gehalt Juli', amount: 3500, category: 'income', source: 'manual' },
    { date: '2026-07-02', description: 'Miete Juli', amount: -950, category: 'housing', source: 'manual' },
    { date: '2026-07-08', description: 'Urlaubskasse', amount: -400.00, category: 'entertainment', source: 'manual' }
  ];

  let showImport = false;
  let importMessage = '';
  let activeTab = 'overview';

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const categories = getAllCategories();
  const budgetProgress = getBudgetProgress(transactions, budgets, currentYear, currentMonth);
  const monthlyBalance = getMonthlyBalance(transactions, currentYear, currentMonth);
  const monthlyOverview = getMonthlyOverview(transactions);
  const savingsSummary = getSavingsSummary(savingsGoals);

  // Accounts for Net Worth
  let accounts = [
    createAccount({ name: 'Girokonto ING', type: 'checking', balance: 4250.80, institution: 'ING' }),
    createAccount({ name: 'Tagesgeld', type: 'savings', balance: 15000, institution: 'ING' }),
    createAccount({ name: 'Bargeld', type: 'cash', balance: 350 })
  ];

  // Investments
  const investments = [
    createInvestment({ type: 'crypto', symbol: 'BTC', name: 'Bitcoin', amount: 0.5, buyPrice: 55000 }),
    createInvestment({ type: 'crypto', symbol: 'ETH', name: 'Ethereum', amount: 5, buyPrice: 3200 }),
    createInvestment({ type: 'stock', symbol: 'AAPL', name: 'Apple Inc.', amount: 10, buyPrice: 175 })
  ];

  const netWorth = calculateNetWorth(accounts, investments);
  const portfolioStats = calculatePortfolioStats(investments);

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const format = detectFormat(csvText);
        const imported = parseCSV(csvText, format);

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

  function addSavingsGoal() {
    const name = prompt('Name des Sparziels:');
    if (!name) return;
    const targetStr = prompt('Zielbetrag:');
    if (!targetStr) return;
    const monthlyStr = prompt('Monatlicher Beitrag:');
    if (!monthlyStr) return;

    const newGoal = {
      id: `goal_${Date.now()}`,
      name,
      targetAmount: parseFloat(targetStr),
      currentAmount: 0,
      deadline: null,
      monthlyContribution: parseFloat(monthlyStr),
      interestRate: 0,
      compoundFrequency: 'monthly',
      category: 'general',
      priority: 'medium'
    };

    savingsGoals = [...savingsGoals, newGoal];
  }

  function addAccount() {
    const name = prompt('Kontoname:');
    if (!name) return;
    const balanceStr = prompt('Kontostand (EUR):');
    if (!balanceStr) return;
    const type = prompt('Typ (checking/savings/cash/investment):') || 'checking';

    const acc = createAccount({
      name,
      type,
      balance: parseFloat(balanceStr)
    });

    accounts = [...accounts, acc];
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Header -->
  <header class="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50 safe-top">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center gap-3">
          <span class="text-2xl">💰</span>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Money</h1>
          <span class="hidden sm:inline-block px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">MVP</span>
        </div>
        <div class="flex gap-2">
          <button
            class="bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-emerald-700 active:scale-95 transition-all text-sm sm:text-base font-medium"
            on:click={addTransaction}
          >
            <span class="hidden sm:inline">+ Transaktion</span>
            <span class="sm:hidden">+</span>
          </button>
          <button
            class="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all text-sm sm:text-base font-medium"
            on:click={() => (showImport = !showImport)}
          >
            <span class="hidden sm:inline">📁 Import</span>
            <span class="sm:hidden">📁</span>
          </button>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
    <!-- Import Section -->
    {#if showImport}
      <div class="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg mb-6">
        <h2 class="text-lg font-semibold mb-2">CSV-Import</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Wähle eine CSV-Datei von deiner Bank aus (DKB, N26, Revolut, Comdirect)
        </p>
        <input
          type="file"
          accept=".csv"
          on:change={handleFileUpload}
          class="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900 dark:file:text-indigo-300"
        />
        {#if importMessage}
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{importMessage}</p>
        {/if}
      </div>
    {/if}

    <!-- Tab Navigation (Mobile) -->
    <div class="flex overflow-x-auto gap-1 mb-6 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm lg:hidden no-scrollbar">
      <button
        class="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors
          {activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        on:click={() => activeTab = 'overview'}
      >
        Übersicht
      </button>
      <button
        class="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors
          {activeTab === 'budget' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        on:click={() => activeTab = 'budget'}
      >
        Budget
      </button>
      <button
        class="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors
          {activeTab === 'savings' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        on:click={() => activeTab = 'savings'}
      >
        Sparen
      </button>
      <button
        class="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors
          {activeTab === 'invest' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        on:click={() => activeTab = 'invest'}
      >
        Invest
      </button>
      <button
        class="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors
          {activeTab === 'networth' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        on:click={() => activeTab = 'networth'}
      >
        Vermögen
      </button>
      <button
        class="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors
          {activeTab === 'transactions' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        on:click={() => activeTab = 'transactions'}
      >
        Buchungen
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div class="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-4 sm:p-6 text-white shadow-lg">
        <p class="text-xs sm:text-sm opacity-80">Einnahmen</p>
        <p class="text-lg sm:text-2xl font-bold mt-1">{formatCurrency(monthlyBalance.income)}</p>
      </div>
      <div class="bg-gradient-to-br from-red-400 to-red-600 rounded-2xl p-4 sm:p-6 text-white shadow-lg">
        <p class="text-xs sm:text-sm opacity-80">Ausgaben</p>
        <p class="text-lg sm:text-2xl font-bold mt-1">{formatCurrency(monthlyBalance.expenses)}</p>
      </div>
      <div class="bg-gradient-to-br {monthlyBalance.balance >= 0 ? 'from-blue-400 to-blue-600' : 'from-orange-400 to-orange-600'} rounded-2xl p-4 sm:p-6 text-white shadow-lg">
        <p class="text-xs sm:text-sm opacity-80">Saldo</p>
        <p class="text-lg sm:text-2xl font-bold mt-1">{formatCurrency(monthlyBalance.balance)}</p>
      </div>
      <div class="bg-gradient-to-br from-purple-400 to-indigo-600 rounded-2xl p-4 sm:p-6 text-white shadow-lg">
        <p class="text-xs sm:text-sm opacity-80">Vermögen</p>
        <p class="text-lg sm:text-2xl font-bold mt-1">{formatCurrency(netWorth.totalValue)}</p>
      </div>
    </div>

    <!-- Desktop Layout: All sections visible -->
    <div class="hidden lg:block space-y-6">
      <!-- Plaid Bank Connection -->
      <PlaidLink />

      <!-- Net Worth Dashboard -->
      <NetWorthDashboard />

      <!-- Charts Row -->
      <DashboardCharts {monthlyOverview} {budgetProgress} {transactions} />

      <!-- Investment Tracker -->
      <InvestmentTracker />

      <!-- Budget & Savings Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetProgress {budgetProgress} {currentMonth} {currentYear} />
        <SavingsGoals {savingsGoals} totalSavings={savingsSummary.totalSaved} />
      </div>

      <!-- Transactions -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-sm">📋</span>
          Transaktionen
        </h3>
        {#if transactions.length === 0}
          <p class="text-gray-500 dark:text-gray-400 text-center py-8">Noch keine Transaktionen.</p>
        {:else}
          <div class="space-y-2 max-h-96 overflow-y-auto">
            {#each transactions as t, i}
              <div class="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm truncate">{t.description}</p>
                  <div class="flex gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <span>{t.date}</span>
                    <span class="px-1.5 py-0.5 rounded text-white text-xs" style="background-color: {categories.find(c => c.id === t.category)?.color || '#6b7280'}">
                      {categories.find(c => c.id === t.category)?.name || t.category}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-sm" class:text-green-600={t.amount >= 0} class:text-red-600={t.amount < 0}>
                    {formatCurrency(t.amount)}
                  </span>
                  <button
                    class="text-red-400 hover:text-red-600 text-sm p-1"
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
    </div>

    <!-- Mobile Layout: Tab-based -->
    <div class="lg:hidden">
      {#if activeTab === 'overview'}
        <DashboardCharts {monthlyOverview} {budgetProgress} {transactions} />
      {:else if activeTab === 'networth'}
        <NetWorthDashboard />
      {:else if activeTab === 'invest'}
        <InvestmentTracker />
      {:else if activeTab === 'budget'}
        <BudgetProgress {budgetProgress} {currentMonth} {currentYear} />
      {:else if activeTab === 'savings'}
        <SavingsGoals {savingsGoals} totalSavings={savingsSummary.totalSaved} />
      {:else if activeTab === 'transactions'}
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-sm">📋</span>
            Transaktionen
          </h3>
          {#if transactions.length === 0}
            <p class="text-gray-500 dark:text-gray-400 text-center py-8">Noch keine Transaktionen.</p>
          {:else}
            <div class="space-y-2 max-h-96 overflow-y-auto">
              {#each transactions as t, i}
                <div class="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">{t.description}</p>
                    <div class="flex gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <span>{t.date}</span>
                      <span class="px-1.5 py-0.5 rounded text-white text-xs" style="background-color: {categories.find(c => c.id === t.category)?.color || '#6b7280'}">
                        {categories.find(c => c.id === t.category)?.name || t.category}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm" class:text-green-600={t.amount >= 0} class:text-red-600={t.amount < 0}>
                      {formatCurrency(t.amount)}
                    </span>
                    <button
                      class="text-red-400 hover:text-red-600 text-sm p-1"
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
      {/if}
    </div>
  </main>

  <!-- Mobile Bottom Navigation -->
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-bottom z-50">
    <div class="flex justify-around items-center h-16">
      <button
        on:click={() => activeTab = 'overview'}
        class="flex flex-col items-center gap-1 px-3 py-2 {activeTab === 'overview' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span class="text-xs font-medium">Home</span>
      </button>
      <button
        on:click={() => activeTab = 'budget'}
        class="flex flex-col items-center gap-1 px-3 py-2 {activeTab === 'budget' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span class="text-xs font-medium">Budget</span>
      </button>
      <button
        on:click={addTransaction}
        class="flex items-center justify-center w-12 h-12 -mt-6 bg-indigo-600 text-white rounded-full shadow-lg active:scale-95 transition-transform"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <button
        on:click={() => activeTab = 'invest'}
        class="flex flex-col items-center gap-1 px-3 py-2 {activeTab === 'invest' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span class="text-xs font-medium">Invest</span>
      </button>
      <button
        on:click={() => activeTab = 'transactions'}
        class="flex flex-col items-center gap-1 px-3 py-2 {activeTab === 'transactions' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span class="text-xs font-medium">Buchungen</span>
      </button>
    </div>
  </nav>

  <!-- Footer -->
  <footer class="mt-12 py-6 border-t border-gray-200 dark:border-gray-700 hidden lg:block">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
      <p>💰 Money MVP — Dein smarter Finanz-Tracker</p>
    </div>
  </footer>
</div>
