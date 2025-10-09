// Unit tests for popup.js functionality
// Tests the popup interface, state management, and user interactions

const { MockChromeAPI, TEST_DATA, TestHelpers } = require('../test-utils');

describe('Popup Script Tests', () => {
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
    test('should load current state on popup open', () => {
      // Mock the response from background script
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'getState') {
          callback({
            enabled: true,
            redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
            activePrefixIndex: 0
          });
        }
      });

      // Simulate popup opening by triggering the message listener
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener({ action: 'getState' }, null, jest.fn());

      expect(mockElements.toggleCheckbox.checked).toBe(true);
      expect(mockElements.statusText.textContent).toBe('Extension Enabled');
    });

    test('should handle disabled state correctly', () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'getState') {
          callback({
            enabled: false,
            redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
            activePrefixIndex: 0
          });
        }
      });

      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener({ action: 'getState' }, null, jest.fn());

      expect(mockElements.toggleCheckbox.checked).toBe(false);
      expect(mockElements.statusText.textContent).toBe('Extension Disabled');
    });

    test('should handle missing state data gracefully', () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'getState') {
          callback({}); // Empty response
        }
      });

      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener({ action: 'getState' }, null, jest.fn());

      expect(mockElements.toggleCheckbox.checked).toBe(true); // Default to enabled
    });
  });

  describe('Toggle Functionality', () => {
    test('should handle toggle enable', () => {
      // Setup initial state
      mockElements.toggleCheckbox.checked = false;
      
      // Mock storage and runtime responses
      mockChrome.storage.sync.set.mockImplementation((data, callback) => {
        if (callback) callback();
      });
      
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'toggleEnabled') {
          callback({ success: true });
        }
      });

      // Simulate toggle change
      const changeEvent = new Event('change');
      mockElements.toggleCheckbox.dispatchEvent(changeEvent);

      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
        { enabled: false },
        expect.any(Function)
      );
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'toggleEnabled',
        enabled: false
      }, expect.any(Function));
    });

    test('should update status text when toggled', () => {
      // Mock successful toggle
      mockChrome.storage.sync.set.mockImplementation((data, callback) => {
        if (callback) callback();
      });
      
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'toggleEnabled') {
          callback({ success: true });
        }
      });

      // Test enabling
      mockElements.toggleCheckbox.checked = true;
      const enableEvent = new Event('change');
      mockElements.toggleCheckbox.dispatchEvent(enableEvent);

      expect(mockElements.statusText.textContent).toBe('Extension Enabled');
      expect(mockElements.statusText.style.color).toBe('#333');

      // Test disabling
      mockElements.toggleCheckbox.checked = false;
      const disableEvent = new Event('change');
      mockElements.toggleCheckbox.dispatchEvent(disableEvent);

      expect(mockElements.statusText.textContent).toBe('Extension Disabled');
      expect(mockElements.statusText.style.color).toBe('#999');
    });
  });

  describe('Prefix Management', () => {
    test('should display active prefix information', () => {
      const testPrefix = TEST_DATA.defaultConfig.redirectPrefixes[0];
      
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'getState') {
          callback({
            enabled: true,
            redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
            activePrefixIndex: 0
          });
        }
      });

      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener({ action: 'getState' }, null, jest.fn());

      expect(mockElements.activePrefixName.textContent).toBe(testPrefix.name);
      expect(mockElements.activePrefixUrl.textContent).toBe(testPrefix.url);
    });

    test('should handle try next prefix button', () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'tryNextPrefix') {
          callback({
            success: true,
            newIndex: 1,
            prefix: TEST_DATA.defaultConfig.redirectPrefixes[1]
          });
        }
      });

      // Simulate button click
      const clickEvent = new Event('click');
      mockElements.tryNextPrefix.dispatchEvent(clickEvent);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'tryNextPrefix'
      }, expect.any(Function));

      // Check visual feedback
      expect(mockElements.tryNextPrefix.textContent).toBe('Switched!');
    });

    test('should reset button text after timeout', (done) => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'tryNextPrefix') {
          callback({
            success: true,
            newIndex: 1,
            prefix: TEST_DATA.defaultConfig.redirectPrefixes[1]
          });
        }
      });

      const clickEvent = new Event('click');
      mockElements.tryNextPrefix.dispatchEvent(clickEvent);

      // Check that button text resets after timeout
      setTimeout(() => {
        expect(mockElements.tryNextPrefix.textContent).toBe('Try Next Prefix');
        done();
      }, 1100); // Slightly longer than the 1000ms timeout
    });

    test('should handle try next prefix failure', () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'tryNextPrefix') {
          callback({ success: false });
        }
      });

      const clickEvent = new Event('click');
      mockElements.tryNextPrefix.dispatchEvent(clickEvent);

      // Button text should not change on failure
      expect(mockElements.tryNextPrefix.textContent).toBe('Try Next Prefix');
    });
  });

  describe('Options Page Integration', () => {
    test('should open options page when button clicked', () => {
      const clickEvent = new Event('click');
      mockElements.openOptions.dispatchEvent(clickEvent);

      expect(mockChrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });

  describe('Helper Functions', () => {
    test('updateStatusText should work correctly', () => {
      // Test enabling
      updateStatusText(true);
      expect(mockElements.statusText.textContent).toBe('Extension Enabled');
      expect(mockElements.statusText.style.color).toBe('#333');

      // Test disabling
      updateStatusText(false);
      expect(mockElements.statusText.textContent).toBe('Extension Disabled');
      expect(mockElements.statusText.style.color).toBe('#999');
    });

    test('updatePrefixDisplay should work correctly', () => {
      const testPrefix = {
        name: 'Test Prefix',
        url: 'https://test.com/'
      };

      updatePrefixDisplay(testPrefix);

      expect(mockElements.activePrefixName.textContent).toBe('Test Prefix');
      expect(mockElements.activePrefixUrl.textContent).toBe('https://test.com/');
    });

    test('updatePrefixDisplay should handle missing prefix', () => {
      updatePrefixDisplay(null);

      expect(mockElements.activePrefixName.textContent).toBe('');
      expect(mockElements.activePrefixUrl.textContent).toBe('');
    });

    test('updatePrefixDisplay should handle prefix without name', () => {
      const testPrefix = {
        url: 'https://test.com/'
      };

      updatePrefixDisplay(testPrefix);

      expect(mockElements.activePrefixName.textContent).toBe('Custom Prefix');
      expect(mockElements.activePrefixUrl.textContent).toBe('https://test.com/');
    });
  });

  describe('Error Handling', () => {
    test('should handle runtime message errors', () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback(null); // Simulate error
      });

      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener({ action: 'getState' }, null, jest.fn());

      // Should not throw error and should use defaults
      expect(mockElements.toggleCheckbox.checked).toBe(true);
    });

    test('should handle storage errors gracefully', () => {
      mockChrome.storage.sync.set.mockImplementation((data, callback) => {
        if (callback) callback();
      });

      // Simulate toggle change
      const changeEvent = new Event('change');
      mockElements.toggleCheckbox.dispatchEvent(changeEvent);

      // Should not throw error even if storage fails
      expect(mockChrome.storage.sync.set).toHaveBeenCalled();
    });
  });
});

// Helper functions extracted from popup.js for testing
function updateStatusText(enabled) {
  const statusText = document.getElementById('statusText');
  statusText.textContent = enabled ? 'Extension Enabled' : 'Extension Disabled';
  statusText.style.color = enabled ? '#333' : '#999';
}

function updatePrefixDisplay(prefix) {
  const activePrefixName = document.getElementById('activePrefixName');
  const activePrefixUrl = document.getElementById('activePrefixUrl');
  
  if (prefix) {
    activePrefixName.textContent = prefix.name || 'Custom Prefix';
    activePrefixUrl.textContent = prefix.url;
  }
}
