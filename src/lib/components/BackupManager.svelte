<script>
  import { onMount } from 'svelte';
  import { createBackup, exportBackupToJSON, importBackup, BackupError, generateBackupFilename } from '$lib/backup';
  import { downloadFile } from '$lib/export';

  let showImport = false;
  let importError = '';
  let importSuccess = '';
  let backupHistory = [];
  let showBackupConfirm = false;

  // Form selections
  let backupSelection = {
    transactions: true,
    budgets: true,
    savingsGoals: true,
    recurringTransactions: true,
    alertHistory: true,
    alertSettings: true,
    exportSchedules: true,
    userPreferences: true
  };

  onMount(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('money_backup_history');
      if (saved) {
        try {
          backupHistory = JSON.parse(saved);
        } catch (e) {
          backupHistory = [];
        }
      }
    }
  });

  function saveHistory() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('money_backup_history', JSON.stringify(backupHistory.slice(0, 10)));
    }
  }

  function exportBackup(data) {
    try {
      const json = exportBackupToJSON(data);
      const filename = generateBackupFilename();
      downloadFile(json, filename, 'application/json');
      
      // Add to history
      backupHistory.unshift({
        filename,
        timestamp: new Date().toISOString(),
        size: json.length,
        type: 'export'
      });
      saveHistory();
      
      return { success: true, filename };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    importError = '';
    importSuccess = '';

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = importBackup(e.target.result);
        importSuccess = `Backup erfolgreich importiert (${result.backup.stats.transactionCount} Transaktionen)`;
        
        // Add to history
        backupHistory.unshift({
          filename: file.name,
          timestamp: new Date().toISOString(),
          size: file.size,
          type: 'import'
        });
        saveHistory();
        
        // Dispatch event for parent component to handle data update
        const event = new CustomEvent('backupImported', { detail: result.data });
        window.dispatchEvent(event);
        
        showImport = false;
      } catch (err) {
        if (err instanceof BackupError) {
          importError = err.message;
        } else {
          importError = `Fehler beim Import: ${err.message}`;
        }
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    return Math.round(bytes / 1024 * 10) / 10 + ' KB';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Props for parent component to trigger export
  export let onExportRequested = null;
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold flex items-center gap-2">
      <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-sm">💾</span>
      Backup & Restore
    </h3>
    <div class="flex gap-2">
      <button
        class="text-sm px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        on:click={() => onExportRequested && onExportRequested()}
      >
        Exportieren
      </button>
      <button
        class="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        on:click={() => showImport = !showImport}
      >
        Importieren
      </button>
    </div>
  </div>

  <!-- Import Section -->
  {#if showImport}
    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
      <h4 class="text-sm font-medium mb-3">Backup importieren</h4>
      <input
        type="file"
        accept=".json"
        on:change={handleImport}
        class="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900 dark:file:text-indigo-300"
      />
      {#if importError}
        <p class="mt-2 text-sm text-red-500">{importError}</p>
      {/if}
      {#if importSuccess}
        <p class="mt-2 text-sm text-emerald-500">{importSuccess}</p>
      {/if}
    </div>
  {/if}

  <!-- Backup History -->
  {#if backupHistory.length > 0}
    <div>
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Letzte Backups</h4>
      <div class="space-y-2 max-h-48 overflow-y-auto">
        {#each backupHistory as backup}
          <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p class="text-sm font-medium">{backup.filename}</p>
              <p class="text-xs text-gray-500">
                {formatDate(backup.timestamp)} • {formatFileSize(backup.size)}
                <span class="ml-2 px-1.5 py-0.5 rounded text-xs {backup.type === 'export' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}">
                  {backup.type === 'export' ? 'Export' : 'Import'}
                </span>
              </p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <p class="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
      Noch keine Backups vorhanden.
    </p>
  {/if}
</div>
