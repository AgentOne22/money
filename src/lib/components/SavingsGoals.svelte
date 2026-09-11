<script>
  export let savingsGoals = [];
  export let savingsProgress = null;
  export let totalSavings = 0;

  const categoryIcons = {
    emergency: '🛡️',
    vacation: '🏖️',
    car: '🚗',
    home: '🏠',
    education: '📚',
    retirement: '🏖️',
    general: '🎯'
  };

  const priorityColors = {
    high: 'from-red-400 to-red-600',
    medium: 'from-blue-400 to-blue-600',
    low: 'from-green-400 to-green-600'
  };

  const priorityLabels = {
    high: 'Hoch',
    medium: 'Mittel',
    low: 'Niedrig'
  };

  function formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function getDaysRemaining(deadline) {
    if (!deadline) return null;
    const now = new Date();
    const dl = new Date(deadline);
    const diff = Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function getMonthsRemaining(deadline) {
    if (!deadline) return null;
    const now = new Date();
    const dl = new Date(deadline);
    return Math.max(0, Math.floor((dl - now) / (1000 * 60 * 60 * 24 * 30.44)));
  }

  $: totalTarget = savingsGoals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
  $: totalCurrent = savingsGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  $: overallPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0;
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
    <div>
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm">🎯</span>
        Sparziele
      </h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {savingsGoals.length} {savingsGoals.length === 1 ? 'Ziel' : 'Ziele'} aktiv
      </p>
    </div>
  </div>

  <!-- Overall Progress -->
  {#if savingsGoals.length > 0}
    <div class="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-100 dark:border-emerald-800">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Gesamtfortschritt</span>
        <span class="text-sm font-bold">{formatCurrency(totalCurrent)} / {formatCurrency(totalTarget)}</span>
      </div>
      <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          class="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
          style="width: {overallPercentage}%"
        ></div>
      </div>
      <p class="text-xs text-gray-500 mt-1">{overallPercentage}% erreicht</p>
    </div>
  {/if}

  <!-- Individual Goals -->
  <div class="space-y-4">
    {#each savingsGoals as goal}
      {@const percentage = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0}
      {@const daysLeft = getDaysRemaining(goal.deadline)}
      {@const monthsLeft = getMonthsRemaining(goal.deadline)}
      {@const monthlyNeeded = goal.deadline && monthsLeft > 0 ? Math.ceil(Math.max(0, goal.targetAmount - goal.currentAmount) / monthsLeft) : null}
      <div class="p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br {priorityColors[goal.priority] || 'from-gray-400 to-gray-600'} flex items-center justify-center text-lg">
              {categoryIcons[goal.category] || '🎯'}
            </div>
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">{goal.name}</h4>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {priorityLabels[goal.priority] || 'Mittel'}
                </span>
                {#if goal.monthlyContribution > 0}
                  <span class="text-xs text-gray-500">{formatCurrency(goal.monthlyContribution)}/Monat</span>
                {/if}
              </div>
            </div>
          </div>
          <div class="text-right">
            <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{percentage}%</p>
            <p class="text-xs text-gray-500">erreicht</p>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden mb-2">
          <div
            class="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
            style="width: {percentage}%"
          ></div>
        </div>

        <div class="flex justify-between text-sm">
          <span class="text-gray-600 dark:text-gray-400">{formatCurrency(goal.currentAmount)}</span>
          <span class="text-gray-400">von {formatCurrency(goal.targetAmount)}</span>
        </div>

        <!-- Projection & Deadline -->
        <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div class="grid grid-cols-2 gap-2 text-xs">
            {#if goal.deadline}
              <div class="flex items-center gap-1.5">
                <span class="text-gray-400">📅</span>
                <span class="text-gray-600 dark:text-gray-400">{formatDate(goal.deadline)}</span>
              </div>
              {#if daysLeft !== null}
                <div class="flex items-center gap-1.5">
                  <span class="text-gray-400">⏱️</span>
                  <span class="{daysLeft < 30 ? 'text-orange-500' : 'text-gray-600 dark:text-gray-400'}">
                    {daysLeft > 0 ? `${daysLeft} Tage` : 'Abgelaufen'}
                  </span>
                </div>
              {/if}
            {/if}
            {#if monthlyNeeded !== null && monthlyNeeded > 0}
              <div class="flex items-center gap-1.5 col-span-2">
                <span class="text-gray-400">💡</span>
                <span class="text-gray-600 dark:text-gray-400">
                  {formatCurrency(monthlyNeeded)}/Monat nötig
                </span>
              </div>
            {/if}
          </div>

          <!-- Interest Projection -->
          {#if goal.interestRate > 0 && goal.deadline}
            {@const projectedTotal = goal.currentAmount * Math.pow(1 + goal.interestRate / 100 / 12, monthsLeft || 0)}
            <div class="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs">
              <span class="text-blue-600 dark:text-blue-400">💰 Mit {goal.interestRate}% Zinsen: ~{formatCurrency(projectedTotal)}</span>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  {#if savingsGoals.length === 0}
    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
      <p class="text-4xl mb-2">🎯</p>
      <p class="font-medium">Noch keine Sparziele</p>
      <p class="text-sm mt-1">Füge dein erstes Sparziel hinzu!</p>
    </div>
  {/if}
</div>
