export function createHtml(importMap: Record<string, any>, tailwindUrl?: string | null) {
  return `
<!doctype html>
<html>
<head></head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${tailwindUrl ? `<script src="${tailwindUrl}"></script>` : '<script src="https://cdn.tailwindcss.com"></script>'}
<script type="importmap">
${JSON.stringify(importMap, null, 2)}
</script>
<style>
  body { margin: 0; font-family: system-ui; }
</style>
<script>
window.addEventListener('error', (event) => {
    // 允许向上层抛出错误，模拟 AI Studio 行为
    // 但也可以在这里做一些漂亮的错误展示
    console.error('Runtime error:', event.error);
});
</script>
</head>
<body>
<div id="root"></div>

<script type="module" onerror="console.warn('Failed to load the app. Try reloading it.')">
    import '@/index';
</script>
<script>
  // Auto-refresh Tailwind when DOM changes
  (function() {
    let attempts = 0;
    const tryRefresh = () => {
      if (window.tailwind) {
        window.tailwind.config = window.tailwind.config || {};
        if (typeof window.tailwind.refresh === 'function') {
            window.tailwind.refresh();
        }
        return;
      }
      if (attempts++ < 20) setTimeout(tryRefresh, 50);
    };
    // Wait for initial render
    setTimeout(tryRefresh, 100);
  })();
</script>

</body>
</html>
`
}
