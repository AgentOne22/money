<script>
  export let budgetProgress = [];
  export let currentMonth = '';
  export let currentYear = 0;

  function formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  function getStatusColor(status) {
    switch (status) {
      case 'ok': return 'from-green-400 to-green-600';
      case 'warning': return 'from-yellow-400 to-orange-500';
      case 'exceeded': return 'from-red-400 to-red-600';
      default: return 'from-gray-400 to-gray-600';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'ok': return '✓';
      case 'warning': return '⚠';
      case 'exceeded': return '✗';
      default: return '•';
    }
  }

  function getStatusBg(status) {
    switch (status) {
      case 'ok': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'exceeded': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  $: totalBudget = budgetProgress.reduce((sum, b) => sum + b.limit, 0);
  $: totalSpent = budgetProgress.reduce((sum, b) => sum + b.spent, 0);
  $: overallPercentage = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  $: exceededCount = budgetProgress.filter(b => b.status === 'exceeded').length;
  $: warningCount = budgetProgress.filter(b => b.status === 'warning').length;
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
    <div>
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm">📊</span>
        Budget-Übersicht
      </h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {monthNames[currentMonth - 1]} {currentYear}
      </p>
    </div>
    <div class="mt-3 sm:mt-0 flex items-center gap-3">
      {#if exceededCount > 0}
        <span class="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          {exceededCount} überschritten
        </span>
      {/if}
      {#if warningCount > 0}
        <span class="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          {warningCount} Warnung{warningCount > 1 ? 'en' : ''}
        </span>
      {/if}
    </div>
  </div>

  <!-- Overall Budget Summary -->
  <div class="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-100 dark:border-indigo-800">
    <div class="flex justify-between items-center mb-2">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Gesamtbudget</span>
      <span class="text-sm font-bold">{formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}</span>
    </div>
    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
      <div
        class="h-3 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-500"
        style="width: {overallPercentage}%"
      ></div>
    </div>
    <p class="text-xs text-gray-500 mt-1">{overallPercentage}% verbraucht</p>
  </div>

  <!-- Category Budgets -->
  <div class="space-y-3">
    {#each budgetProgress as item}
      <div class="p-3 rounded-xl border {getStatusBg(item.status)} transition-all hover:shadow-sm">
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium capitalize">{item.category}</span>
            <span class="text-xs px-1.5 py-0.5 rounded-full
              {item.status === 'ok' ? 'bg-green-100 text-green-700' : ''}
              {item.status === 'warning' ? 'bg-yellow-100 text-yellow-700' : ''}
              {item.status === 'exceeded' ? 'bg-red-100 text-red-700' : ''}
            ">
              {getStatusIcon(item.status)}
            </span>
          </div>
          <span class="text-sm font-semibold">
            {formatCurrency(item.spent)} <span class="text-gray-400">/</span> {formatCurrency(item.limit)}
          </span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 overflow-hidden">
          <div
            class="h-2.5 rounded-full bg-gradient-to-r {getStatusColor(item.status)} transition-all duration-500"
            style="width: {Math.min(item.percentage, 100)}%"
          ></div>
        </div>
        <div class="flex justify-between mt-1">
          <span class="text-xs text-gray-500">{item.percentage}% verbraucht</span>
          {#if item.remaining > 0}
            <span class="text-xs text-gray-500">{formatCurrency(item.remaining)} übrig</span>
          {:else if item.remaining < 0}
            <span class="text-xs text-red-500 font-medium">{formatCurrency(Math.abs(item.remaining))} überzogen</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
