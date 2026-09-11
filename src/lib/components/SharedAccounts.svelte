<script>
  import { createSharedAccount, addMember, removeMember, updateMemberRole, hasPermission, splitTransaction, getSharedAccountSummary, generateInvite, calculateMemberBalances, MEMBER_ROLE, SHARED_ACCOUNT_STATUS, PERMISSIONS } from '$lib/shared-accounts';
  import { getAllCategories } from '$lib/categorizer';
  
  export let sharedAccounts = [];
  export let transactions = [];
  
  let showCreateModal = false;
  let showInviteModal = false;
  let selectedAccount = null;
  let inviteCode = '';
  let newAccount = { name: '', description: '', currency: 'EUR' };
  let newMemberEmail = '';
  let newMemberRole = MEMBER_ROLE.MEMBER;
  let error = '';
  
  const categories = getAllCategories();
  const roleLabels = {
    [MEMBER_ROLE.OWNER]: 'Besitzer',
    [MEMBER_ROLE.ADMIN]: 'Admin',
    [MEMBER_ROLE.MEMBER]: 'Mitglied',
    [MEMBER_ROLE.VIEWER]: 'Betrachter'
  };
  
  function createAccount() {
    if (!newAccount.name.trim()) {
      error = 'Name ist erforderlich';
      return;
    }
    
    const account = createSharedAccount({
      name: newAccount.name,
      description: newAccount.description,
      currency: newAccount.currency,
      createdBy: 'current_user' // In echter App: Benutzer-ID
    });
    
    sharedAccounts = [...sharedAccounts, account];
    newAccount = { name: '', description: '', currency: 'EUR' };
    showCreateModal = false;
    error = '';
  }
  
  function deleteAccount(accountId) {
    sharedAccounts = sharedAccounts.filter(a => a.id !== accountId);
    if (selectedAccount?.id === accountId) selectedAccount = null;
  }
  
  function selectAccount(account) {
    selectedAccount = account;
  }
  
  function addMemberToAccount() {
    if (!newMemberEmail.trim() || !selectedAccount) return;
    
    try {
      const updated = addMember(selectedAccount, newMemberEmail, newMemberRole, 'current_user');
      sharedAccounts = sharedAccounts.map(a => a.id === updated.id ? updated : a);
      selectedAccount = updated;
      newMemberEmail = '';
      newMemberRole = MEMBER_ROLE.MEMBER;
    } catch (err) {
      error = err.message;
    }
  }
  
  function removeMemberFromAccount(userId) {
    if (!selectedAccount) return;
    
    try {
      const updated = removeMember(selectedAccount, userId);
      sharedAccounts = sharedAccounts.map(a => a.id === updated.id ? updated : a);
      selectedAccount = updated;
    } catch (err) {
      error = err.message;
    }
  }
  
  function changeMemberRole(userId, newRole) {
    if (!selectedAccount) return;
    
    try {
      const updated = updateMemberRole(selectedAccount, userId, newRole);
      sharedAccounts = sharedAccounts.map(a => a.id === updated.id ? updated : a);
      selectedAccount = updated;
    } catch (err) {
      error = err.message;
    }
  }
  
  function generateInviteCode() {
    if (!selectedAccount) return;
    const invite = generateInvite(selectedAccount, 'current_user');
    inviteCode = invite.code;
  }
  
  function copyInviteCode() {
    navigator.clipboard.writeText(inviteCode);
  }
  
  function getSummary(account) {
    return getSharedAccountSummary(account, transactions);
  }
  
  function getBalances(account) {
    return calculateMemberBalances(account, transactions);
  }
  
  function formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
  }
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold flex items-center gap-2">
      <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm">👥</span>
      Gemeinsame Konten
    </h3>
    <button
      on:click={() => showCreateModal = true}
      class="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium transition-colors"
    >
      + Neues Konto
    </button>
  </div>
  
  <!-- Account List -->
  {#if sharedAccounts.length === 0}
    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
      <div class="text-4xl mb-2">👥</div>
      <p class="text-sm">Noch keine gemeinsamen Konten</p>
      <p class="text-xs mt-1">Erstelle ein Konto für Familie oder Paar</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      {#each sharedAccounts as account}
        <button
          on:click={() => selectAccount(account)}
          class="p-3 rounded-xl border-2 text-left transition-colors {selectedAccount?.id === account.id ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-teal-300'}"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium text-sm truncate">{account.name}</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
              {account.members.filter(m => m.status === 'active').length} 👤
            </span>
          </div>
          {#if getSummary(account)}
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {formatCurrency(getSummary(account).balance, account.currency)}
            </p>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
  
  <!-- Selected Account Details -->
  {#if selectedAccount}
    <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-semibold">{selectedAccount.name}</h4>
        <button
          on:click={() => { selectedAccount = null; }}
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ×
        </button>
      </div>
      
      <!-- Summary -->
      {#if getSummary(selectedAccount)}
        {@const summary = getSummary(selectedAccount)}
        <div class="grid grid-cols-3 gap-2 mb-4">
          <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
            <p class="text-xs text-green-600 dark:text-green-400">Einnahmen</p>
            <p class="text-sm font-bold text-green-700 dark:text-green-300">{formatCurrency(summary.totalIncome, selectedAccount.currency)}</p>
          </div>
          <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
            <p class="text-xs text-red-600 dark:text-red-400">Ausgaben</p>
            <p class="text-sm font-bold text-red-700 dark:text-red-300">{formatCurrency(summary.totalExpenses, selectedAccount.currency)}</p>
          </div>
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
            <p class="text-xs text-blue-600 dark:text-blue-400">Saldo</p>
            <p class="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(summary.balance, selectedAccount.currency)}</p>
          </div>
        </div>
      {/if}
      
      <!-- Members -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <h5 class="text-sm font-medium">Mitglieder</h5>
          <button
            on:click={() => showInviteModal = true}
            class="text-xs text-teal-600 hover:text-teal-700"
          >
            + Einladen
          </button>
        </div>
        <div class="space-y-2">
          {#each selectedAccount.members as member}
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {member.userId.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p class="text-sm font-medium">{member.userId}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{roleLabels[member.role]}</p>
                </div>
              </div>
              {#if member.role !== MEMBER_ROLE.OWNER}
                <button
                  on:click={() => removeMemberFromAccount(member.userId)}
                  class="text-red-400 hover:text-red-600 text-sm"
                >
                  ×
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </div>
      
      <!-- Balances -->
      {#if getBalances(selectedAccount).length > 0}
        <div class="mb-4">
          <h5 class="text-sm font-medium mb-2">Salden</h5>
          <div class="space-y-1">
            {#each getBalances(selectedAccount) as balance}
              <div class="flex items-center justify-between text-sm">
                <span>{balance.userId}</span>
                <span class="{balance.status === 'owed' ? 'text-green-600' : balance.status === 'owes' ? 'text-red-600' : 'text-gray-500'}">
                  {#if balance.status === 'owed'}
                    erhält {formatCurrency(balance.balance, selectedAccount.currency)}
                  {:else if balance.status === 'owes'}
                    schuldt {formatCurrency(Math.abs(balance.balance), selectedAccount.currency)}
                  {:else}
                    ausgeglichen
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      
      <!-- Settings -->
      <details class="text-sm">
        <summary class="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2">
          Einstellungen
        </summary>
        <div class="space-y-2 pl-2">
          <label class="flex items-center gap-2">
            <input type="checkbox" bind:checked={selectedAccount.settings.autoCategorize} class="rounded" />
            <span>Auto-Kategorisierung</span>
          </label>
          <label class="flex items-center gap-2">
            <input type="checkbox" bind:checked={selectedAccount.settings.allowMemberInvite} class="rounded" />
            <span>Mitglieder können einladen</span>
          </label>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Aufteilung</label>
            <select bind:value={selectedAccount.settings.splitBy} class="text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1">
              <option value="equal">Gleichmäßig</option>
              <option value="percentage">Prozentual</option>
              <option value="custom">Benutzerdefiniert</option>
            </select>
          </div>
        </div>
      </details>
    </div>
  {/if}
</div>

<!-- Create Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" on:click|self={() => showCreateModal = false}>
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
      <h3 class="text-lg font-semibold mb-4">Neues gemeinsames Konto</h3>
      
      {#if error}
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
          <p class="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      {/if}
      
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            bind:value={newAccount.name}
            placeholder="z.B. Familienkonto"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Beschreibung</label>
          <input
            type="text"
            bind:value={newAccount.description}
            placeholder="Optional"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Währung</label>
          <select
            bind:value={newAccount.currency}
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
            <option value="CHF">CHF</option>
          </select>
        </div>
      </div>
      
      <div class="flex gap-2 mt-4">
        <button
          on:click={() => showCreateModal = false}
          class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
        >
          Abbrechen
        </button>
        <button
          on:click={createAccount}
          class="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium transition-colors"
        >
          Erstellen
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Invite Modal -->
{#if showInviteModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" on:click|self={() => showInviteModal = false}>
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
      <h3 class="text-lg font-semibold mb-4">Mitglied einladen</h3>
      
      {#if error}
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
          <p class="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      {/if}
      
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1">Benutzer-ID / E-Mail</label>
          <input
            type="text"
            bind:value={newMemberEmail}
            placeholder="user@example.com"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Rolle</label>
          <select
            bind:value={newMemberRole}
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            <option value={MEMBER_ROLE.ADMIN}>Admin</option>
            <option value={MEMBER_ROLE.MEMBER}>Mitglied</option>
            <option value={MEMBER_ROLE.VIEWER}>Betrachter</option>
          </select>
        </div>
      </div>
      
      {#if inviteCode}
        <div class="mt-4 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
          <p class="text-sm font-medium mb-1">Einladungscode:</p>
          <div class="flex items-center gap-2">
            <code class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded border border-teal-200 dark:border-teal-700 font-mono text-lg">{inviteCode}</code>
            <button
              on:click={copyInviteCode}
              class="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
            >
              Kopieren
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-1">Gültig für 48 Stunden</p>
        </div>
      {/if}
      
      <div class="flex gap-2 mt-4">
        <button
          on:click={() => showInviteModal = false}
          class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
        >
          Schließen
        </button>
        {#if !inviteCode}
          <button
            on:click={generateInviteCode}
            class="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium transition-colors"
          >
            Code generieren
          </button>
        {:else}
          <button
            on:click={addMemberToAccount}
            class="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium transition-colors"
          >
            Direkt einladen
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
