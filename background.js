// Default configuration if none are saved
const DEFAULT_CONFIG = {
  redirectPrefixes: [
    { url: 'https://sci-hub.ru/', name: 'Academic Access Russia', active: true },
    { url: 'https://sci-hub.st/', name: 'Academic Access Streamlined', active: false },
    { url: 'https://sci-hub.se/', name: 'Academic Access Sweden', active: false },
    { url: 'https://sci-hub.ee/', name: 'Academic Access Estonia', active: false },
    { url: 'https://sci-hub.ren/', name: 'Academic Access Alternative', active: false }
  ],
  urlPatterns: [
    { 
      name: 'DOI Links',
      pattern: 'doi.org',
      type: 'hostContains',
      active: true,
      description: 'Automatically detect DOI links from research papers'
    },
    {
      name: 'arXiv Papers', 
      pattern: 'arxiv.org',
      type: 'hostContains',
      active: false,
      description: 'Detect arXiv preprint links'
    },
    {
      name: 'IEEE Papers',
      pattern: 'ieee.org',
      type: 'hostContains', 
      active: false,
      description: 'Detect IEEE research papers'
    },
    {
      name: 'PubMed Articles',
      pattern: 'pubmed.ncbi.nlm.nih.gov',
      type: 'hostContains',
      active: true,
      description: 'Detect PubMed research articles'
    }
  ],
  settings: {
    resolveDOIs: false, // Whether to attempt DOI resolution (disabled by default to avoid CORS errors)
    enableSciHubErrorDetection: true, // Whether to detect Sci-Hub error pages
    preCheckSciHub: false, // Whether to pre-check Sci-Hub availability before redirecting (disabled for now)
    debugMode: false, // Whether to enable debug logging
    doiResolutionTimeout: 2000, // Timeout for DOI resolution in milliseconds
    errorDetectionDelay: 1000, // Delay before checking for Sci-Hub errors in milliseconds
    autoPrefixRotation: false, // Whether to automatically try next prefix on failure
    showNotifications: true, // Whether to show browser notifications for important events
    showHoverTooltips: true, // Whether to show hover tooltips on redirectable links
    legalWarningAcknowledged: false // Whether user has acknowledged legal warnings
  }
};

// Legal disclaimer that should be shown to users
const LEGAL_DISCLAIMER = {
  title: "Important Legal Notice",
  message: "This extension is for educational purposes only. Users are responsible for ensuring compliance with copyright laws and institutional policies. Accessing copyrighted materials without authorization may violate applicable laws.",
  acknowledgment: "By using this extension, you acknowledge that you understand these risks and agree to use it responsibly and in compliance with applicable laws."
};

// State variables
let isEnabled = true;
let redirectPrefixes = DEFAULT_CONFIG.redirectPrefixes;
let urlPatterns = DEFAULT_CONFIG.urlPatterns;
let settings = DEFAULT_CONFIG.settings;
let activePrefixIndex = 0;

// Error tracking
let errorCount = 0;
let lastError = null;
let errorHistory = [];

// Initialize on startup
chrome.runtime.onStartup.addListener(loadSettings);
chrome.runtime.onInstalled.addListener(loadSettings);

/**
 * Log and track errors with user-friendly messages
 */
function logError(error, context = '', userMessage = '') {
  errorCount++;
  lastError = {
    message: error.message || error,
    context: context,
    timestamp: new Date().toISOString(),
    userMessage: userMessage
  };
  
  errorHistory.push(lastError);
  
  // Keep only last 10 errors
  if (errorHistory.length > 10) {
    errorHistory.shift();
  }
  
  if (settings.debugMode) {
    console.error(`[DOI Redirect] ${context}:`, error);
  }
  
  // Show notification if enabled
  if (settings.showNotifications && userMessage) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'DOI Redirect Extension',
      message: userMessage
    }).catch(() => {
      // Ignore notification errors
    });
  }
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyError(error) {
  if (error.message && error.message.includes('CORS')) {
    return 'Unable to access this URL due to browser security restrictions. Try disabling DOI Resolution in settings.';
  }
  if (error.message && error.message.includes('timeout')) {
    return 'Request timed out. The server may be slow or unavailable.';
  }
  if (error.message && error.message.includes('network')) {
    return 'Network error. Please check your internet connection.';
  }
  return 'An unexpected error occurred. Please try again or check the extension settings.';
}

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(['enabled', 'redirectPrefixes', 'urlPatterns', 'activePrefixIndex', 'settings'], (result) => {
    isEnabled = result.enabled !== undefined ? result.enabled : true;
    redirectPrefixes = result.redirectPrefixes || DEFAULT_CONFIG.redirectPrefixes;
    urlPatterns = result.urlPatterns || DEFAULT_CONFIG.urlPatterns;
    settings = result.settings || DEFAULT_CONFIG.settings;
    activePrefixIndex = result.activePrefixIndex !== undefined ? result.activePrefixIndex : 0;
    
    // Ensure activePrefixIndex is valid
    if (activePrefixIndex >= redirectPrefixes.length) {
      activePrefixIndex = 0;
    }
  });
}

// Listen for messages from popup and options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleEnabled') {
    isEnabled = request.enabled;
    sendResponse({ success: true });
  } 
  else if (request.action === 'getState') {
    sendResponse({ 
      enabled: isEnabled,
      redirectPrefixes: redirectPrefixes,
      urlPatterns: urlPatterns,
      settings: settings,
      activePrefixIndex: activePrefixIndex,
      errorCount: errorCount,
      lastError: lastError,
      errorHistory: errorHistory.slice(-5) // Last 5 errors
    });
  }
  else if (request.action === 'updateConfig') {
    redirectPrefixes = request.redirectPrefixes || redirectPrefixes;
    urlPatterns = request.urlPatterns || urlPatterns;
    settings = request.settings || settings;
    activePrefixIndex = request.activePrefixIndex !== undefined ? request.activePrefixIndex : activePrefixIndex;
    sendResponse({ success: true });
  }
  else if (request.action === 'setActivePrefix') {
    activePrefixIndex = request.index;
    chrome.storage.sync.set({ activePrefixIndex: activePrefixIndex });
    sendResponse({ success: true });
  }
  else if (request.action === 'tryNextPrefix') {
    activePrefixIndex = (activePrefixIndex + 1) % redirectPrefixes.length;
    chrome.storage.sync.set({ activePrefixIndex: activePrefixIndex });
    sendResponse({ 
      success: true, 
      newIndex: activePrefixIndex,
      prefix: redirectPrefixes[activePrefixIndex]
    });
  }
  else if (request.action === 'fallbackToOriginal') {
    const tabId = request.tabId;
    const originalUrl = originalUrls.get(tabId);
    
    if (originalUrl) {
      console.log('Falling back to original URL:', originalUrl);
      chrome.tabs.update(tabId, { url: originalUrl });
      originalUrls.delete(tabId); // Clean up
      sendResponse({ success: true });
    } else {
      console.warn('No original URL found for fallback');
      sendResponse({ success: false });
    }
  }
  else if (request.action === 'storeTestUrl') {
    // Store a test URL for error detection testing
    originalUrls.set(request.tabId, request.originalUrl);
    console.log('Test URL stored:', request.originalUrl);
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open for async response
});

// Store original URLs for fallback when Sci-Hub errors occur
const originalUrls = new Map();

// Intercept navigation based on configured patterns
chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    // Only intercept main frame navigation
    if (details.frameId !== 0) {
      return;
    }

    // Check if extension is enabled
    if (!isEnabled) {
      return;
    }

    // Check if we have valid configuration
    if (!redirectPrefixes || redirectPrefixes.length === 0) {
      console.error("No redirect prefixes configured");
      return;
    }

    const url = details.url;

    // Check if URL matches any active patterns
    if (matchesUrlPattern(url, urlPatterns)) {
      // Store original URL for potential fallback
      originalUrls.set(details.tabId, url);
      
      // Get the active prefix
      const activePrefix = redirectPrefixes[activePrefixIndex];
      
      if (!activePrefix || !activePrefix.url) {
        console.error('Invalid active prefix');
        return;
      }

      // Determine target URL (with or without DOI resolution)
      let targetUrl = url;
      if (settings.resolveDOIs) {
        // Use DOI resolution if enabled
        resolveDOIToFinalUrl(url, (finalUrl) => {
          targetUrl = finalUrl || url;
          handleRedirect(details.tabId, activePrefix.url, targetUrl, settings.preCheckSciHub);
        });
      } else {
        // Skip DOI resolution, but still clean DOI URLs before redirecting
        const cleanedUrl = cleanDOIUrl(targetUrl);
        handleRedirect(details.tabId, activePrefix.url, cleanedUrl, settings.preCheckSciHub);
      }
    }
  },
  {
    url: [
      { hostContains: 'doi.org' },
      { hostContains: 'arxiv.org' },
      { hostContains: 'ieee.org' },
      { hostContains: 'springer.com' },
      { hostContains: 'nature.com' },
      { hostContains: 'science.org' },
      { hostContains: 'pubmed.ncbi.nlm.nih.gov' }
    ]
  }
);

// Listen for completed navigation to check for Sci-Hub error pages
chrome.webNavigation.onCompleted.addListener(
  (details) => {
    // Only check main frame navigation
    if (details.frameId !== 0) {
      return;
    }

    // Check if this is a Sci-Hub URL and we have a stored original URL
    if (isSciHubUrl(details.url) && originalUrls.has(details.tabId) && settings.enableSciHubErrorDetection) {
      console.log('Sci-Hub page loaded, checking for errors:', details.url);
      
      // Add a delay to ensure page content is loaded
      setTimeout(() => {
        // Inject script to check page content for error
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          func: checkForSciHubError,
          args: [details.tabId, settings.errorDetectionDelay || 1000]
        }).catch(error => {
          console.warn('Could not inject error detection script:', error);
          // Fallback: try to detect error without script injection
          detectErrorFallback(details.tabId);
        });
      }, settings.errorDetectionDelay || 1000);
    }
  },
  {
    url: [
      { hostContains: 'sci-hub.ru' },
      { hostContains: 'sci-hub.st' },
      { hostContains: 'sci-hub.se' },
      { hostContains: 'sci-hub.ee' },
      { hostContains: 'sci-hub.ren' }
    ]
  }
);

// Clean up stored URLs when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  originalUrls.delete(tabId);
});

/**
 * Handle redirect with improved error detection
 */
function handleRedirect(tabId, prefixUrl, targetUrl, preCheckEnabled) {
  // For now, we'll use the existing approach but with faster error detection
  // The pre-checking feature can be implemented later if needed
  const redirectUrl = `${prefixUrl}${targetUrl}`;
  chrome.tabs.update(tabId, { url: redirectUrl });
}

/**
 * Clean and normalize DOI URLs for proper Sci-Hub access
 * Handles URL encoding issues and creates proper DOI identifiers
 */
function cleanDOIUrl(originalUrl) {
  try {
    // First decode any URL encoding
    const decodedUrl = decodeURIComponent(originalUrl);
    console.log('Original URL:', originalUrl);
    console.log('Decoded URL:', decodedUrl);
    
    // Check if this is a DOI URL
    if (decodedUrl.includes('doi.org/')) {
      // Extract the DOI identifier after doi.org/
      const doiId = decodedUrl.split('doi.org/')[1];
      
      if (doiId) {
        // Clean the DOI identifier (remove any trailing slashes, fragments, etc.)
        const cleanDOIId = doiId.split('#')[0].split('?')[0].replace(/\/$/, '');
        
        // Create clean DOI URL
        const cleanDOUrl = `https://doi.org/${cleanDOIId}`;
        console.log('Clean DOI URL:', cleanDOUrl);
        
        return cleanDOUrl;
      }
    }
    
    // If not a DOI URL, return the decoded original URL
    return decodedUrl;
    
  } catch (error) {
    console.error('Error cleaning DOI URL:', error);
    return originalUrl;
  }
}

/**
 * Resolve DOI URL to its final destination URL
 * Handles URL encoding issues like doi.org/10.1038%2Fnature11163
 * Simplified approach that gracefully handles CORS restrictions
 */
async function resolveDOIToFinalUrl(originalUrl, callback) {
  try {
    // Clean the URL first
    const cleanUrl = cleanDOIUrl(originalUrl);
    
    // Check if this is a DOI URL
    if (cleanUrl.includes('doi.org/')) {
      // Extract the DOI identifier
      const doiId = cleanUrl.split('doi.org/')[1];
      
      if (doiId) {
        // Try to resolve DOI with a simple approach that handles CORS gracefully
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // Shorter timeout
          
          const response = await fetch(cleanUrl, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          // Check if the URL changed (indicating a redirect)
          if (response.url !== cleanUrl) {
            console.log('DOI resolved to:', response.url);
            callback(response.url);
            return;
          }
          
        } catch (fetchError) {
          // CORS errors and other fetch errors are expected and handled gracefully
          const userMessage = getUserFriendlyError(fetchError);
          logError(fetchError, 'DOI Resolution', userMessage);
        }
      }
    }
    
    // If DOI resolution failed or not a DOI, use cleaned URL
    callback(cleanUrl);
    
  } catch (error) {
    console.error('Error resolving URL:', error);
    callback(originalUrl);
  }
}

/**
 * Check if a URL is a Sci-Hub URL
 */
function isSciHubUrl(url) {
  const sciHubDomains = [
    'sci-hub.ru',
    'sci-hub.st', 
    'sci-hub.se',
    'sci-hub.ee',
    'sci-hub.ren'
  ];
  
  return sciHubDomains.some(domain => url.includes(domain));
}

/**
 * Function to be injected into Sci-Hub pages to check for error content
 */
function checkForSciHubError(tabId, delay = 1000) {
  // Wait a bit more to ensure page is fully loaded
  setTimeout(() => {
    console.log('Checking Sci-Hub page for errors...');
    
    // Multiple error message patterns to check
    const errorPatterns = [
      'Cтатья отсутствует в базе', // Russian: Article is not in the database
      'Статья отсутствует в базе', // Alternative Russian spelling
      'Article not found',
      'Document not found',
      'Error 404',
      'Not found',
      'Страница не найдена', // Russian: Page not found
      'Ошибка 404', // Russian: Error 404
      'This article is not available',
      'The requested document could not be found'
    ];
    
    // Get page content
    const bodyText = document.body ? document.body.innerText.toLowerCase() : '';
    const pageTitle = document.title ? document.title.toLowerCase() : '';
    const pageContent = (bodyText + ' ' + pageTitle).toLowerCase();
    
    console.log('Page content preview:', pageContent.substring(0, 200));
    
    // Check for any error patterns
    const hasError = errorPatterns.some(pattern => 
      pageContent.includes(pattern.toLowerCase())
    );
    
    if (hasError) {
      console.log('Sci-Hub error detected, falling back to original URL');
      
      // Send message to background script to redirect to original URL
      chrome.runtime.sendMessage({
        action: 'fallbackToOriginal',
        tabId: tabId
      });
    } else {
      console.log('No error detected, page appears to be working');
    }
  }, delay);
}

/**
 * Fallback error detection when script injection fails
 */
function detectErrorFallback(tabId) {
  console.log('Using fallback error detection for tab:', tabId);
  
  // Try to get page info without script injection
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.warn('Could not get tab info:', chrome.runtime.lastError);
      return;
    }
    
    // Check if URL suggests an error (some Sci-Hub mirrors redirect to error pages)
    const errorIndicators = [
      'error',
      'not-found',
      '404',
      'unavailable'
    ];
    
    const hasErrorIndicator = errorIndicators.some(indicator => 
      tab.url && tab.url.toLowerCase().includes(indicator)
    );
    
    if (hasErrorIndicator) {
      console.log('Error detected via URL pattern, falling back to original URL');
      chrome.runtime.sendMessage({
        action: 'fallbackToOriginal',
        tabId: tabId
      });
    }
  });
}

/**
 * Check if a URL matches any of the configured patterns
 */
function matchesUrlPattern(url, patterns) {
  if (!patterns || patterns.length === 0) {
    return false;
  }

  return patterns.some(pattern => {
    if (!pattern.active) {
      return false;
    }

    switch (pattern.type) {
      case 'hostContains':
        return url.includes(pattern.pattern);
      case 'startsWith':
        return url.startsWith(pattern.pattern);
      case 'exact':
        return url === pattern.pattern;
      case 'regex':
        try {
          return new RegExp(pattern.pattern).test(url);
        } catch (e) {
          console.error('Invalid regex pattern:', pattern.pattern);
          return false;
        }
      default:
        return false;
    }
  });
}