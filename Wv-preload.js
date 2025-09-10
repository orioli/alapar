// wv-preload.js (runs inside each <webview> page, isolated world)
(() => {
    // Send scroll events up to the host (safe cross-origin postMessage)
    let lastY = 0;
    const send = (type, payload) => window.top.postMessage({ source: 'wv', type, ...payload }, '*');
  
    window.addEventListener('scroll', () => {
      const y = Math.round(window.scrollY);
      if (Math.abs(y - lastY) > 10) {
        lastY = y;
        send('scroll', { y });
      }
    }, { passive: true });
  
    // Minimal “search typed + Enter” hook (generic; may or may not find LI’s input)
    const hookSearch = () => {
      const els = Array.from(document.querySelectorAll('input[type="search"], input[type="text"], textarea'));
      els.forEach(el => {
        if (el.dataset._hooked) return;
        el.dataset._hooked = '1';
        el.addEventListener('keydown', e => {
          if (e.key === 'Enter' && el.value.trim()) {
            send('search', { q: el.value.trim() });
          }
        });
      });
    };
    hookSearch();
    const mo = new MutationObserver(hookSearch);
    mo.observe(document.documentElement, { subtree: true, childList: true });
  })();