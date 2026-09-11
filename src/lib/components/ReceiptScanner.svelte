<script>
  import { scanReceipt, parseReceiptText, toTransaction, initOCR, terminateOCR } from '$lib/receipt-scanner';
  import { getAllCategories, categorize } from '$lib/categorizer';
  
  let fileInput;
  let scanning = false;
  let scanResult = null;
  let error = '';
  let ocrProgress = 0;
  let ocrStatus = '';
  let preview = null;
  let editMode = false;
  let editedTransaction = null;
  
  const categories = getAllCategories();
  
  async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    error = '';
    scanResult = null;
    scanning = true;
    ocrProgress = 0;
    ocrStatus = 'Initialisiere OCR...';
    
    // Preview
    preview = URL.createObjectURL(file);
    
    try {
      ocrStatus = 'Texterkennung läuft...';
      ocrProgress = 30;
      
      const ocrResult = await scanReceipt(file);
      
      ocrProgress = 70;
      ocrStatus = 'Daten extrahieren...';
      
      const parsed = parseReceiptText(ocrResult);
      
      if (!parsed || parsed.total === 0) {
        throw new Error('Keine erkennbaren Daten auf dem Beleg gefunden');
      }
      
      ocrProgress = 90;
      
      const transaction = toTransaction(parsed);
      scanResult = {
        transaction,
        parsed,
        ocr: {
          confidence: ocrResult.confidence,
          text: ocrResult.text.substring(0, 500)
        }
      };
      
      editedTransaction = { ...transaction };
      ocrProgress = 100;
      ocrStatus = 'Fertig!';
      
    } catch (err) {
      error = err.message || 'Scan fehlgeschlagen';
      scanResult = null;
    } finally {
      scanning = false;
    }
  }
  
  function startEdit() {
    editMode = true;
    editedTransaction = { ...scanResult.transaction };
  }
  
  function cancelEdit() {
    editMode = false;
    editedTransaction = { ...scanResult.transaction };
  }
  
  function saveEdit() {
    scanResult.transaction = { ...editedTransaction };
    editMode = false;
  }
  
  function formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  }
  
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE');
  }
  
  function getConfidenceClass(confidence) {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }
  
  function reset() {
    scanResult = null;
    error = '';
    preview = null;
    editMode = false;
    if (fileInput) fileInput.value = '';
  }
  
  function onDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50');
  }
  
  function onDragLeave(event) {
    event.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
  }
  
  function onDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileSelect({ target: { files } });
    }
  }
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
  <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
    <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm">📷</span>
    Beleg scannen
  </h3>
  
  <!-- Upload Area -->
  {#if !scanResult && !scanning}
    <div
      class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center transition-colors cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
      on:click={() => fileInput.click()}
      on:dragover={onDragOver}
      on:dragleave={onDragLeave}
      on:drop={onDrop}
    >
      <div class="text-4xl mb-3">📸</div>
      <p class="text-gray-600 dark:text-gray-400 mb-2">
        Beleg-Foto hierher ziehen oder klicken
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-500">
        Unterstützt: JPG, PNG, WebP
      </p>
      <input
        bind:this={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        on:change={handleFileSelect}
        class="hidden"
      />
    </div>
  {/if}
  
  <!-- Scanning Progress -->
  {#if scanning}
    <div class="text-center py-8">
      {#if preview}
        <img src={preview} alt="Vorschau" class="max-h-48 mx-auto rounded-lg mb-4 object-contain" />
      {/if}
      <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
        <div class="bg-indigo-600 h-2 rounded-full transition-all duration-300" style="width: {ocrProgress}%"></div>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400">{ocrStatus}</p>
      <p class="text-xs text-gray-500 mt-1">Konfidenz: {ocrProgress}%</p>
    </div>
  {/if}
  
  <!-- Error -->
  {#if error}
    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
      <p class="text-red-600 dark:text-red-400 text-sm">{error}</p>
      <button on:click={reset} class="mt-2 text-sm text-red-600 hover:text-red-700 underline">
        Erneut versuchen
      </button>
    </div>
  {/if}
  
  <!-- Scan Result -->
  {#if scanResult}
    <div class="space-y-4">
      <!-- Preview & Confidence -->
      <div class="flex gap-4">
        {#if preview}
          <img src={preview} alt="Beleg" class="w-24 h-24 object-cover rounded-lg" />
        {/if}
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium">Erkennung:</span>
            <span class="text-sm font-bold {getConfidenceClass(scanResult.ocr.confidence)}">
              {scanResult.ocr.confidence.toFixed(0)}%
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {#if scanResult.parsed.items.length > 0}
              {scanResult.parsed.items.length} Positionen erkannt
            {:else}
              Keine Einzelpositionen erkannt
            {/if}
          </p>
        </div>
      </div>
      
      <!-- Transaction Details -->
      {#if !editMode}
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
          <div class="flex justify-between items-start">
            <div>
              <p class="font-semibold">{scanResult.transaction.description}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(scanResult.transaction.date)}
                {#if scanResult.transaction.time}
                  · {scanResult.transaction.time}
                {/if}
              </p>
            </div>
            <p class="text-xl font-bold text-red-600">
              {formatCurrency(scanResult.transaction.amount)}
            </p>
          </div>
          
          <div class="flex flex-wrap gap-2 text-sm">
            <span class="px-2 py-1 rounded-full text-white" style="background-color: {categories.find(c => c.id === scanResult.transaction.category)?.color || '#6b7280'}">
              {categories.find(c => c.id === scanResult.transaction.category)?.name || scanResult.transaction.category}
            </span>
            {#if scanResult.transaction.tax}
              <span class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-full">
                MwSt: {formatCurrency(scanResult.transaction.tax)}
              </span>
            {/if}
            <span class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-full">
              {scanResult.transaction.currency}
            </span>
          </div>
          
          <!-- Items -->
          {#if scanResult.parsed.items.length > 0}
            <div class="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Positionen:</p>
              <div class="space-y-1 max-h-32 overflow-y-auto">
                {#each scanResult.parsed.items as item}
                  <div class="flex justify-between text-sm">
                    <span class="truncate flex-1">{item.description}</span>
                    <span class="ml-2">{formatCurrency(-Math.abs(item.amount))}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <!-- Edit Mode -->
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1">Händler</label>
            <input
              type="text"
              bind:value={editedTransaction.description}
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1">Betrag</label>
              <input
                type="number"
                step="0.01"
                bind:value={editedTransaction.amount}
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Datum</label>
              <input
                type="date"
                bind:value={editedTransaction.date}
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">Kategorie</label>
            <select
              bind:value={editedTransaction.category}
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            >
              {#each categories as cat}
                <option value={cat.id}>{cat.name}</option>
              {/each}
            </select>
          </div>
        </div>
      {/if}
      
      <!-- Actions -->
      <div class="flex gap-2">
        {#if !editMode}
          <button
            on:click={startEdit}
            class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
          >
            Bearbeiten
          </button>
          <button
            on:click={() => dispatch('save', scanResult.transaction)}
            class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
          >
            Speichern
          </button>
        {:else}
          <button
            on:click={cancelEdit}
            class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
          >
            Abbrechen
          </button>
          <button
            on:click={saveEdit}
            class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
          >
            Übernehmen
          </button>
        {/if}
        <button
          on:click={reset}
          class="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm transition-colors"
        >
          Neu
        </button>
      </div>
      
      <!-- Raw OCR Text (collapsible) -->
      <details class="text-xs">
        <summary class="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          Rohtext anzeigen
        </summary>
        <pre class="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto whitespace-pre-wrap text-gray-600 dark:text-gray-400">{scanResult.ocr.text}</pre>
      </details>
    </div>
  {/if}
</div>
