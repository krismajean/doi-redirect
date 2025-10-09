// Default configuration
const DEFAULT_CONFIG = {
  redirectPrefixes: [
    { url: 'https://sci-hub.ru/', name: 'Academic Access Russia' },
    { url: 'https://sci-hub.st/', name: 'Academic Access Streamlined' },
    { url: 'https://sci-hub.se/', name: 'Academic Access Sweden' },
    { url: 'https://sci-hub.ee/', name: 'Academic Access Estonia' },
    { url: 'https://sci-hub.ren/', name: 'Academic Access Alternative' }
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
    resolveDOIs: false,
    enableSciHubErrorDetection: true,
    preCheckSciHub: false,
    debugMode: false,
    doiResolutionTimeout: 2000,
    errorDetectionDelay: 1000,
    autoPrefixRotation: false,
    showNotifications: true,
    showHoverTooltips: true
  }
};

// State
let redirectPrefixes = [];
let urlPatterns = [];
let settings = {};
let activePrefixIndex = 0;

// DOM elements
const prefixList = document.getElementById('prefixList');
const patternList = document.getElementById('patternList');
const newPrefixName = document.getElementById('newPrefixName');
const newPrefixUrl = document.getElementById('newPrefixUrl');
const addPrefixBtn = document.getElementById('addPrefixBtn');
const resetBtn = document.getElementById('resetBtn');
const saveStatus = document.getElementById('saveStatus');

// Settings elements
const resolveDOIsCheckbox = document.getElementById('resolveDOIs');
const enableSciHubErrorDetectionCheckbox = document.getElementById('enableSciHubErrorDetection');
const preCheckSciHubCheckbox = document.getElementById('preCheckSciHub');
const debugModeCheckbox = document.getElementById('debugMode');
const doiResolutionTimeoutInput = document.getElementById('doiResolutionTimeout');
const errorDetectionDelayInput = document.getElementById('errorDetectionDelay');
const autoPrefixRotationCheckbox = document.getElementById('autoPrefixRotation');
const showNotificationsCheckbox = document.getElementById('showNotifications');
const showHoverTooltipsCheckbox = document.getElementById('showHoverTooltips');
const testErrorDetectionBtn = document.getElementById('testErrorDetection');

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);

// Event listeners
addPrefixBtn.addEventListener('click', addNewPrefix);
resetBtn.addEventListener('click', resetToDefaults);
testErrorDetectionBtn.addEventListener('click', testErrorDetection);

// Settings event listeners
resolveDOIsCheckbox.addEventListener('change', updateSettings);
enableSciHubErrorDetectionCheckbox.addEventListener('change', updateSettings);
preCheckSciHubCheckbox.addEventListener('change', updateSettings);
debugModeCheckbox.addEventListener('change', updateSettings);
doiResolutionTimeoutInput.addEventListener('change', updateSettings);
errorDetectionDelayInput.addEventListener('change', updateSettings);
autoPrefixRotationCheckbox.addEventListener('change', updateSettings);
showNotificationsCheckbox.addEventListener('change', updateSettings);
showHoverTooltipsCheckbox.addEventListener('change', updateSettings);

/**
 * Update settings when user changes them
 */
function updateSettings() {
  settings = {
    resolveDOIs: resolveDOIsCheckbox.checked,
    enableSciHubErrorDetection: enableSciHubErrorDetectionCheckbox.checked,
    preCheckSciHub: preCheckSciHubCheckbox.checked,
    debugMode: debugModeCheckbox.checked,
    doiResolutionTimeout: parseInt(doiResolutionTimeoutInput.value),
    errorDetectionDelay: parseInt(errorDetectionDelayInput.value),
    autoPrefixRotation: autoPrefixRotationCheckbox.checked,
    showNotifications: showNotificationsCheckbox.checked,
    showHoverTooltips: showHoverTooltipsCheckbox.checked
  };
  
  saveSettings();
  showStatus('Settings updated successfully!', 'success');
}

/**
 * Load configuration from storage
 */
function loadSettings() {
  chrome.storage.sync.get(['redirectPrefixes', 'urlPatterns', 'activePrefixIndex', 'settings'], (result) => {
    redirectPrefixes = result.redirectPrefixes || DEFAULT_CONFIG.redirectPrefixes;
    urlPatterns = result.urlPatterns || DEFAULT_CONFIG.urlPatterns;
    activePrefixIndex = result.activePrefixIndex !== undefined ? result.activePrefixIndex : 0;
    
    // Load settings
    settings = result.settings || DEFAULT_CONFIG.settings;
    
    // Update UI elements with loaded settings
    resolveDOIsCheckbox.checked = settings.resolveDOIs;
    enableSciHubErrorDetectionCheckbox.checked = settings.enableSciHubErrorDetection;
    preCheckSciHubCheckbox.checked = settings.preCheckSciHub;
    debugModeCheckbox.checked = settings.debugMode;
    doiResolutionTimeoutInput.value = settings.doiResolutionTimeout;
    errorDetectionDelayInput.value = settings.errorDetectionDelay;
    autoPrefixRotationCheckbox.checked = settings.autoPrefixRotation;
    showNotificationsCheckbox.checked = settings.showNotifications;
    showHoverTooltipsCheckbox.checked = settings.showHoverTooltips;
    
    renderPrefixes();
    renderPatterns();
  });
}

/**
 * Render the redirect prefixes list
 */
function renderPrefixes() {
  prefixList.innerHTML = '';
  
  redirectPrefixes.forEach((prefix, index) => {
    const prefixItem = document.createElement('div');
    prefixItem.className = 'prefix-item' + (index === activePrefixIndex ? ' active' : '');
    
    prefixItem.innerHTML = `
      <div class="prefix-radio">
        <input type="radio" name="activePrefix" value="${index}" ${index === activePrefixIndex ? 'checked' : ''}>
      </div>
      <div class="prefix-info">
        <div class="prefix-name">${prefix.name}</div>
        <div class="prefix-url">${prefix.url}</div>
      </div>
      <div class="prefix-actions">
        <button class="btn-delete" data-index="${index}">Delete</button>
      </div>
    `;
    
    prefixList.appendChild(prefixItem);
  });
  
  // Add event listeners
  document.querySelectorAll('input[name="activePrefix"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      activePrefixIndex = parseInt(e.target.value);
      saveSettings();
      renderPrefixes();
    });
  });
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      deletePrefix(index);
    });
  });
}

/**
 * Render the URL patterns list
 */
function renderPatterns() {
  patternList.innerHTML = '';
  
  urlPatterns.forEach((pattern, index) => {
    const patternItem = document.createElement('div');
    patternItem.className = 'pattern-item' + (pattern.active ? ' active' : '');
    
    patternItem.innerHTML = `
      <div class="pattern-info">
        <div class="pattern-name">${pattern.name}</div>
        <div class="pattern-match">${pattern.description}</div>
        <div class="pattern-type">Type: ${pattern.type}, Pattern: "${pattern.pattern}"</div>
      </div>
      <div class="pattern-actions">
        <label class="switch">
          <input type="checkbox" ${pattern.active ? 'checked' : ''} data-index="${index}">
          <span class="slider"></span>
        </label>
        <button class="btn-delete" data-index="${index}">Delete</button>
      </div>
    `;
    
    patternList.appendChild(patternItem);
  });
  
  // Add event listeners for pattern toggles
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      urlPatterns[index].active = e.target.checked;
      saveSettings();
      renderPatterns();
    });
  });
  
  // Add event listeners for delete buttons
  document.querySelectorAll('.btn-delete[data-index]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      deletePattern(index);
    });
  });
}

/**
 * And a new redirect prefix
 */
function addNewPrefix() {
  const name = newPrefixName.value.trim();
  const url = newPrefixUrl.value.trim();
  
  if (!name || !url) {
    showStatus('Please fill in both fields', 'error');
    return;
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    showStatus('Invalid URL format', 'error');
    return;
  }
  
  // Ensure URL ends with /
  const finalUrl = url.endsWith('/') ? url : url + '/';
  
  // Add prefix
  redirectPrefixes.push({ name, url: finalUrl });
  
  // Clear inputs
  newPrefixName.value = '';
  newPrefixUrl.value = '';
  
  saveSettings();
  renderPrefixes();
  showStatus('Redirect prefix added successfully!', 'success');
}

/**
 * Delete a redirect prefix
 */
function deletePrefix(index) {
  if (redirectPrefixes.length <= 1) {
    showStatus('Cannot delete the last redirect prefix', 'error');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this redirect prefix?')) {
    return;
  }
  
  redirectPrefixes.splice(index, 1);
  
  // Adjust active index if needed
  if (activePrefixIndex >= redirectPrefixes.length) {
    activePrefixIndex = redirectPrefixes.length - 1;
  } else if (activePrefixIndex >= index) {
    activePrefixIndex = Math.max(0, activePrefixIndex - 1);
  }
  
  saveSettings();
  renderPrefixes();
  showStatus('Redirect prefix deleted', 'success');
}

/**
 * Delete a URL pattern
 */
function deletePattern(index) {
  if (urlPatterns.length <= 1) {
    showStatus('Cannot delete the last pattern', 'error');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this URL pattern?')) {
    return;
  }
  
  urlPatterns.splice(index, 1);
  
  saveSettings();
  renderPatterns();
  showStatus('URL pattern deleted', 'success');
}

/**
 * Reset to default configuration
 */
function resetToDefaults() {
  if (!confirm('This will replace all your configuration with the defaults. Continue?')) {
    return;
  }
  
  redirectPrefixes = [...DEFAULT_CONFIG.redirectPrefixes];
  urlPatterns = [...DEFAULT_CONFIG.urlPatterns];
  settings = {...DEFAULT_CONFIG.settings};
  activePrefixIndex = 0;
  
  // Update UI elements with default settings
  resolveDOIsCheckbox.checked = settings.resolveDOIs;
  enableSciHubErrorDetectionCheckbox.checked = settings.enableSciHubErrorDetection;
  preCheckSciHubCheckbox.checked = settings.preCheckSciHub;
  debugModeCheckbox.checked = settings.debugMode;
  doiResolutionTimeoutInput.value = settings.doiResolutionTimeout;
  errorDetectionDelayInput.value = settings.errorDetectionDelay;
  autoPrefixRotationCheckbox.checked = settings.autoPrefixRotation;
  showNotificationsCheckbox.checked = settings.showNotifications;
  
  saveSettings();
  renderPrefixes();
  renderPatterns();
  showStatus('Reset to default configuration', 'success');
}

/**
 * Save settings to storage
 */
function saveSettings() {
  chrome.storage.sync.set({
    redirectPrefixes: redirectPrefixes,
    urlPatterns: urlPatterns,
    activePrefixIndex: activePrefixIndex,
    settings: settings
  }, () => {
    // Notify background script
    chrome.runtime.sendMessage({
      action: 'updateConfig',
      redirectPrefixes: redirectPrefixes,
      urlPatterns: urlPatterns,
      activePrefixIndex: activePrefixIndex,
      settings: settings
    });
  });
}

/**
 * Show save status message
 */
function showStatus(message, type) {
  saveStatus.textContent = message;
  saveStatus.className = 'save-status ' + type;
  
  setTimeout(() => {
    saveStatus.textContent = '';
    saveStatus.className = 'save-status';
  }, 3000);
}

/**
 * Test error detection mechanism
 */
function testErrorDetection() {
  // Create a test page with Sci-Hub error content
  const testPageContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Error Page</title>
    </head>
    <body>
      <h1>Test Sci-Hub Error Page</h1>
      <p>Cтатья отсутствует в базе</p>
      <p>This is a test page to verify error detection works.</p>
      <p>If error detection is working, you should be redirected back to the original URL.</p>
    </body>
    </html>
  `;
  
  // Create a data URL for the test page
  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(testPageContent);
  
  // Open the test page in a new tab
  chrome.tabs.create({ url: dataUrl }, (tab) => {
    console.log('Test page opened in tab:', tab.id);
    
    // Store a fake original URL for testing
    chrome.runtime.sendMessage({
      action: 'storeTestUrl',
      tabId: tab.id,
      originalUrl: 'https://doi.org/10.1038/test123'
    });
    
    // Show status message
    showStatus('Test page opened. Check console for debug messages.', 'success');
    
    // After 3 seconds, simulate the error detection
    setTimeout(() => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: function(tabId) {
          console.log('Testing error detection...');
          
          // Check for error patterns
          const errorPatterns = [
            'Cтатья отсутствует в базе',
            'Статья отсутствует в базе',
            'Article not found',
            'Document not found',
            'Error 404',
            'Not found'
          ];
          
          const bodyText = document.body ? document.body.innerText.toLowerCase() : '';
          const pageTitle = document.title ? document.title.toLowerCase() : '';
          const pageContent = (bodyText + ' ' + pageTitle).toLowerCase();
          
          console.log('Page content:', pageContent);
          
          const hasError = errorPatterns.some(pattern => 
            pageContent.includes(pattern.toLowerCase())
          );
          
          if (hasError) {
            console.log('Error detected in test page!');
            chrome.runtime.sendMessage({
              action: 'fallbackToOriginal',
              tabId: tabId
            });
          } else {
            console.log('No error detected in test page');
          }
        },
        args: [tab.id]
      }).catch(error => {
        console.error('Could not inject test script:', error);
        showStatus('Test failed: Could not inject script', 'error');
      });
    }, 2000);
  });
}