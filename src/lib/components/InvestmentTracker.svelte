<script>
  import { onMount } from 'svelte';
  import {
    CRYPTO_ASSETS,
    STOCK_ASSETS,
    createInvestment,
    calculateInvestmentValue,
    calculatePortfolioStats,
    updateInvestmentsWithPrices,
    fetchCryptoPrices,
    fetchStockPrices,
    formatMoney,
    formatPercent,
    PriceCache
  } from '$lib/investments';

  const CACHE_TTL = 5; // minutes

  let investments = [
    {
      id: 'inv_demo_1',
      type: 'crypto',
      symbol: 'BTC',
      name: 'Bitcoin',
      amount: 0.5,
      buyPrice: 55000,
      buyDate: '2026-01-15',
      currency: 'EUR',
      notes: 'Erster Bitcoin-Kauf',
      currentPrice: null,
      currentValue: null,
      profitLoss: null,
      profitLossPercent: null,
      lastUpdated: null
    },
    {
      id: 'inv_demo_2',
      type: 'crypto',
      symbol: 'ETH',
      name: 'Ethereum',
      amount: 5,
      buyPrice: 3200,
      buyDate: '2026-02-10',
      currency: 'EUR',
      notes: 'ETH Staking Position',
      currentPrice: null,
      currentValue: null,
      profitLoss: null,
      profitLossPercent: null,
      lastUpdated: null
    },
    {
      id: 'inv_demo_3',
      type: 'crypto',
      symbol: 'SOL',
      name: 'Solana',
      amount: 25,
      buyPrice: 120,
      buyDate: '2026-03-20',
      currency: 'EUR',
      notes: 'SOL long-term hold',
      currentPrice: null,
      currentValue: null,
      profitLoss: null,
      profitLossPercent: null,
      lastUpdated: null
    },
    {
      id: 'inv_demo_4',
      type: 'stock',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      amount: 10,
      buyPrice: 175,
      buyDate: '2026-04-05',
      currency: 'USD',
      notes: 'Tech-Aktie',
      currentPrice: null,
      currentValue: null,
      profitLoss: null,
      profitLossPercent: null,
      lastUpdated: null
    },
    {
      id: 'inv_demo_5',
      type: 'stock',
      symbol: 'NVDA',
      name: 'NVIDIA Corp.',
      amount: 5,
      buyPrice: 800,
      buyDate: '2026-05-12',
      currency: 'USD',
      notes: 'KI-Hardware',
      currentPrice: null,
      currentValue: null,
      profitLoss: null,
      profitLossPercent: null,
      lastUpdated: null
    }
  ];

  let stats = calculatePortfolioStats(investments);
  let priceCache = new PriceCache(CACHE_TTL);
  let isLoading = false;
  let lastUpdated = null;
  let showAddModal = false;
  let activeTab = 'all';

  // New investment form
  let newInv = {
    type: 'crypto',
    symbol: '',
    name: '',
    amount: 0,
    buyPrice: 0,
    buyDate: new Date().toISOString().split('T')[0],
    currency: 'EUR',
    notes: ''
  };

  const cryptoSymbols = CRYPTO_ASSETS.map(a => a.symbol);
  const stockSymbols = STOCK_ASSETS.map(a => a.symbol);

  onMount(() => {
    loadPrices();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  });

  async function loadPrices() {
    isLoading = true;

    // Determine which symbols to fetch
    const cryptoIds = investments
      .filter(i => i.type === 'crypto')
      .map(i => CRYPTO_ASSETS.find(c => c.symbol === i.symbol)?.id)
      .filter(Boolean);

    const stockSyms = investments
      .filter(i => i.type === 'stock')
      .map(i => i.symbol);

    // Fetch prices (with caching)
    let cryptoPrices = priceCache.get('crypto');
    if (!cryptoPrices) {
      cryptoPrices = await fetchCryptoPrices(cryptoIds.length > 0 ? cryptoIds : ['bitcoin', 'ethereum', 'solana']);
      priceCache.set('crypto', cryptoPrices);
    }

    let stockPrices = priceCache.get('stocks');
    if (!stockPrices) {
      stockPrices = await fetchStockPrices(stockSyms.length > 0 ? stockSyms : ['AAPL', 'NVDA']);
      priceCache.set('stocks', stockPrices);
    }

    // Update investments with current prices
    investments = updateInvestmentsWithPrices(investments, cryptoPrices, stockPrices);
    stats = calculatePortfolioStats(investments);
    lastUpdated = new Date().toLocaleTimeString('de-DE');
    isLoading = false;
  }

  function addInvestment() {
    if (!newInv.symbol || !newInv.amount || !newInv.buyPrice) return;

    const name = newInv.name || CRYPTO_ASSETS.find(c => c.symbol === newInv.symbol)?.name || STOCK_ASSETS.find(s => s.symbol === newInv.symbol)?.name || newInv.symbol;

    const inv = createInvestment({
      type: newInv.type,
      symbol: newInv.symbol,
      name,
      amount: newInv.amount,
      buyPrice: newInv.buyPrice,
      buyDate: newInv.buyDate,
      currency: newInv.currency,
      notes: newInv.notes
    });

    investments = [...investments, inv];
    showAddModal = false;

    // Reset form
    newInv = {
      type: 'crypto',
      symbol: '',
      name: '',
      amount: 0,
      buyPrice: 0,
      buyDate: new Date().toISOString().split('T')[0],
      currency: 'EUR',
      notes: ''
    };

    // Reload prices to update new investment
    loadPrices();
  }

  function removeInvestment(id) {
    investments = investments.filter(i => i.id !== id);
    stats = calculatePortfolioStats(investments);
  }

  function filteredInvestments() {
    if (activeTab === 'all') return investments;
    return investments.filter(i => i.type === activeTab);
  }
</script>

<div class="space-y-6">
  <!-- Portfolio Summary -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
      <p class="text-sm opacity-80">Gesamtwert</p>
      <p class="text-xl font-bold mt-1">{formatMoney(stats.totalValue, 'EUR')}</p>
    </div>
    <div class="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-4 text-white shadow-lg">
      <p class="text-sm opacity-80">Gewinn/Verlust</p>
      <p class="text-xl font-bold mt-1">
        <span class="{stats.totalProfitLoss >= 0 ? 'text-green-100' : 'text-red-100'}">
          {stats.totalProfitLoss >= 0 ? '+' : ''}{formatMoney(stats.totalProfitLoss, 'EUR')}
        </span>
      </p>
    </div>
    <div class="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
      <p class="text-sm opacity-80">Kaufpreis</p>
      <p class="text-xl font-bold mt-1">{formatMoney(stats.totalCost, 'EUR')}</p>
    </div>
    <div class="bg-gradient-to-br {stats.totalProfitLossPercent >= 0 ? 'from-emerald-400 to-teal-600' : 'from-red-400 to-red-600'} rounded-2xl p-4 text-white shadow-lg">
      <p class="text-sm opacity-80">Rendite</p>
      <p class="text-xl font-bold mt-1">{formatPercent(stats.totalProfitLossPercent)}</p>
    </div>
  </div>

  <!-- Allocation -->
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
    <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
      <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm">📊</span>
      Asset Allocation
    </h3>
    <div class="space-y-3">
      {#each stats.allocation as alloc}
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium w-20">{alloc.type === 'crypto' ? 'Krypto' : 'Aktien'}</span>
          <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              class="h-3 rounded-full transition-all duration-500 {alloc.type === 'crypto' ? 'bg-gradient-to-r from-orange-400 to-amber-500' : 'bg-gradient-to-r from-pink-400 to-rose-500'}"
              style="width: {alloc.percent}%"
            ></div>
          </div>
          <span class="text-sm font-bold w-16 text-right">{alloc.percent}%</span>
          <span class="text-sm text-gray-500 w-24 text-right">{formatMoney(alloc.value, 'EUR')}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Best/Worst Performers -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {#if stats.bestPerformer}
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
        <p class="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Bester Performer</p>
        <p class="font-bold text-green-700 dark:text-green-300">{stats.bestPerformer.symbol}</p>
        <p class="text-lg font-bold text-green-600">{formatPercent(stats.bestPerformer.profitLossPercent)}</p>
      </div>
    {/if}
    {#if stats.worstPerformer && stats.worstPerformer !== stats.bestPerformer}
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
        <p class="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Schlechtester Performer</p>
        <p class="font-bold text-red-700 dark:text-red-300">{stats.worstPerformer.symbol}</p>
        <p class="text-lg font-bold text-red-600">{formatPercent(stats.worstPerformer.profitLossPercent)}</p>
      </div>
    {/if}
  </div>

  <!-- Investments Table -->
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-sm">💎</span>
        Holdings
      </h3>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">
          {#if lastUpdated}
            Letzte Aktualisierung: {lastUpdated}
          {/if}
          {#if isLoading}
            <span class="text-blue-500 ml-2">Aktualisiere...</span>
          {/if}
        </span>
        <button
          on:click={loadPrices}
          class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
          title="Preise aktualisieren"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
      <button
        class="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {activeTab === 'all' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'}"
        on:click={() => activeTab = 'all'}
      >
        Alle
      </button>
      <button
        class="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {activeTab === 'crypto' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'}"
        on:click={() => activeTab = 'crypto'}
      >
        Krypto
      </button>
      <button
        class="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {activeTab === 'stock' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'}"
        on:click={() => activeTab = 'stock'}
      >
        Aktien
      </button>
    </div>

    <!-- Holdings List -->
    <div class="space-y-2">
      {#each filteredInvestments() as inv}
        <div class="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl {inv.type === 'crypto' ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-pink-400 to-rose-500'} flex items-center justify-center text-white text-xs font-bold">
              {inv.symbol.slice(0, 3)}
            </div>
            <div>
              <p class="font-medium text-sm">{inv.name}</p>
              <div class="flex items-center gap-2 text-xs text-gray-500">
                <span>{inv.amount} {inv.symbol}</span>
                <span>·</span>
                <span>Ø {formatMoney(inv.buyPrice, inv.currency)}</span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <p class="font-bold text-sm">{inv.currentValue ? formatMoney(inv.currentValue, 'EUR') : '—'}</p>
            <div class="flex items-center gap-1 justify-end">
              {#if inv.profitLossPercent !== null}
                <span class="text-xs font-medium {inv.profitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}">
                  {formatPercent(inv.profitLossPercent)}
                </span>
              {/if}
              <button
                class="text-red-400 hover:text-red-600 text-xs p-1 ml-1"
                on:click={() => removeInvestment(inv.id)}
                title="Entfernen"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>

    {#if investments.length === 0}
      <p class="text-center py-8 text-gray-500">Noch keine Investments. Füge dein erstes hinzu!</p>
    {/if}
  </div>

  <!-- Add Investment Button -->
  <button
    class="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center text-2xl z-40"
    on:click={() => showAddModal = true}
  >
    +
  </button>

  <!-- Add Modal -->
  {#if showAddModal}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-semibold mb-4">Investment hinzufügen</h3>
        <form on:submit|preventDefault={addInvestment} class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Typ</label>
            <select
              bind:value={newInv.type}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="crypto">Krypto</option>
              <option value="stock">Aktie</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Symbol</label>
            <select
              bind:value={newInv.symbol}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">Bitte wählen...</option>
              {#each (newInv.type === 'crypto' ? cryptoSymbols : stockSymbols) as sym}
                <option value={sym}>{sym}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Menge</label>
            <input
              type="number"
              step="any"
              bind:value={newInv.amount}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Kaufpreis ({newInv.type === 'stock' ? 'USD' : 'EUR'})</label>
            <input
              type="number"
              step="any"
              bind:value={newInv.buyPrice}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Kaufdatum</label>
            <input
              type="date"
              bind:value={newInv.buyDate}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Notiz (optional)</label>
            <input
              type="text"
              bind:value={newInv.notes}
              placeholder="z.B. Langfristig halten"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div class="flex gap-2 pt-2">
            <button
              type="button"
              class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              on:click={() => showAddModal = false}
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
