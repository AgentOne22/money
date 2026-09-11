<script>
  import { onMount } from 'svelte';
  import { SUPPORTED_CURRENCIES, fetchExchangeRates, formatCurrency, getCurrencyInfo, convertCurrency } from '$lib/currency';

  let activeCurrency = 'EUR';
  let rates = {};
  let loading = true;
  let error = '';
  let convertingAmount = 100;
  let fromCurrency = 'USD';
  let toCurrency = 'EUR';
  let convertedAmount = 0;
  let showConverter = false;

  onMount(async () => {
    loading = true;
    try {
      const data = await fetchExchangeRates('EUR');
      rates = data.rates;
    } catch (err) {
      error = err.message;
    }
    loading = false;
  });

  function convert() {
    if (fromCurrency === toCurrency) {
      convertedAmount = convertingAmount;
      return;
    }
    if (!rates || Object.keys(rates).length === 0) return;
    
    if (fromCurrency === 'EUR') {
      convertedAmount = convertingAmount * (rates[toCurrency] || 1);
    } else {
      const inEur = convertingAmount / (rates[fromCurrency] || 1);
      convertedAmount = toCurrency === 'EUR' ? inEur : inEur * (rates[toCurrency] || 1);
    }
    convertedAmount = Math.round(convertedAmount * 100) / 100;
  }

  function getCurrencySymbol(code) {
    const info = getCurrencyInfo(code);
    return info.symbol || code;
  }

  function getRateDisplay(from, to) {
    if (from === to) return '1,00';
    let rate;
    if (from === 'EUR') {
      rate = rates[to] || 1;
    } else {
      const inEur = 1 / (rates[from] || 1);
      rate = to === 'EUR' ? inEur : inEur * (rates[to] || 1);
    }
    return rate.toFixed(4);
  }
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold flex items-center gap-2">
      <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm">💱</span>
      Multi-Currency
    </h3>
    <button
      class="text-sm px-3 py-1 rounded-lg transition-colors {showConverter ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
      on:click={() => showConverter = !showConverter}
    >
      {showConverter ? 'Schließen' : 'Rechner'}
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <span class="ml-3 text-gray-500">Lade Wechselkurse...</span>
    </div>
  {:else if error}
    <div class="text-center py-4">
      <p class="text-red-500 text-sm">{error}</p>
      <p class="text-gray-500 text-xs mt-1">Fallback-Kurse verwendet</p>
    </div>
  {:else}
    <!-- Währungsauswahl -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Basis-Währung</label>
      <select
        bind:value={activeCurrency}
        class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      >
        {#each SUPPORTED_CURRENCIES as currency}
          <option value={currency.code}>
            {currency.symbol} {currency.code} — {currency.name}
          </option>
        {/each}
      </select>
    </div>

    <!-- Schnelle Ratentabelle -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
      {#each SUPPORTED_CURRENCIES.slice(0, 6) as currency}
        {#if currency.code !== activeCurrency}
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
            <p class="text-xs text-gray-500">{currency.code}</p>
            <p class="font-semibold text-sm">{getRateDisplay(activeCurrency, currency.code)}</p>
          </div>
        {/if}
      {/each}
    </div>

    <!-- Währungsrechner -->
    {#if showConverter}
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Währungsrechner</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Betrag</label>
            <div class="flex gap-2">
              <input
                type="number"
                bind:value={convertingAmount}
                on:input={convert}
                class="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
              <select
                bind:value={fromCurrency}
                on:change={convert}
                class="w-24 px-2 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                {#each SUPPORTED_CURRENCIES as currency}
                  <option value={currency.code}>{currency.code}</option>
                {/each}
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Ergebnis</label>
            <div class="flex gap-2">
              <input
                type="text"
                value={formatCurrency(convertedAmount, toCurrency)}
                readonly
                class="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
              <select
                bind:value={toCurrency}
                on:change={convert}
                class="w-24 px-2 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                {#each SUPPORTED_CURRENCIES as currency}
                  <option value={currency.code}>{currency.code}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
