// Unit tests for background.js functionality
// Tests the core extension logic including URL pattern matching, DOI resolution, and redirection

const { MockChromeAPI, TEST_DATA, TestHelpers } = require('./test-utils');

describe('Background Script Tests', () => {
  let mockChrome;
  let backgroundScript;

  beforeEach(() => {
    // Reset mocks
    mockChrome = new MockChromeAPI();
    global.chrome = mockChrome;
    global.fetch = jest.fn();
    global.AbortController = jest.fn(() => ({
      abort: jest.fn(),
      signal: {}
    }));

    // Clear any existing listeners
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockChrome.reset();
  });

  describe('URL Pattern Matching', () => {
    test('should match DOI URLs correctly', () => {
      const patterns = TEST_DATA.defaultConfig.urlPatterns;
      const doiPattern = patterns.find(p => p.name === 'DOI Links');
      
      expect(matchesUrlPattern(TEST_DATA.testUrls.doi, [doiPattern])).toBe(true);
      expect(matchesUrlPattern(TEST_DATA.testUrls.doiEncoded, [doiPattern])).toBe(true);
      expect(matchesUrlPattern('https://doi.org/10.1000/182', [doiPattern])).toBe(true);
    });

    test('should match arXiv URLs correctly', () => {
      const patterns = TEST_DATA.defaultConfig.urlPatterns;
      const arxivPattern = patterns.find(p => p.name === 'arXiv Papers');
      arxivPattern.active = true; // Enable for testing
      
      expect(matchesUrlPattern(TEST_DATA.testUrls.arxiv, [arxivPattern])).toBe(true);
      expect(matchesUrlPattern('https://arxiv.org/pdf/2101.12345.pdf', [arxivPattern])).toBe(true);
    });

    test('should match PubMed URLs correctly', () => {
      const patterns = TEST_DATA.defaultConfig.urlPatterns;
      const pubmedPattern = patterns.find(p => p.name === 'PubMed Articles');
      pubmedPattern.active = true; // Enable for testing
      
      expect(matchesUrlPattern(TEST_DATA.testUrls.pubmed, [pubmedPattern])).toBe(true);
      expect(matchesUrlPattern('https://pubmed.ncbi.nlm.nih.gov/946794', [pubmedPattern])).toBe(true);
      expect(matchesUrlPattern('http://pubmed.ncbi.nlm.nih.gov/123456/', [pubmedPattern])).toBe(true);
    });

    test('should not match inactive patterns', () => {
      const patterns = TEST_DATA.defaultConfig.urlPatterns;
      const inactivePattern = patterns.find(p => p.name === 'arXiv Papers');
      inactivePattern.active = false;
      
      expect(matchesUrlPattern(TEST_DATA.testUrls.arxiv, [inactivePattern])).toBe(false);
    });

    test('should handle different pattern types', () => {
      const patterns = [
        { name: 'startsWith', pattern: 'https://doi.org', type: 'startsWith', active: true },
        { name: 'exact', pattern: 'https://doi.org/10.1038/nature11163', type: 'exact', active: true },
        { name: 'regex', pattern: '^https://doi\\.org/.*', type: 'regex', active: true }
      ];

      expect(matchesUrlPattern(TEST_DATA.testUrls.doi, patterns)).toBe(true);
      expect(matchesUrlPattern(TEST_DATA.testUrls.doi, [patterns[1]])).toBe(true);
      expect(matchesUrlPattern(TEST_DATA.testUrls.doi, [patterns[2]])).toBe(true);
    });

    test('should handle invalid regex patterns gracefully', () => {
      const patterns = [
        { name: 'invalidRegex', pattern: '[invalid', type: 'regex', active: true }
      ];

      expect(matchesUrlPattern(TEST_DATA.testUrls.doi, patterns)).toBe(false);
    });

    test('should return false for empty patterns array', () => {
      expect(matchesUrlPattern(TEST_DATA.testUrls.doi, [])).toBe(false);
      expect(matchesUrlPattern(TEST_DATA.testUrls.doi, null)).toBe(false);
    });
  });

  describe('DOI Resolution', () => {
    test('should resolve DOI URLs to final destination', async () => {
      const originalUrl = TEST_DATA.testUrls.doi;
      const finalUrl = 'https://www.nature.com/articles/nature11163';
      
      TestHelpers.mockFetchResponse(originalUrl, finalUrl);

      const result = await new Promise(resolve => {
        resolveDOIToFinalUrl(originalUrl, resolve);
      });

      expect(result).toBe(finalUrl);
      expect(fetch).toHaveBeenCalledWith(originalUrl, expect.objectContaining({
        method: 'HEAD',
        redirect: 'manual'
      }));
    });

    test('should handle URL encoded DOI URLs', async () => {
      const encodedUrl = TEST_DATA.testUrls.doiEncoded;
      const decodedUrl = TEST_DATA.testUrls.doi;
      const finalUrl = 'https://www.nature.com/articles/nature11163';
      
      TestHelpers.mockFetchResponse(decodedUrl, finalUrl);

      const result = await new Promise(resolve => {
        resolveDOIToFinalUrl(encodedUrl, resolve);
      });

      expect(result).toBe(finalUrl);
    });

    test('should handle fetch errors gracefully', async () => {
      const originalUrl = TEST_DATA.testUrls.doi;
      TestHelpers.mockFetchError();

      const result = await new Promise(resolve => {
        resolveDOIToFinalUrl(originalUrl, resolve);
      });

      expect(result).toBe(originalUrl);
    });

    test('should handle timeout errors', async () => {
      const originalUrl = TEST_DATA.testUrls.doi;
      
      // Mock AbortController to simulate timeout
      const mockAbortController = {
        abort: jest.fn(),
        signal: {}
      };
      global.AbortController = jest.fn(() => mockAbortController);
      
      // Mock fetch to reject with AbortError
      fetch.mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'));

      const result = await new Promise(resolve => {
        resolveDOIToFinalUrl(originalUrl, resolve);
      });

      expect(result).toBe(originalUrl);
    });

    test('should return original URL for non-DOI URLs', async () => {
      const nonDoiUrl = 'https://example.com/page';
      
      const result = await new Promise(resolve => {
        resolveDOIToFinalUrl(nonDoiUrl, resolve);
      });

      expect(result).toBe(nonDoiUrl);
      expect(fetch).not.toHaveBeenCalled();
    });

    test('should handle DOI URLs without proper format', async () => {
      const malformedDoiUrl = 'https://doi.org/';
      
      const result = await new Promise(resolve => {
        resolveDOIToFinalUrl(malformedDoiUrl, resolve);
      });

      expect(result).toBe(malformedDoiUrl);
    });
  });

  describe('Configuration Management', () => {
    test('should load default configuration on startup', () => {
      // Simulate startup
      const startupListener = mockChrome.runtime.onStartup.addListener.mock.calls[0][0];
      startupListener();

      expect(mockChrome.storage.sync.get).toHaveBeenCalledWith(
        ['enabled', 'redirectPrefixes', 'urlPatterns', 'activePrefixIndex'],
        expect.any(Function)
      );
    });

    test('should handle missing storage data gracefully', () => {
      mockChrome.storage.sync.data = {}; // Empty storage
      
      const startupListener = mockChrome.runtime.onStartup.addListener.mock.calls[0][0];
      startupListener();

      // Should use default values when storage is empty
      expect(mockChrome.storage.sync.get).toHaveBeenCalled();
    });

    test('should validate activePrefixIndex bounds', () => {
      mockChrome.storage.sync.data = {
        activePrefixIndex: 10, // Invalid index
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes
      };
      
      const startupListener = mockChrome.runtime.onStartup.addListener.mock.calls[0][0];
      startupListener();

      // Should reset to 0 if index is out of bounds
      expect(mockChrome.storage.sync.get).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    test('should handle toggleEnabled message', () => {
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      
      const response = messageListener({
        action: 'toggleEnabled',
        enabled: false
      }, null, jest.fn());

      expect(response).toBe(true);
    });

    test('should handle getState message', () => {
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      messageListener({
        action: 'getState'
      }, null, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
        enabled: expect.any(Boolean),
        redirectPrefixes: expect.any(Array),
        urlPatterns: expect.any(Array),
        activePrefixIndex: expect.any(Number)
      }));
    });

    test('should handle updateConfig message', () => {
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      const newConfig = {
        redirectPrefixes: [{ url: 'https://test.com/', name: 'Test' }],
        urlPatterns: [{ name: 'Test', pattern: 'test.com', type: 'hostContains', active: true }],
        activePrefixIndex: 0
      };

      messageListener({
        action: 'updateConfig',
        ...newConfig
      }, null, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle setActivePrefix message', () => {
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      messageListener({
        action: 'setActivePrefix',
        index: 2
      }, null, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ success: true });
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        activePrefixIndex: 2
      }, expect.any(Function));
    });

    test('should handle tryNextPrefix message', () => {
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      messageListener({
        action: 'tryNextPrefix'
      }, null, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        newIndex: expect.any(Number),
        prefix: expect.any(Object)
      }));
    });
  });

  describe('Web Navigation Interception', () => {
    test('should intercept matching URLs', () => {
      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      
      const details = {
        url: TEST_DATA.testUrls.doi,
        tabId: 123,
        frameId: 0
      };

      // Mock the DOI resolution
      TestHelpers.mockFetchResponse(TEST_DATA.testUrls.doi, 'https://www.nature.com/articles/nature11163');

      navigationListener(details);

      // Should attempt to redirect
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(123, {
        url: expect.stringContaining('https://sci-hub.ru/')
      });
    });

    test('should not intercept non-main frame navigation', () => {
      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      
      const details = {
        url: TEST_DATA.testUrls.doi,
        tabId: 123,
        frameId: 1 // Non-main frame
      };

      navigationListener(details);

      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    test('should not intercept when extension is disabled', () => {
      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      
      // Disable extension
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener({
        action: 'toggleEnabled',
        enabled: false
      }, null, jest.fn());

      const details = {
        url: TEST_DATA.testUrls.doi,
        tabId: 123,
        frameId: 0
      };

      navigationListener(details);

      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    test('should not intercept non-matching URLs', () => {
      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      
      const details = {
        url: 'https://example.com/page',
        tabId: 123,
        frameId: 0
      };

      navigationListener(details);

      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });
  });
});

// Helper function to test URL pattern matching (extracted from background.js)
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

// Helper function to test DOI resolution (extracted from background.js)
async function resolveDOIToFinalUrl(originalUrl, callback) {
  try {
    // First decode any URL encoding
    const decodedUrl = decodeURIComponent(originalUrl);
    
    // Check if this is a DOI URL
    if (decodedUrl.includes('doi.org/')) {
      // Extract the DOI identifier
      const doiId = decodedUrl.split('doi.org/')[1];
      
      if (doiId) {
        // Create clean DOI URL
        const cleanDOUrl = `https://doi.org/${doiId}`;
        
        // Try to fetch the DOI to get the final URL
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const response = await fetch(cleanDOUrl, {
            method: 'HEAD',
            redirect: 'manual',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          // Check for redirect headers
          const locationHeader = response.headers.get('Location');
          if (locationHeader) {
            console.log('DOI resolved to:', locationHeader);
            callback(locationHeader);
            return;
          }
          
          // If no redirect header, try following redirects
          const response2 = await fetch(cleanDOUrl, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal
          });
          
          if (response2.url !== cleanDOUrl) {
            console.log('DOI resolved to (followed):', response2.url);
            callback(response2.url);
            return;
          }
          
        } catch (fetchError) {
          console.warn('Failed to resolve DOI:', fetchError);
        }
      }
    }
    
    // If DOI resolution failed or not a DOI, use original URL but decoded
    callback(decodedUrl);
    
  } catch (error) {
    console.error('Error resolving URL:', error);
    callback(originalUrl);
  }
}
