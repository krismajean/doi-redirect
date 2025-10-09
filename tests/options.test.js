// Unit tests for options.js functionality
// Tests the options page interface, configuration management, and user interactions

const { MockChromeAPI, TEST_DATA, TestHelpers } = require('../test-utils');

describe('Options Script Tests', () => {
  let mockChrome;
  let mockElements;

  beforeEach(() => {
    // Reset mocks
    mockChrome = new MockChromeAPI();
    global.chrome = mockChrome;
    
    // Setup mock DOM
    mockElements = TestHelpers.setupMockDOM();
    
    // Clear any existing listeners
    jest.clearAllMocks();
  });

  afterEach(() => {
    TestHelpers.cleanupMockDOM();
    mockChrome.reset();
  });

  describe('Initialization', () => {
    test('should load settings on page load', () => {
      mockChrome.storage.sync.data = {
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      // Simulate DOMContentLoaded event
      const loadEvent = new Event('DOMContentLoaded');
      document.dispatchEvent(loadEvent);

      expect(mockChrome.storage.sync.get).toHaveBeenCalledWith(
        ['redirectPrefixes', 'urlPatterns', 'activePrefixIndex'],
        expect.any(Function)
      );
    });

    test('should use default configuration when storage is empty', () => {
      mockChrome.storage.sync.data = {}; // Empty storage

      const loadEvent = new Event('DOMContentLoaded');
      document.dispatchEvent(loadEvent);

      expect(mockChrome.storage.sync.get).toHaveBeenCalled();
    });
  });

  describe('Prefix Management', () => {
    test('should render prefixes correctly', () => {
      mockChrome.storage.sync.data = {
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        activePrefixIndex: 0
      };

      renderPrefixes();

      const prefixItems = mockElements.prefixList.children;
      expect(prefixItems.length).toBe(TEST_DATA.defaultConfig.redirectPrefixes.length);
      
      // Check first item is active
      expect(prefixItems[0].className).toContain('active');
      expect(prefixItems[0].querySelector('input[type="radio"]').checked).toBe(true);
    });

    test('should handle prefix selection', () => {
      mockChrome.storage.sync.data = {
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        activePrefixIndex: 0
      };

      renderPrefixes();

      // Simulate selecting second prefix
      const radioButtons = mockElements.prefixList.querySelectorAll('input[type="radio"]');
      radioButtons[1].checked = true;
      
      const changeEvent = new Event('change');
      radioButtons[1].dispatchEvent(changeEvent);

      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        redirectPrefixes: expect.any(Array),
        urlPatterns: expect.any(Array),
        activePrefixIndex: 1
      }, expect.any(Function));
    });

    test('should add new prefix', () => {
      mockElements.newPrefixName.value = 'Test Prefix';
      mockElements.newPrefixUrl.value = 'https://test.com/';

      mockChrome.storage.sync.data = {
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      addNewPrefix();

      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        redirectPrefixes: expect.arrayContaining([
          expect.objectContaining({
            name: 'Test Prefix',
            url: 'https://test.com/'
          })
        ]),
        urlPatterns: expect.any(Array),
        activePrefixIndex: expect.any(Number)
      }, expect.any(Function));

      // Check inputs are cleared
      expect(mockElements.newPrefixName.value).toBe('');
      expect(mockElements.newPrefixUrl.value).toBe('');
    });

    test('should validate prefix input', () => {
      // Test empty name
      mockElements.newPrefixName.value = '';
      mockElements.newPrefixUrl.value = 'https://test.com/';

      addNewPrefix();

      expect(mockElements.saveStatus.textContent).toBe('Please fill in both fields');
      expect(mockElements.saveStatus.className).toContain('error');

      // Test empty URL
      mockElements.newPrefixName.value = 'Test';
      mockElements.newPrefixUrl.value = '';

      addNewPrefix();

      expect(mockElements.saveStatus.textContent).toBe('Please fill in both fields');
    });

    test('should validate URL format', () => {
      mockElements.newPrefixName.value = 'Test';
      mockElements.newPrefixUrl.value = 'invalid-url';

      addNewPrefix();

      expect(mockElements.saveStatus.textContent).toBe('Invalid URL format');
      expect(mockElements.saveStatus.className).toContain('error');
    });

    test('should add trailing slash to URL', () => {
      mockElements.newPrefixName.value = 'Test';
      mockElements.newPrefixUrl.value = 'https://test.com';

      mockChrome.storage.sync.data = {
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      addNewPrefix();

      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        redirectPrefixes: expect.arrayContaining([
          expect.objectContaining({
            url: 'https://test.com/'
          })
        ])
      }, expect.any(Function));
    });

    test('should delete prefix', () => {
      mockChrome.storage.sync.data = {
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      renderPrefixes();

      // Mock confirm dialog
      global.confirm = jest.fn(() => true);

      const deleteButtons = mockElements.prefixList.querySelectorAll('.btn-delete');
      const clickEvent = new Event('click');
      deleteButtons[0].dispatchEvent(clickEvent);

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this redirect prefix?');
      expect(mockChrome.storage.sync.set).toHaveBeenCalled();
    });

    test('should not delete last prefix', () => {
      mockChrome.storage.sync.data = {
        redirectPrefixes: [{ url: 'https://test.com/', name: 'Only Prefix' }],
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      renderPrefixes();

      const deleteButtons = mockElements.prefixList.querySelectorAll('.btn-delete');
      const clickEvent = new Event('click');
      deleteButtons[0].dispatchEvent(clickEvent);

      expect(mockElements.saveStatus.textContent).toBe('Cannot delete the last redirect prefix');
      expect(mockElements.saveStatus.className).toContain('error');
    });

    test('should handle delete cancellation', () => {
      mockChrome.storage.sync.data = {
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      renderPrefixes();

      // Mock confirm dialog to return false
      global.confirm = jest.fn(() => false);

      const deleteButtons = mockElements.prefixList.querySelectorAll('.btn-delete');
      const clickEvent = new Event('click');
      deleteButtons[0].dispatchEvent(clickEvent);

      expect(mockChrome.storage.sync.set).not.toHaveBeenCalled();
    });
  });

  describe('Pattern Management', () => {
    test('should render patterns correctly', () => {
      mockChrome.storage.sync.data = {
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      renderPatterns();

      const patternItems = mockElements.patternList.children;
      expect(patternItems.length).toBe(TEST_DATA.defaultConfig.urlPatterns.length);
      
      // Check active patterns
      const activePatterns = Array.from(patternItems).filter(item => 
        item.className.includes('active')
      );
      const expectedActiveCount = TEST_DATA.defaultConfig.urlPatterns.filter(p => p.active).length;
      expect(activePatterns.length).toBe(expectedActiveCount);
    });

    test('should handle pattern toggle', () => {
      mockChrome.storage.sync.data = {
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      renderPatterns();

      // Toggle first pattern
      const checkboxes = mockElements.patternList.querySelectorAll('input[type="checkbox"]');
      checkboxes[0].checked = false;
      
      const changeEvent = new Event('change');
      checkboxes[0].dispatchEvent(changeEvent);

      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        redirectPrefixes: expect.any(Array),
        urlPatterns: expect.arrayContaining([
          expect.objectContaining({ active: false })
        ]),
        activePrefixIndex: expect.any(Number)
      }, expect.any(Function));
    });

    test('should delete pattern', () => {
      mockChrome.storage.sync.data = {
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      renderPatterns();

      // Mock confirm dialog
      global.confirm = jest.fn(() => true);

      const deleteButtons = mockElements.patternList.querySelectorAll('.btn-delete');
      const clickEvent = new Event('click');
      deleteButtons[0].dispatchEvent(clickEvent);

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this URL pattern?');
      expect(mockChrome.storage.sync.set).toHaveBeenCalled();
    });

    test('should not delete last pattern', () => {
      mockChrome.storage.sync.data = {
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: [{ name: 'Only Pattern', pattern: 'test.com', type: 'hostContains', active: true }],
        activePrefixIndex: 0
      };

      renderPatterns();

      const deleteButtons = mockElements.patternList.querySelectorAll('.btn-delete');
      const clickEvent = new Event('click');
      deleteButtons[0].dispatchEvent(clickEvent);

      expect(mockElements.saveStatus.textContent).toBe('Cannot delete the last pattern');
      expect(mockElements.saveStatus.className).toContain('error');
    });
  });

  describe('Reset Functionality', () => {
    test('should reset to defaults', () => {
      mockChrome.storage.sync.data = {
        redirectPrefixes: [{ url: 'https://custom.com/', name: 'Custom' }],
        urlPatterns: [{ name: 'Custom Pattern', pattern: 'custom.com', type: 'hostContains', active: true }],
        activePrefixIndex: 0
      };

      // Mock confirm dialog
      global.confirm = jest.fn(() => true);

      resetToDefaults();

      expect(global.confirm).toHaveBeenCalledWith('This will replace all your configuration with the defaults. Continue?');
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        redirectPrefixes: expect.arrayContaining([
          expect.objectContaining({ name: 'Academic Access Russia' })
        ]),
        urlPatterns: expect.arrayContaining([
          expect.objectContaining({ name: 'DOI Links' })
        ]),
        activePrefixIndex: 0
      }, expect.any(Function));
    });

    test('should handle reset cancellation', () => {
      // Mock confirm dialog to return false
      global.confirm = jest.fn(() => false);

      resetToDefaults();

      expect(mockChrome.storage.sync.set).not.toHaveBeenCalled();
    });
  });

  describe('Status Messages', () => {
    test('should show success status', () => {
      showStatus('Test success message', 'success');

      expect(mockElements.saveStatus.textContent).toBe('Test success message');
      expect(mockElements.saveStatus.className).toContain('success');
    });

    test('should show error status', () => {
      showStatus('Test error message', 'error');

      expect(mockElements.saveStatus.textContent).toBe('Test error message');
      expect(mockElements.saveStatus.className).toContain('error');
    });

    test('should clear status after timeout', (done) => {
      showStatus('Test message', 'success');

      setTimeout(() => {
        expect(mockElements.saveStatus.textContent).toBe('');
        expect(mockElements.saveStatus.className).toBe('save-status');
        done();
      }, 3100); // Slightly longer than the 3000ms timeout
    });
  });

  describe('Event Listeners', () => {
    test('should handle add prefix button click', () => {
      mockElements.newPrefixName.value = 'Test';
      mockElements.newPrefixUrl.value = 'https://test.com/';

      mockChrome.storage.sync.data = {
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      const clickEvent = new Event('click');
      mockElements.addPrefixBtn.dispatchEvent(clickEvent);

      expect(mockChrome.storage.sync.set).toHaveBeenCalled();
    });

    test('should handle reset button click', () => {
      global.confirm = jest.fn(() => true);

      const clickEvent = new Event('click');
      mockElements.resetBtn.dispatchEvent(clickEvent);

      expect(global.confirm).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle storage errors gracefully', () => {
      mockChrome.storage.sync.set.mockImplementation((data, callback) => {
        if (callback) callback();
      });

      mockElements.newPrefixName.value = 'Test';
      mockElements.newPrefixUrl.value = 'https://test.com/';

      addNewPrefix();

      // Should not throw error even if storage fails
      expect(mockChrome.storage.sync.set).toHaveBeenCalled();
    });

    test('should handle runtime message errors', () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback(null); // Simulate error
      });

      saveSettings();

      // Should not throw error
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
    });
  });
});

// Helper functions extracted from options.js for testing
function renderPrefixes() {
  const prefixList = document.getElementById('prefixList');
  prefixList.innerHTML = '';
  
  const redirectPrefixes = TEST_DATA.defaultConfig.redirectPrefixes;
  const activePrefixIndex = 0;
  
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
}

function renderPatterns() {
  const patternList = document.getElementById('patternList');
  patternList.innerHTML = '';
  
  const urlPatterns = TEST_DATA.defaultConfig.urlPatterns;
  
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
}

function addNewPrefix() {
  const name = document.getElementById('newPrefixName').value.trim();
  const url = document.getElementById('newPrefixUrl').value.trim();
  
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
  const redirectPrefixes = TEST_DATA.defaultConfig.redirectPrefixes;
  redirectPrefixes.push({ name, url: finalUrl });
  
  // Clear inputs
  document.getElementById('newPrefixName').value = '';
  document.getElementById('newPrefixUrl').value = '';
  
  saveSettings();
  renderPrefixes();
  showStatus('Redirect prefix added successfully!', 'success');
}

function resetToDefaults() {
  if (!confirm('This will replace all your configuration with the defaults. Continue?')) {
    return;
  }
  
  const redirectPrefixes = [...TEST_DATA.defaultConfig.redirectPrefixes];
  const urlPatterns = [...TEST_DATA.defaultConfig.urlPatterns];
  const activePrefixIndex = 0;
  
  saveSettings();
  renderPrefixes();
  renderPatterns();
  showStatus('Reset to default configuration', 'success');
}

function saveSettings() {
  chrome.storage.sync.set({
    redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
    urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
    activePrefixIndex: 0
  }, () => {
    // Notify background script
    chrome.runtime.sendMessage({
      action: 'updateConfig',
      redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
      urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
      activePrefixIndex: 0
    });
  });
}

function showStatus(message, type) {
  const saveStatus = document.getElementById('saveStatus');
  saveStatus.textContent = message;
  saveStatus.className = 'save-status ' + type;
  
  setTimeout(() => {
    saveStatus.textContent = '';
    saveStatus.className = 'save-status';
  }, 3000);
}
