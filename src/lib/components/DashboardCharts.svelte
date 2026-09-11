<script>
  import { onMount } from 'svelte';
  import {
    Chart,
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    LineController,
    BarController,
    DoughnutController,
    PieController,
    RadialLinearScale,
    Filler
  } from 'chart.js';

  Chart.register(
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    LineController,
    BarController,
    DoughnutController,
    PieController,
    RadialLinearScale,
    Filler
  );

  export let monthlyOverview = [];
  export let budgetProgress = [];
  export let savingsProgress = null;
  export let transactions = [];

  let incomeExpenseChart = null;
  let categoryChart = null;
  let trendChart = null;

  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  function formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  function createIncomeExpenseChart() {
    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return;

    const labels = monthlyOverview.map(m => {
      const parts = m.month.split('-');
      const year = parts[0];
      const month = parts[1];
      return monthNames[parseInt(month) - 1] + ' ' + year.slice(2);
    });

    if (incomeExpenseChart) incomeExpenseChart.destroy();

    incomeExpenseChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Einnahmen',
            data: monthlyOverview.map(m => m.income),
            backgroundColor: 'rgba(34, 197, 94, 0.7)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Ausgaben',
            data: monthlyOverview.map(m => m.expenses),
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { size: 12, weight: '500' }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: ctx2 => ctx2.dataset.label + ': ' + formatCurrency(ctx2.raw)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: v => formatCurrency(v)
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  function createCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const categoryTotals = {};
    const categoryColors = {
      food: '#f97316',
      transport: '#3b82f6',
      entertainment: '#a855f7',
      shopping: '#ec4899',
      housing: '#14b8a6',
      health: '#ef4444',
      education: '#6366f1',
      other: '#6b7280'
    };

    for (const t of transactions) {
      if (t.amount >= 0) continue;
      const cat = t.category || 'other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
    }

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = labels.map(l => categoryColors[l] || '#6b7280');

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.map(c => c + 'cc'),
          borderColor: colors,
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              padding: 12,
              font: { size: 11 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: ctx2 => ctx2.label + ': ' + formatCurrency(ctx2.raw)
            }
          }
        }
      }
    });
  }

  function createTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx || monthlyOverview.length < 2) return;

    const labels = monthlyOverview.map(m => {
      const parts = m.month.split('-');
      const year = parts[0];
      const month = parts[1];
      return monthNames[parseInt(month) - 1] + ' ' + year.slice(2);
    });

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Saldo',
          data: monthlyOverview.map(m => m.balance),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: ctx2 => formatCurrency(ctx2.raw)
            }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: v => formatCurrency(v)
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  onMount(() => {
    createIncomeExpenseChart();
    createCategoryChart();
    createTrendChart();
  });

  $: if (monthlyOverview && monthlyOverview.length > 0) createIncomeExpenseChart();
  $: if (transactions && transactions.length > 0) createCategoryChart();
  $: if (monthlyOverview && monthlyOverview.length > 1) createTrendChart();
</script>

<div class="space-y-6">
  {#if monthlyOverview && monthlyOverview.length > 0}
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
      <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm">📊</span>
        Einnahmen vs Ausgaben
      </h3>
      <div class="h-64 sm:h-80">
        <canvas id="incomeExpenseChart"></canvas>
      </div>
    </div>
  {/if}

  {#if transactions && transactions.length > 0}
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
      <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm">🍩</span>
        Ausgaben nach Kategorie
      </h3>
      <div class="h-64 sm:h-72">
        <canvas id="categoryChart"></canvas>
      </div>
    </div>
  {/if}

  {#if monthlyOverview && monthlyOverview.length > 1}
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
      <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-sm">📈</span>
        Saldo-Trend
      </h3>
      <div class="h-64 sm:h-72">
        <canvas id="trendChart"></canvas>
      </div>
    </div>
  {/if}
</div>
