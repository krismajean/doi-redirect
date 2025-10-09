// Test for CORS handling in DOI resolution

const { MockChromeAPI, TEST_DATA, TestHelpers } = require('../test-utils');

describe('CORS Handling Tests', () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = new MockChromeAPI();
    global.chrome = mockChrome;
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockChrome.reset();
  });

  describe('DOI Resolution with CORS Errors', () => {
    test('should handle CORS errors gracefully', async () => {
      // Mock fetch to simulate CORS error
      global.fetch = jest.fn().mockRejectedValue(new Error('CORS policy: No \'Access-Control-Allow-Origin\' header'));

      const originalUrl = 'https://doi.org/10.4269/ajtmh.17-0927';
      
      const result = await new Promise(resolve => {
        resolveDOIToFinalUrl(originalUrl, resolve);
      });

      // Should return original URL when CORS error occurs
      expect(result).toBe(originalUrl);
      expect(fetch).toHaveBeenCalled();
    });

    test('should handle network timeout errors', async () => {
      // Mock fetch to simulate timeout
      global.fetch = jest.fn().mockRejectedValue(new Error('The operation was aborted.'));

      const originalUrl = 'https://doi.org/10.1038/nature11163';
      
      const result = await new Promise(resolve => {
        resolveDOIToFinalUrl(originalUrl, resolve);
      });

      // Should return original URL when timeout occurs
      expect(result).toBe(originalUrl);
    });

    test('should handle successful DOI resolution', async () => {
      const originalUrl = 'https://doi.org/10.1038/nature11163';
      const resolvedUrl = 'https://www.nature.com/articles/nature11163';
      
      // Mock successful fetch
      global.fetch = jest.fn().mockResolvedValue({
        url: resolvedUrl,
        status: 200
      });

      const result = await new Promise(resolve => {
        resolveDOIToFinalUrl(originalUrl, resolve);
      });

      // Should return resolved URL when successful
      expect(result).toBe(resolvedUrl);
    });
  });

  describe('Settings-based DOI Resolution', () => {
    test('should skip DOI resolution when disabled', () => {
      const settings = { resolveDOIs: false };
      const url = 'https://doi.org/10.1038/nature11163';
      
      // Mock navigation listener
      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      
      const details = {
        url: url,
        tabId: 123,
        frameId: 0
      };

      // Set settings to disable DOI resolution
      global.settings = settings;

      navigationListener(details);

      // Should redirect directly without DOI resolution
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(123, {
        url: expect.stringContaining('https://sci-hub.ru/')
      });
    });

    test('should perform DOI resolution when enabled', () => {
      const settings = { resolveDOIs: true };
      const url = 'https://doi.org/10.1038/nature11163';
      
      // Mock successful fetch
      global.fetch = jest.fn().mockResolvedValue({
        url: 'https://www.nature.com/articles/nature11163',
        status: 200
      });

      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      
      const details = {
        url: url,
        tabId: 123,
        frameId: 0
      };

      // Set settings to enable DOI resolution
      global.settings = settings;

      navigationListener(details);

      // Should attempt DOI resolution
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed DOI URLs', async () => {
      const malformedUrl = 'https://doi.org/';
      
      const result = await new Promise(resolve => {
        resolveDOIToFinalUrl(malformedUrl, resolve);
      });

      // Should return original URL for malformed DOI
      expect(result).toBe(malformedUrl);
    });

    test('should handle non-DOI URLs', async () => {
      const nonDoiUrl = 'https://example.com/page';
      
      const result = await new Promise(resolve => {
        resolveDOIToFinalUrl(nonDoiUrl, resolve);
      });

      // Should return original URL for non-DOI
      expect(result).toBe(nonDoiUrl);
      expect(fetch).not.toHaveBeenCalled();
    });

    test('should handle URL encoding issues', async () => {
      const encodedUrl = 'https://doi.org/10.1038%2Fnature11163';
      const decodedUrl = 'https://doi.org/10.1038/nature11163';
      
      // Mock successful fetch
      global.fetch = jest.fn().mockResolvedValue({
        url: 'https://www.nature.com/articles/nature11163',
        status: 200
      });

      const result = await new Promise(resolve => {
        resolveDOIToFinalUrl(encodedUrl, resolve);
      });

      // Should decode URL and attempt resolution
      expect(fetch).toHaveBeenCalledWith(decodedUrl, expect.any(Object));
    });
  });
});

// Helper function extracted from background.js for testing
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
        
        // Try to resolve DOI with a simple approach that handles CORS gracefully
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // Shorter timeout
          
          const response = await fetch(cleanDOUrl, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          // Check if the URL changed (indicating a redirect)
          if (response.url !== cleanDOUrl) {
            console.log('DOI resolved to:', response.url);
            callback(response.url);
            return;
          }
          
        } catch (fetchError) {
          // CORS errors and other fetch errors are expected and handled gracefully
          console.debug('DOI resolution failed (CORS or other issue):', fetchError.message);
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
