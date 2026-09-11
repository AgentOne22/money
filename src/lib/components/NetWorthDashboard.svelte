<script>
  import { onMount } from 'svelte';
  import {
    createAccount,
    calculateNetWorth,
    calculateNetWorthTrend,
    generateMonthlySnapshots,
    formatNetWorthSummary
  } from '$lib/networth';
  import { calculatePortfolioStats } from '$lib/investments';

  // Demo accounts
  let accounts = [
    createAccount({
      id: 'acc_checking',
      name: 'Girokonto',
      type: 'checking',
      balance: 4250.80,
      institution: 'ING',
      isLiquid: true
    }),
    createAccount({
      id: 'acc_savings',
      name: 'Tagesgeld',
      type: 'savings',
      balance: 15000,
      institution: 'ING',
      isLiquid: true
    }),
    createAccount({
      id: 'acc_depot',
      name: 'Aktien-Depot',
      type: 'investment',
      balance: 8500,
      institution: 'Trade Republic',
      isLiquid: true
    }),
    createAccount({
      id: 'acc_cash',
      name: 'Bargeld',
      type: 'cash',
      balance: 350,
      isLiquid: true
    }),
    createAccount({
      id: 'acc_crypto_wallet',
      name: 'Krypto-Wallet',
      type: 'crypto',
      balance: 2800,
      isLiquid: true
    })
  ];

  // Demo investments for portfolio value
  let investments = [
    { type: 'crypto', currentValue: 2800, amount: 0.5, buyPrice: 50000 },
    { type: 'stock', currentValue: 8500, amount: 50, buyPrice: 150 }
  ];

  let netWorth = calculateNetWorth(accounts, investments);
  let summary = formatNetWorthSummary(netWorth);
  let portfolioStats = calculatePortfolioStats(investments);
  let showAddAccount = false;

  // New account form
  let newAccount = {
    name: '',
    type: 'checking',
    balance: 0,
    currency: 'EUR',
    institution: '',
    isLiquid: true,
    notes: ''
  };

  const accountTypes = [
    { value: 'checking', label: 'Girokonto' },
    { value: 'savings', label: 'Sparkonto' },
    { value: 'investment', label: 'Depot' },
    { value: 'cash', label: 'Bargeld' },
    { value: 'crypto', label: 'Krypto-Wallet' },
    { value: 'other', label: 'Sonstiges' }
  ];

  function addAccount() {
    if (!newAccount.name) return;

    const acc = createAccount({
      name: newAccount.name,
      type: newAccount.type,
      balance: newAccount.balance,
      currency: newAccount.currency,
      institution: newAccount.institution,
      isLiquid: newAccount.isLiquid,
      notes: newAccount.notes
    });

    accounts = [...accounts, acc];
    netWorth = calculateNetWorth(accounts, investments);
    summary = formatNetWorthSummary(netWorth);
    showAddAccount = false;

    // Reset form
    newAccount = {
      name: '',
      type: 'checking',
      balance: 0,
      currency: 'EUR',
      institution: '',
      isLiquid: true,
      notes: ''
    };
  }

  function removeAccount(id) {
    accounts = accounts.filter(a => a.id !== id);
    netWorth = calculateNetWorth(accounts, investments);
    summary = formatNetWorthSummary(netWorth);
  }

  function formatEur(amount) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  }
</script>

<div class="space-y-6">
  <!-- Net Worth Hero -->
  <div class="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
    <p class="text-sm opacity-80 mb-1">Gesamtvermögen</p>
    <p class="text-3xl sm:text-4xl font-bold">{summary.total}</p>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
      <div>
        <p class="text-xs opacity-70">Konten</p>
        <p class="text-lg font-semibold">{summary.accountCount}</p>
      </div>
      <div>
        <p class="text-xs opacity-70">Investments</p>
        <p class="text-lg font-semibold">{summary.investmentCount}</p>
      </div>
      <div>
        <p class="text-xs opacity-70">Liquid</p>
        <p class="text-lg font-semibold">{summary.liquid}</p>
      </div>
      <div>
        <p class="text-xs opacity-70">Illiquid</p>
        <p class="text-lg font-semibold">{summary.illiquid}</p>
      </div>
    </div>
  </div>

  <!-- Asset Allocation -->
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
    <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
      <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-sm">📊</span>
      Vermögensverteilung
    </h3>
    <div class="space-y-3">
      {#each netWorth.assetAllocation as alloc}
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full" style="background-color: {alloc.color}"></div>
          <span class="text-sm font-medium w-24">{alloc.category}</span>
          <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              class="h-3 rounded-full transition-all duration-500"
              style="width: {alloc.percent}%; background-color: {alloc.color}"
            ></div>
          </div>
          <span class="text-sm font-bold w-16 text-right">{alloc.percent}%</span>
          <span class="text-sm text-gray-500 w-28 text-right">{formatEur(alloc.value)}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Accounts List -->
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm">🏦</span>
        Konten
      </h3>
      <button
        class="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        on:click={() => showAddAccount = true}
      >
        + Konto
      </button>
    </div>
    <div class="space-y-2">
      {#each accounts as acc}
        <div class="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm">
              {acc.type === 'checking' ? '🏦' : acc.type === 'savings' ? '💰' : acc.type === 'cash' ? '💵' : acc.type === 'crypto' ? '₿' : '📦'}
            </div>
            <div>
              <p class="font-medium text-sm">{acc.name}</p>
              <div class="flex items-center gap-2 text-xs text-gray-500">
                <span>{accountTypes.find(t => t.value === acc.type)?.label || acc.type}</span>
                {#if acc.institution}
                  <span>·</span>
                  <span>{acc.institution}</span>
                {/if}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-sm">{formatEur(acc.balance)}</span>
            <button
              class="text-red-400 hover:text-red-600 text-xs p-1"
              on:click={() => removeAccount(acc.id)}
              title="Entfernen"
            >
              ×
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Investment Summary -->
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
    <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
      <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm">📈</span>
      Investment-Portfolio
    </h3>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
        <p class="text-xs text-gray-500">Gesamtwert</p>
        <p class="text-lg font-bold">{formatEur(portfolioStats.totalValue)}</p>
      </div>
      <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
        <p class="text-xs text-gray-500">Kaufpreis</p>
        <p class="text-lg font-bold">{formatEur(portfolioStats.totalCost)}</p>
      </div>
      <div class="p-3 {portfolioStats.totalProfitLoss >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-xl">
        <p class="text-xs {portfolioStats.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}">Gewinn/Verlust</p>
        <p class="text-lg font-bold {portfolioStats.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}">
          {portfolioStats.totalProfitLoss >= 0 ? '+' : ''}{formatEur(portfolioStats.totalProfitLoss)}
        </p>
      </div>
      <div class="p-3 {portfolioStats.totalProfitLossPercent >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-xl">
        <p class="text-xs {portfolioStats.totalProfitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}">Rendite</p>
        <p class="text-lg font-bold {portfolioStats.totalProfitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}">
          {portfolioStats.totalProfitLossPercent >= 0 ? '+' : ''}{portfolioStats.totalProfitLossPercent.toFixed(2)}%
        </p>
      </div>
    </div>
  </div>

  <!-- Add Account Modal -->
  {#if showAddAccount}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-semibold mb-4">Konto hinzufügen</h3>
        <form on:submit|preventDefault={addAccount} class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              bind:value={newAccount.name}
              placeholder="z.B. Girokonto"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Typ</label>
            <select
              bind:value={newAccount.type}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              {#each accountTypes as t}
                <option value={t.value}>{t.label}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Kontostand (EUR)</label>
            <input
              type="number"
              step="0.01"
              bind:value={newAccount.balance}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Institution (optional)</label>
            <input
              type="text"
              bind:value={newAccount.institution}
              placeholder="z.B. ING, Commerzbank"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              bind:checked={newAccount.isLiquid}
              id="isLiquid"
            />
            <label for="isLiquid" class="text-sm">Liquid (schnell verfügbar)</label>
          </div>
          <div class="flex gap-2 pt-2">
            <button
              type="button"
              class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              on:click={() => showAddAccount = false}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Hinzufügen
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>
