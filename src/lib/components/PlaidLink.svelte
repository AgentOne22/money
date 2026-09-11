<script>
  import { onMount } from 'svelte';
  import { PlaidClient, PLAID_BANK_INFO, createPlaidConfig } from '$lib/plaid';
  import { normalizePlaidTransactions } from '$lib/plaid';

  let plaidConfig = createPlaidConfig();
  let client = new PlaidClient(plaidConfig);
  let linkToken = null;
  let loading = false;
  let error = '';
  let accounts = [];
  let transactions = [];
  let showLink = false;
  let publicToken = '';
  let accessToken = '';
  let syncStatus = '';
  let selectedBank = null;

  // Load config from localStorage on mount
  onMount(() => {
    const saved = localStorage.getItem('plaid_config');
    if (saved) {
      try {
        plaidConfig = JSON.parse(saved);
        client = new PlaidClient(plaidConfig);
      } catch (e) {
        // ignore
      }
    }
  });

  function saveConfig() {
    localStorage.setItem('plaid_config', JSON.stringify(plaidConfig));
    client = new PlaidClient(plaidConfig);
    error = '';
  }

  async function initiateLink() {
    loading = true;
    error = '';
    try {
      const result = await client.createLinkToken('money-user-' + Date.now());
      if (result.success) {
        linkToken = result.link_token;
        showLink = true;
        // In production, this would open Plaid Link
        // For now, we simulate the flow
        if (result.mock) {
          // Mock flow: simulate bank selection
          publicToken = `public-sandbox-mock-${Date.now()}`;
          await exchangeToken();
        }
      } else {
        error = result.error || 'Fehler beim Erstellen des Link Tokens';
      }
    } catch (err) {
      error = err.message;
    }
    loading = false;
  }

  async function exchangeToken() {
    loading = true;
    error = '';
    try {
      const result = await client.exchangePublicToken(publicToken);
      if (result.success) {
        accessToken = result.access_token;
        await fetchAccounts();
        await fetchTransactions();
      } else {
        error = result.error || 'Fehler beim Austauschen des Tokens';
      }
    } catch (err) {
      error = err.message;
    }
    loading = false;
  }

  async function fetchAccounts() {
    loading = true;
    try {
      const result = await client.getAccounts(accessToken);
      if (result.success) {
        accounts = result.accounts;
      } else {
        error = result.error || 'Fehler beim Abrufen der Konten';
      }
    } catch (err) {
      error = err.message;
    }
    loading = false;
  }

  async function fetchTransactions() {
    loading = true;
    syncStatus = 'Synchronisiere...';
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const result = await client.getTransactions(accessToken, startDate, endDate);
      if (result.success) {
        transactions = normalizePlaidTransactions(result.transactions);
        syncStatus = `${transactions.length} Transaktionen synchronisiert`;
      } else {
        error = result.error || 'Fehler beim Abrufen der Transaktionen';
        syncStatus = '';
      }
    } catch (err) {
      error = err.message;
      syncStatus = '';
    }
    loading = false;
  }

  async function disconnect() {
    if (!accessToken) return;
    loading = true;
    try {
      await client.removeItem(accessToken);
      accessToken = '';
      accounts = [];
      transactions = [];
      syncStatus = '';
    } catch (err) {
      error = err.message;
    }
    loading = false;
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  const bankList = Object.entries(PLAID_BANK_INFO);
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold flex items-center gap-2">
      <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm">🏦</span>
      Bankverbindung (Plaid)
    </h3>
    {#if accessToken}
      <span class="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
        Verbunden
      </span>
    {:else if client.isMock}
      <span class="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full">
        Mock-Modus
      </span>
    {:else}
      <span class="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
        Live
      </span>
    {/if}
  </div>

  {#if error}
    <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
      {error}
    </div>
  {/if}

  {#if !accessToken}
    <!-- Configuration -->
    <div class="space-y-4 mb-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plaid Client ID</label>
        <input
          type="text"
          bind:value={plaidConfig.clientId}
          placeholder="Optional — leer für Mock-Modus"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plaid Secret</label>
        <input
          type="password"
          bind:value={plaidConfig.secret}
          placeholder="Optional — leer für Mock-Modus"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Umgebung</label>
        <select
          bind:value={plaidConfig.env}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="sandbox">Sandbox</option>
          <option value="development">Development</option>
          <option value="production">Production</option>
        </select>
      </div>
      <button
        on:click={saveConfig}
        class="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
      >
        Konfiguration speichern
      </button>
    </div>

    <!-- Bank Selection -->
    <div class="mb-4">
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">Bank auswählen:</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {#each bankList as [key, bank]}
          <button
            on:click={() => selectedBank = key}
            class="p-3 rounded-lg border-2 text-sm font-medium transition-all {selectedBank === key ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'}"
          >
            {bank.name}
          </button>
        {/each}
      </div>
    </div>

    <button
      on:click={initiateLink}
      disabled={loading}
      class="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
    >
      {#if loading}
        <span class="inline-flex items-center gap-2">
          <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Verbinde...
        </span>
      {:else}
        🏦 Bank verbinden
      {/if}
    </button>

    <p class="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
      {client.isMock ? 'Mock-Modus: Simulierte Bankdaten ohne echte API-Calls' : 'Live-Modus: Echte Plaid API wird verwendet'}
    </p>
  {:else}
    <!-- Connected State -->
    <div class="space-y-4">
      <!-- Accounts -->
      <div>
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Verbundene Konten</h4>
        <div class="space-y-2">
          {#each accounts as acc}
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p class="font-medium text-sm">{acc.name}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{acc.type} • {acc.subtype || ''}</p>
              </div>
              <span class="font-bold text-sm">{formatCurrency(acc.balances.current)}</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Sync Status -->
      {#if syncStatus}
        <div class="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
          ✓ {syncStatus}
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex gap-2">
        <button
          on:click={fetchTransactions}
          disabled={loading}
          class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          🔄 Sync
        </button>
        <button
          on:click={disconnect}
          disabled={loading}
          class="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          Trennen
        </button>
      </div>

      <!-- Recent Transactions -->
      {#if transactions.length > 0}
        <div>
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Letzte Transaktionen</h4>
          <div class="space-y-1 max-h-48 overflow-y-auto">
            {#each transactions.slice(0, 10) as tx}
              <div class="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm">
                <div class="flex-1 min-w-0">
                  <p class="truncate font-medium">{tx.description}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{tx.date}</p>
                </div>
                <span class="font-bold text-sm" class:text-green-600={tx.amount >= 0} class:text-red-600={tx.amount < 0}>
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
