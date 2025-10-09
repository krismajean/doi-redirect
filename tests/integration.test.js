// Integration tests for DOI Redirect Extension
// Tests the complete extension workflow and component interactions

const { MockChromeAPI, TEST_DATA, TestHelpers } = require('../test-utils');

describe('DOI Redirect Extension Integration Tests', () => {
  let mockChrome;
  let mockElements;

  beforeEach(() => {
    mockChrome = new MockChromeAPI();
    global.chrome = mockChrome;
    mockElements = TestHelpers.setupMockDOM();
    jest.clearAllMocks();
  });

  afterEach(() => {
    TestHelpers.cleanupMockDOM();
    mockChrome.reset();
  });

  describe('Complete Extension Workflow', () => {
    test('should handle complete DOI redirection workflow', async () => {
      // Setup extension state
      mockChrome.storage.sync.data = {
        enabled: true,
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      // Mock DOI resolution
      const originalUrl = TEST_DATA.testUrls.doi;
      const resolvedUrl = 'https://www.nature.com/articles/nature11163';
      TestHelpers.mockFetchResponse(originalUrl, resolvedUrl);

      // Simulate navigation to DOI URL
      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      const details = {
        url: originalUrl,
        tabId: 123,
        frameId: 0
      };

      navigationListener(details);

      // Verify redirection
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(123, {
        url: expect.stringContaining('https://sci-hub.ru/')
      });
    });

    test('should handle PubMed redirection workflow', async () => {
      // Enable PubMed pattern
      const pubmedPattern = TEST_DATA.defaultConfig.urlPatterns.find(p => p.name === 'PubMed Articles');
      pubmedPattern.active = true;

      mockChrome.storage.sync.data = {
        enabled: true,
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      // Simulate navigation to PubMed URL
      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      const details = {
        url: TEST_DATA.testUrls.pubmed,
        tabId: 456,
        frameId: 0
      };

      navigationListener(details);

      // Verify redirection
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(456, {
        url: expect.stringContaining('https://sci-hub.ru/')
      });
    });

    test('should handle prefix rotation workflow', () => {
      // Setup multiple prefixes
      mockChrome.storage.sync.data = {
        enabled: true,
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      // Simulate "try next prefix" from popup
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      messageListener({
        action: 'tryNextPrefix'
      }, null, sendResponse);

      // Verify prefix rotation
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        newIndex: 1,
        prefix: TEST_DATA.defaultConfig.redirectPrefixes[1]
      });
    });
  });

  describe('Configuration Management Integration', () => {
    test('should persist configuration changes across components', () => {
      // Setup initial state
      mockChrome.storage.sync.data = {
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      // Simulate adding new prefix from options
      const newPrefix = {
        name: 'Custom Prefix',
        url: 'https://custom.com/'
      };

      // Update configuration
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener({
        action: 'updateConfig',
        redirectPrefixes: [...TEST_DATA.defaultConfig.redirectPrefixes, newPrefix],
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      }, null, jest.fn());

      // Verify configuration is saved
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        redirectPrefixes: expect.arrayContaining([
          expect.objectContaining(newPrefix)
        ]),
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      }, expect.any(Function));
    });

    test('should handle configuration reset workflow', () => {
      // Setup custom configuration
      mockChrome.storage.sync.data = {
        redirectPrefixes: [{ url: 'https://custom.com/', name: 'Custom' }],
        urlPatterns: [{ name: 'Custom Pattern', pattern: 'custom.com', type: 'hostContains', active: true }],
        activePrefixIndex: 0
      };

      // Mock confirm dialog
      global.confirm = jest.fn(() => true);

      // Simulate reset from options
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener({
        action: 'updateConfig',
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      }, null, jest.fn());

      // Verify reset
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      }, expect.any(Function));
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle network errors gracefully', async () => {
      mockChrome.storage.sync.data = {
        enabled: true,
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      // Mock network error
      TestHelpers.mockFetchError();

      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      const details = {
        url: TEST_DATA.testUrls.doi,
        tabId: 123,
        frameId: 0
      };

      navigationListener(details);

      // Should still attempt redirection with original URL
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(123, {
        url: expect.stringContaining('https://sci-hub.ru/')
      });
    });

    test('should handle disabled extension state', () => {
      mockChrome.storage.sync.data = {
        enabled: false,
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      const details = {
        url: TEST_DATA.testUrls.doi,
        tabId: 123,
        frameId: 0
      };

      navigationListener(details);

      // Should not redirect when disabled
      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    test('should handle invalid configuration gracefully', () => {
      mockChrome.storage.sync.data = {
        enabled: true,
        redirectPrefixes: [], // Empty prefixes
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      const details = {
        url: TEST_DATA.testUrls.doi,
        tabId: 123,
        frameId: 0
      };

      navigationListener(details);

      // Should not redirect with invalid configuration
      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Component Communication', () => {
    test('should sync state between popup and background', () => {
      // Setup background state
      mockChrome.storage.sync.data = {
        enabled: true,
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      // Simulate popup requesting state
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'getState') {
          callback({
            enabled: true,
            redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
            urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
            activePrefixIndex: 0
          });
        }
      });

      // Simulate popup toggle
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'toggleEnabled') {
          callback({ success: true });
        }
      });

      // Verify communication
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
    });

    test('should sync configuration between options and background', () => {
      // Setup options configuration
      const newConfig = {
        redirectPrefixes: [...TEST_DATA.defaultConfig.redirectPrefixes, { url: 'https://new.com/', name: 'New' }],
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        activePrefixIndex: 0
      };

      // Simulate options updating configuration
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener({
        action: 'updateConfig',
        ...newConfig
      }, null, jest.fn());

      // Verify configuration sync
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(newConfig, expect.any(Function));
    });
  });

  describe('URL Pattern Matching Integration', () => {
    test('should match all supported URL types', () => {
      const patterns = TEST_DATA.defaultConfig.urlPatterns;
      
      // Enable all patterns for testing
      patterns.forEach(pattern => pattern.active = true);

      const testUrls = [
        TEST_DATA.testUrls.doi,
        TEST_DATA.testUrls.arxiv,
        TEST_DATA.testUrls.ieee,
        TEST_DATA.testUrls.pubmed,
        TEST_DATA.testUrls.springer,
        TEST_DATA.testUrls.nature,
        TEST_DATA.testUrls.science
      ];

      testUrls.forEach(url => {
        const matches = patterns.some(pattern => {
          if (!pattern.active) return false;
          switch (pattern.type) {
            case 'hostContains':
              return url.includes(pattern.pattern);
            default:
              return false;
          }
        });
        expect(matches).toBe(true);
      });
    });

    test('should handle mixed pattern types', () => {
      const mixedPatterns = [
        { name: 'DOI', pattern: 'doi.org', type: 'hostContains', active: true },
        { name: 'Custom', pattern: 'https://custom.com/', type: 'startsWith', active: true },
        { name: 'Exact', pattern: 'https://exact.com/page', type: 'exact', active: true },
        { name: 'Regex', pattern: '^https://regex\\.com/.*', type: 'regex', active: true }
      ];

      const testUrls = [
        'https://doi.org/10.1000/182',
        'https://custom.com/page',
        'https://exact.com/page',
        'https://regex.com/anything'
      ];

      testUrls.forEach((url, index) => {
        const matches = mixedPatterns.some(pattern => {
          if (!pattern.active) return false;
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
                return false;
              }
            default:
              return false;
          }
        });
        expect(matches).toBe(true);
      });
    });
  });
});
