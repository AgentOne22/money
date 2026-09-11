<script>
  import { onMount } from 'svelte';
  import {
    GOAL_STATUS,
    GOAL_PRIORITY,
    GOAL_CATEGORY,
    createFinancialGoal,
    calculateGoalProgress,
    addGoalContribution,
    getGoalsSummary,
    generateSavingsRecommendations,
    projectGoalsCompletion
  } from '$lib/goals';

  export let goals = [];

  let showAddForm = false;
  let selectedGoal = null;
  let contributionAmount = 0;
  let contributionNote = '';

  // Form fields for new goal
  let newName = '';
  let newCategory = GOAL_CATEGORY.GENERAL;
  let newTarget = 0;
  let newCurrent = 0;
  let newDeadline = '';
  let newMonthly = 0;
  let newInterest = 0;
  let newPriority = GOAL_PRIORITY.MEDIUM;

  const categoryIcons = {
    emergency: '🛡️',
    retirement: '🏖️',
    vacation: '🏖️',
    car: '🚗',
    home: '🏠',
    education: '📚',
    debt_repayment: '💳',
    investment: '📈',
    wedding: '💒',
    general: '🎯'
  };

  const categoryLabels = {
    emergency: 'Notfallreserve',
    retirement: 'Rente',
    vacation: 'Urlaub',
    car: 'Auto',
    home: 'Wohnen',
    education: 'Bildung',
    debt_repayment: 'Schulden',
    investment: 'Investition',
    wedding: 'Hochzeit',
    general: 'Allgemein'
  };

  const priorityLabels = {
    low: 'Niedrig',
    medium: 'Mittel',
    high: 'Hoch',
    critical: 'Kritisch'
  };

  const priorityColors = {
    low: 'from-gray-400 to-gray-500',
    medium: 'from-blue-400 to-blue-600',
    high: 'from-orange-400 to-orange-600',
    critical: 'from-red-400 to-red-600'
  };

  $: summary = getGoalsSummary(goals);
  $: projections = projectGoalsCompletion(goals);

  function addGoal() {
    if (!newName || newTarget <= 0) return;

    const goal = createFinancialGoal({
      name: newName,
      category: newCategory,
      targetAmount: newTarget,
      currentAmount: newCurrent,
      deadline: newDeadline || null,
      monthlyContribution: newMonthly,
      interestRate: newInterest,
      priority: newPriority
    });

    goals = [...goals, goal];

    // Reset form
    newName = '';
    newCategory = GOAL_CATEGORY.GENERAL;
    newTarget = 0;
    newCurrent = 0;
    newDeadline = '';
    newMonthly = 0;
    newInterest = 0;
    newPriority = GOAL_PRIORITY.MEDIUM;
    showAddForm = false;
  }

  function addToGoal(goal, amount) {
    if (amount <= 0) return;
    addGoalContribution(goal, amount, null, contributionNote);
    goals = goals; // Trigger reactivity
    contributionAmount = 0;
    contributionNote = '';
    selectedGoal = null;
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
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
    return Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
  }
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-lg">🎯</div>
      <div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">SMART-Ziele</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">{goals.length} aktive Ziele</p>
      </div>
    </div>
    <button
      on:click={() => showAddForm = !showAddForm}
      class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
    >
      {#if showAddForm}
        ✕
      {:else}
        +
      {/if}
    </button>
  </div>

  <!-- Summary Cards -->
  {#if goals.length > 0}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
        <p class="text-xs text-emerald-600 dark:text-emerald-400">Gespart</p>
        <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(summary.totalSaved)}</p>
      </div>
      <div class="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
        <p class="text-xs text-emerald-600 dark:text-emerald-400">Zielbetrag</p>
        <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(summary.totalTarget)}</p>
      </div>
      <div class="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
        <p class="text-xs text-emerald-600 dark:text-emerald-400">Fortschritt</p>
        <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{summary.overallPercentage}%</p>
      </div>
      <div class="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
        <p class="text-xs text-emerald-600 dark:text-emerald-400">Auf Kurs</p>
        <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{summary.onTrackCount}/{summary.totalGoals}</p>
      </div>
    </div>
  {/if}

  <!-- Add Goal Form -->
  {#if showAddForm}
    <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
      <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-4">Neues SMART-Ziel</h4>
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input type="text" bind:value={newName} placeholder="z.B. Notfallreserve" class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategorie</label>
            <select bind:value={newCategory} class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
              {#each Object.entries(categoryLabels) as [id, label]}
                <option value={id}>{label}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorität</label>
            <select bind:value={newPriority} class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
              <option value={GOAL_PRIORITY.LOW}>Niedrig</option>
              <option value={GOAL_PRIORITY.MEDIUM}>Mittel</option>
              <option value={GOAL_PRIORITY.HIGH}>Hoch</option>
              <option value={GOAL_PRIORITY.CRITICAL}>Kritisch</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zielbetrag (€)</label>
            <input type="number" bind:value={newTarget} min="0" class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aktuell (€)</label>
            <input type="number" bind:value={newCurrent} min="0" class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline</label>
            <input type="date" bind:value={newDeadline} class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monatlich (€)</label>
            <input type="number" bind:value={newMonthly} min="0" class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zinsen (%)</label>
            <input type="number" bind:value={newInterest} min="0" max="20" step="0.1" class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
        </div>
        <button
          on:click={addGoal}
          disabled={!newName || newTarget <= 0}
          class="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Ziel erstellen
        </button>
      </div>
    </div>
  {/if}

  <!-- Goals List -->
  <div class="space-y-4">
    {#each goals as goal}
      {@const progress = calculateGoalProgress(goal)}
      {@const daysLeft = getDaysRemaining(goal.deadline)}
      <div class="p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br {priorityColors[goal.priority]} flex items-center justify-center text-lg">
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
            <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{progress.percentage}%</p>
            <p class="text-xs text-gray-500">erreicht</p>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden mb-2">
          <div
            class="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
            style="width: {progress.percentage}%"
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
            {#if progress.monthsToGoal !== null && progress.monthsToGoal > 0}
              <div class="flex items-center gap-1.5">
                <span class="text-gray-400">🎯</span>
                <span class="text-gray-600 dark:text-gray-400">
                  {progress.monthsToGoal} Monate
                </span>
              </div>
            {/if}
            {#if progress.onTrack !== undefined}
              <div class="flex items-center gap-1.5">
                <span class="text-gray-400">{progress.onTrack ? '✅' : '⚠️'}</span>
                <span class="{progress.onTrack ? 'text-green-600' : 'text-orange-500'}">
                  {progress.onTrack ? 'Auf Kurs' : 'Nicht auf Kurs'}
                </span>
              </div>
            {/if}
          </div>

          <!-- Interest Projection -->
          {#if goal.interestRate > 0 && goal.deadline && progress.projectedTotal > goal.currentAmount}
            <div class="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs">
              <span class="text-blue-600 dark:text-blue-400">
                💰 Mit {goal.interestRate}% Zinsen: ~{formatCurrency(progress.projectedTotal)}
              </span>
            </div>
          {/if}
        </div>

        <!-- Add Contribution -->
        <div class="mt-3 flex gap-2">
          <input
            type="number"
            bind:value={contributionAmount}
            min="0"
            placeholder="Betrag"
            class="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
          />
          <button
            on:click={() => addToGoal(goal, contributionAmount)}
            disabled={contributionAmount <= 0}
            class="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>
    {/each}
  </div>

  {#if goals.length === 0}
    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
      <p class="text-4xl mb-2">🎯</p>
      <p class="font-medium">Noch keine SMART-Ziele</p>
      <p class="text-sm mt-1">Erstelle dein erstes Finanzziel!</p>
    </div>
  {/if}

  <!-- Projections -->
  {#if projections.length > 0}
    <div class="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
      <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Projektierte Erfüllung</h4>
      <div class="space-y-2">
        {#each projections as proj}
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">{proj.name}</span>
            <span class="font-medium {proj.onTrack ? 'text-green-600' : 'text-orange-500'}">
              {proj.projectedCompletionDate || 'Unbekannt'}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
