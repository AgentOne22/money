<script>
  import { onMount } from 'svelte';
  import { 
    ExportScheduler, 
    createExportSchedule, 
    SCHEDULE_FREQUENCIES, 
    EXPORT_FORMATS,
    getScheduleStats 
  } from '$lib/scheduler';

  let scheduler = new ExportScheduler();
  let schedules = [];
  let showAddForm = false;
  let editingSchedule = null;
  
  // Form fields
  let newName = 'Automatischer Export';
  let newFrequency = SCHEDULE_FREQUENCIES.WEEKLY;
  let newFormat = EXPORT_FORMATS.CSV;
  let newTime = '08:00';

  onMount(() => {
    // Load from localStorage if available
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('money_export_schedules');
      if (saved) {
        try {
          scheduler = ExportScheduler.fromJSON(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load schedules:', e);
        }
      }
    }
    schedules = scheduler.getSchedules();
  });

  function save() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('money_export_schedules', JSON.stringify(scheduler.toJSON()));
    }
    schedules = scheduler.getSchedules();
  }

  function addSchedule() {
    const schedule = createExportSchedule({
      name: newName,
      frequency: newFrequency,
      format: newFormat,
      startTime: newTime
    });
    scheduler.addSchedule(schedule);
    save();
    showAddForm = false;
    resetForm();
  }

  function removeSchedule(id) {
    scheduler.removeSchedule(id);
    save();
  }

  function toggleSchedule(schedule) {
    scheduler.updateSchedule(schedule.id, { enabled: !schedule.enabled });
    save();
  }

  function resetForm() {
    newName = 'Automatischer Export';
    newFrequency = SCHEDULE_FREQUENCIES.WEEKLY;
    newFormat = EXPORT_FORMATS.CSV;
    newTime = '08:00';
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

  function getFrequencyLabel(freq) {
    const labels = {
      [SCHEDULE_FREQUENCIES.DAILY]: 'Täglich',
      [SCHEDULE_FREQUENCIES.WEEKLY]: 'Wöchentlich',
      [SCHEDULE_FREQUENCIES.BIWEEKLY]: 'Alle 2 Wochen',
      [SCHEDULE_FREQUENCIES.MONTHLY]: 'Monatlich',
      [SCHEDULE_FREQUENCIES.QUARTERLY]: 'Quartalsweise'
    };
    return labels[freq] || freq;
  }

  function getFormatLabel(fmt) {
    const labels = {
      [EXPORT_FORMATS.CSV]: 'CSV',
      [EXPORT_FORMATS.PDF]: 'PDF',
      [EXPORT_FORMATS.JSON]: 'JSON',
      [EXPORT_FORMATS.ALL]: 'Alle Formate'
    };
    return labels[fmt] || fmt;
  }

  function getStats(schedule) {
    return getScheduleStats(schedule);
  }
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold flex items-center gap-2">
      <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-sm">📅</span>
      Export Scheduler
    </h3>
    <button
      class="text-sm px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      on:click={() => showAddForm = !showAddForm}
    >
      {showAddForm ? 'Abbrechen' : '+ Hinzufügen'}
    </button>
  </div>

  <!-- Add Form -->
  {#if showAddForm}
    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
      <h4 class="text-sm font-medium mb-3">Neuen Export planen</h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-gray-500 mb-1">Name</label>
          <input
            type="text"
            bind:value={newName}
            class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Frequenz</label>
          <select
            bind:value={newFrequency}
            class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
          >
            <option value={SCHEDULE_FREQUENCIES.DAILY}>Täglich</option>
            <option value={SCHEDULE_FREQUENCIES.WEEKLY}>Wöchentlich</option>
            <option value={SCHEDULE_FREQUENCIES.BIWEEKLY}>Alle 2 Wochen</option>
            <option value={SCHEDULE_FREQUENCIES.MONTHLY}>Monatlich</option>
            <option value={SCHEDULE_FREQUENCIES.QUARTERLY}>Quartalsweise</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Format</label>
          <select
            bind:value={newFormat}
            class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
          >
            <option value={EXPORT_FORMATS.CSV}>CSV</option>
            <option value={EXPORT_FORMATS.PDF}>PDF</option>
            <option value={EXPORT_FORMATS.JSON}>JSON</option>
            <option value={EXPORT_FORMATS.ALL}>Alle Formate</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Uhrzeit</label>
          <input
            type="time"
            bind:value={newTime}
            class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
          />
        </div>
      </div>
      <button
        class="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
        on:click={addSchedule}
      >
        Speichern
      </button>
    </div>
  {/if}

  <!-- Schedule List -->
  {#if schedules.length === 0}
    <p class="text-gray-500 dark:text-gray-400 text-center py-6 text-sm">
      Keine geplanten Exports. Füge einen hinzu, um automatische Backups zu erstellen.
    </p>
  {:else}
    <div class="space-y-3">
      {#each schedules as schedule (schedule.id)}
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <button
                class="w-10 h-6 rounded-full transition-colors relative {schedule.enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}"
                on:click={() => toggleSchedule(schedule)}
              >
                <span class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform {schedule.enabled ? 'translate-x-4' : ''}"></span>
              </button>
              <div>
                <p class="font-medium text-sm">{schedule.name}</p>
                <p class="text-xs text-gray-500">
                  {getFrequencyLabel(schedule.frequency)} • {getFormatLabel(schedule.format)} • {schedule.nextRun ? formatDate(schedule.nextRun) : 'Nicht geplant'}
                </p>
              </div>
            </div>
            <button
              class="text-red-400 hover:text-red-600 text-sm p-1"
              on:click={() => removeSchedule(schedule.id)}
            >
              ×
            </button>
          </div>
          {#if getStats(schedule).totalRuns > 0}
            <div class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div class="flex gap-4 text-xs text-gray-500">
                <span>Ausführungen: {getStats(schedule).totalRuns}</span>
                <span>Erfolgsrate: {getStats(schedule).successRate}%</span>
                <span>Letzter: {schedule.lastRun ? formatDate(schedule.lastRun) : '—'}</span>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
