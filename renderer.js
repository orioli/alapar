const LEFT_HOME = 'https://www.linkedin.com/feed/';
const RIGHT_HOME = 'https://www.linkedin.com/feed/';

// Scroll synchronization
let isScrolling = false;
let leftWv = null;
let rightWv = null;

function syncScroll(sourceSide, targetSide) {
  if (isScrolling) return;
  isScrolling = true;
  
  const sourceWv = sourceSide === 'left' ? leftWv : rightWv;
  const targetWv = targetSide === 'left' ? leftWv : rightWv;
  
  if (!sourceWv || !targetWv) {
    isScrolling = false;
    return;
  }
  
  // Get scroll position from source webview
  sourceWv.executeJavaScript(`
    window.scrollY
  `).then(scrollY => {
    // Apply scroll position to target webview
    targetWv.executeJavaScript(`
      window.scrollTo(0, ${scrollY});
    `);
  }).catch(err => {
    console.log('Scroll sync error:', err);
  }).finally(() => {
    // Reset flag after a short delay to prevent infinite loops
    setTimeout(() => { isScrolling = false; }, 100);
  });
}

function wirePane(side) {
  const pane = document.querySelector(`.pane-controls[data-target="${side}"]`);
  const wv = document.getElementById(`wv-${side}`);
  const urlInput = document.getElementById(`url-${side}`);

  pane.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    if (action === 'go') {
      const url = urlInput.value.trim();
      if (url) wv.loadURL(url.startsWith('http') ? url : `https://${url}`);
    }
    if (action === 'back') wv.canGoBack() && wv.goBack();
    if (action === 'forward') wv.canGoForward() && wv.goForward();
    if (action === 'reload') wv.reload();
    if (action === 'home') wv.loadURL(side === 'left' ? LEFT_HOME : RIGHT_HOME);
    if (action === 'reset') {
      // Clear the webview partition and reload
      wv.loadURL('about:blank');
      setTimeout(() => {
        wv.loadURL(side === 'left' ? LEFT_HOME : RIGHT_HOME);
        urlInput.value = side === 'left' ? LEFT_HOME : RIGHT_HOME;
      }, 100);
    }
    if (action === 'test-search') {
      // Test search synchronization by sending a test message
      console.log(`Testing search sync from ${side} panel`);
      const targetSide = side === 'left' ? 'right' : 'left';
      executeSearch(targetSide, 'TEST_SEARCH_FROM_' + side.toUpperCase());
    }
  });

  // Keep URL bar in sync on navigation
  wv.addEventListener('did-navigate', (e) => urlInput.value = e.url);
  wv.addEventListener('did-navigate-in-page', (e) => urlInput.value = e.url);
  
  // Store webview references for scroll sync
  if (side === 'left') leftWv = wv;
  if (side === 'right') rightWv = wv;
  
  // Clean up listeners when webview navigates to prevent memory leaks
  wv.addEventListener('did-start-loading', () => {
    console.log(`Webview ${side} started loading, cleaning up old listeners`);
  });
  
  // Add scroll synchronization
  wv.addEventListener('dom-ready', () => {
    console.log(`Webview ${side} DOM ready`);
    
    // Wait a bit for the page to fully load
    setTimeout(() => {
      // Inject scroll event listener into the webview
      wv.executeJavaScript(`
        console.log('Setting up scroll listener for ${side}');
        
        let lastScrollY = window.scrollY;
        let scrollTimeout;
        
        function handleScroll() {
          const currentScrollY = window.scrollY;
          if (Math.abs(currentScrollY - lastScrollY) > 10) {
            lastScrollY = currentScrollY;
            console.log('${side} scrolled to:', currentScrollY);
            
            // Send scroll event to parent
            window.parent.postMessage({
              type: 'scroll',
              side: '${side}',
              scrollY: currentScrollY
            }, '*');
          }
        }
        
        // Use both scroll and wheel events for better coverage
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('wheel', (e) => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(handleScroll, 50);
        }, { passive: true });
        
        // Also listen for touch events on mobile
        window.addEventListener('touchmove', (e) => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(handleScroll, 100);
        }, { passive: true });
        
        // Test message to verify communication
        setTimeout(() => {
          window.parent.postMessage({
            type: 'test',
            side: '${side}',
            message: 'Scroll listener setup complete'
          }, '*');
        }, 500);
        
        // Test search detection
        setTimeout(() => {
          console.log('${side}: Testing search detection...');
          const testInputs = document.querySelectorAll('input, textarea');
          console.log('${side}: Total inputs found:', testInputs.length);
          testInputs.forEach((input, i) => {
            console.log('${side}: Input', i, ':', input.type, input.placeholder, input.id);
          });
        }, 2000);
        
        // Search synchronization - simplified and fixed
        let searchInputs = [];
        let lastSearchText = '';
        
        // Find all search inputs and textareas
        function findSearchInputs() {
          searchInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="search"], input[placeholder*="search"], input[placeholder*="Search"], textarea'));
          console.log('${side}: Found', searchInputs.length, 'search inputs');
        }
        
        // Add event listeners to all search inputs
        function addSearchListeners() {
          searchInputs.forEach(function(input, index) {
            if (!input.dataset.searchListenerAdded) {
              input.dataset.searchListenerAdded = 'true';
              console.log('${side}: Adding search listener to input', index);
              
              // Listen for Enter key press
              input.addEventListener('keydown', function(e) {
                console.log('${side}: Keydown event on input', index, 'key:', e.key);
                if (e.key === 'Enter' && input.value.trim()) {
                  const searchText = input.value.trim();
                  if (searchText !== lastSearchText) {
                    lastSearchText = searchText;
                    console.log('${side}: Search detected:', searchText);
                    
                    // Send search event to parent
                    window.parent.postMessage({
                      type: 'search',
                      side: '${side}',
                      searchText: searchText
                    }, '*');
                    console.log('${side}: Search message sent to parent');
                  }
                }
              });
            }
          });
        }
        
        // Initial setup
        findSearchInputs();
        addSearchListeners();
        
        // Re-check for search inputs periodically
        setInterval(function() {
          console.log('${side}: Periodic search input check');
          findSearchInputs();
          addSearchListeners();
        }, 5000);
        
        // Test search functionality after 3 seconds
        setTimeout(function() {
          console.log('${side}: Testing search message sending...');
          window.parent.postMessage({
            type: 'search',
            side: '${side}',
            searchText: 'TEST_SEARCH_${side}'
          }, '*');
        }, 3000);
      `);
    }, 1000);
  });
}

wirePane('left');
wirePane('right');

// Global message listener for scroll synchronization and search
window.addEventListener('message', (e) => {
  if (e.data.type === 'scroll') {
    console.log('Received scroll message:', e.data);
    const sourceSide = e.data.side;
    const targetSide = sourceSide === 'left' ? 'right' : 'left';
    syncScroll(sourceSide, targetSide);
  }
  if (e.data.type === 'test') {
    console.log('Test message received:', e.data);
  }
  if (e.data.type === 'search') {
    console.log('Received search message:', e.data);
    const sourceSide = e.data.side;
    const targetSide = sourceSide === 'left' ? 'right' : 'left';
    executeSearch(targetSide, e.data.searchText);
  }
});

// Function to execute search on the target panel
function executeSearch(targetSide, searchText) {
  const targetWv = targetSide === 'left' ? leftWv : rightWv;
  
  if (!targetWv) {
    console.log('Target webview not ready for search');
    return;
  }
  
  console.log(`Executing search "${searchText}" on ${targetSide} panel`);
  console.log('Target webview:', targetWv);
  
  // First, let's check if the webview is ready and has content
  targetWv.executeJavaScript(`
    console.log('Webview ${targetSide} is ready for search execution');
    console.log('Document ready state:', document.readyState);
    console.log('Current URL:', window.location.href);
    
    // Check if we're on a valid page
    if (document.readyState !== 'complete') {
      console.log('Document not ready, waiting...');
      return 'document_not_ready';
    }
    
    // Find search inputs
    const searchInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="search"], input[placeholder*="search"], input[placeholder*="Search"], textarea'));
    console.log('Found search inputs:', searchInputs.length);
    
    if (searchInputs.length > 0) {
      // Log details of the first search input
      const searchInput = searchInputs[0];
      console.log('First search input:', {
        type: searchInput.type,
        placeholder: searchInput.placeholder,
        id: searchInput.id,
        className: searchInput.className,
        value: searchInput.value
      });
      
      // Focus on the first search input
      searchInput.focus();
      searchInput.value = '${searchText}';
      
      // Trigger input event to update any UI
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Press Enter to submit the search
      searchInput.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      }));
      
      console.log('Search executed on ${targetSide} panel:', '${searchText}');
      return 'search_executed';
    } else {
      console.log('No search inputs found on ${targetSide} panel');
      return 'no_search_inputs';
    }
  `).then(result => {
    console.log(`Search execution result on ${targetSide} panel:`, result);
    if (result === 'search_executed') {
      console.log(`Search "${searchText}" successfully executed on ${targetSide} panel`);
    } else if (result === 'document_not_ready') {
      console.log(`Document not ready on ${targetSide} panel, retrying in 1 second...`);
      setTimeout(() => executeSearch(targetSide, searchText), 1000);
    } else if (result === 'no_search_inputs') {
      console.log(`No search inputs found on ${targetSide} panel`);
    }
  }).catch(err => {
    console.log(`Error executing search on ${targetSide} panel:`, err);
    console.log('Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
  });
}

// Alternative direct scroll sync approach
function setupDirectScrollSync() {
  if (!leftWv || !rightWv) {
    console.log('Webviews not ready yet, retrying...');
    setTimeout(setupDirectScrollSync, 500);
    return;
  }
  
  console.log('Setting up direct scroll sync...');
  
  // Monitor scroll position changes directly
  let lastLeftScroll = 0;
  let lastRightScroll = 0;
  
  setInterval(() => {
    if (isScrolling) return;
    
    // Check left webview scroll
    leftWv.executeJavaScript('window.scrollY').then(scrollY => {
      if (Math.abs(scrollY - lastLeftScroll) > 10) {
        lastLeftScroll = scrollY;
        console.log('Left scrolled to:', scrollY);
        syncScroll('left', 'right');
      }
    }).catch(err => console.log('Left scroll check error:', err));
    
    // Check right webview scroll
    rightWv.executeJavaScript('window.scrollY').then(scrollY => {
      if (Math.abs(scrollY - lastRightScroll) > 10) {
        lastRightScroll = scrollY;
        console.log('Right scrolled to:', scrollY);
        syncScroll('right', 'left');
      }
    }).catch(err => console.log('Right scroll check error:', err));
  }, 100);
}

console.log('Renderer script loaded, waiting for webviews to be ready...');

// Start direct scroll sync after a delay
setTimeout(setupDirectScrollSync, 2000);