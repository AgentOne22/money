<script>
  import '../app.css';
  
  // Detect mobile for adaptive UI
  let isMobile = false;
  let isStandalone = false;
  
  if (typeof window !== 'undefined') {
    isMobile = /iPhone|iPad|iPod|Android/i.test(window.navigator.userAgent);
    isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                   window.navigator.standalone === true;
  }
  
  $: safeClass = isStandalone ? 'safe-top safe-bottom' : '';
</script>

<main class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 {safeClass}">
  <slot />
</main>
