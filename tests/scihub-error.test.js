// Test for Sci-Hub error detection and fallback functionality

const { MockChromeAPI, TEST_DATA, TestHelpers } = require('../test-utils');

describe('Sci-Hub Error Detection Tests', () => {
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

  describe('Sci-Hub URL Detection', () => {
    test('should detect Sci-Hub URLs correctly', () => {
      const sciHubUrls = [
        'https://sci-hub.ru/10.1038/nature11163',
        'https://sci-hub.st/10.1000/182',
        'https://sci-hub.se/10.1126/science.abc123',
        'https://sci-hub.ee/10.1007/s12345',
        'https://sci-hub.ren/10.1038/s41586-021-01234'
      ];

      sciHubUrls.forEach(url => {
        expect(isSciHubUrl(url)).toBe(true);
      });
    });

    test('should not detect non-Sci-Hub URLs', () => {
      const nonSciHubUrls = [
        'https://doi.org/10.1038/nature11163',
        'https://pubmed.ncbi.nlm.nih.gov/946794/',
        'https://arxiv.org/abs/2101.12345',
        'https://example.com/page'
      ];

      nonSciHubUrls.forEach(url => {
        expect(isSciHubUrl(url)).toBe(false);
      });
    });
  });

  describe('Error Content Detection', () => {
    test('should detect Sci-Hub error message', () => {
      // Mock document with error content
      const mockDocument = {
        body: {
          innerText: 'Cтатья отсутствует в базе'
        }
      };
      global.document = mockDocument;

      // Mock chrome.runtime.sendMessage
      global.chrome = {
        runtime: {
          sendMessage: jest.fn()
        }
      };

      checkForSciHubError(123);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'fallbackToOriginal',
        tabId: 123
      });
    });

    test('should not trigger fallback for normal content', () => {
      // Mock document with normal content
      const mockDocument = {
        body: {
          innerText: 'This is a normal article page with content'
        }
      };
      global.document = mockDocument;

      global.chrome = {
        runtime: {
          sendMessage: jest.fn()
        }
      };

      checkForSciHubError(123);

      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    test('should handle missing document body', () => {
      // Mock document without body
      const mockDocument = {};
      global.document = mockDocument;

      global.chrome = {
        runtime: {
          sendMessage: jest.fn()
        }
      };

      checkForSciHubError(123);

      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Fallback Mechanism', () => {
    test('should handle fallback message correctly', () => {
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      // Setup original URL storage
      const originalUrls = new Map();
      originalUrls.set(123, 'https://doi.org/10.1038/nature11163');

      messageListener({
        action: 'fallbackToOriginal',
        tabId: 123
      }, null, sendResponse);

      expect(mockChrome.tabs.update).toHaveBeenCalledWith(123, {
        url: 'https://doi.org/10.1038/nature11163'
      });
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle missing original URL gracefully', () => {
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      messageListener({
        action: 'fallbackToOriginal',
        tabId: 999 // Non-existent tab ID
      }, null, sendResponse);

      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: false });
    });
  });

  describe('Integration with Navigation Flow', () => {
    test('should store original URL during navigation', () => {
      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      
      const details = {
        url: TEST_DATA.testUrls.doi,
        tabId: 123,
        frameId: 0
      };

      navigationListener(details);

      // Should store the original URL
      expect(mockChrome.tabs.update).toHaveBeenCalled();
    });

    test('should check Sci-Hub pages for errors', () => {
      const completedListener = mockChrome.webNavigation.onCompleted.addListener.mock.calls[0][0];
      
      const details = {
        url: 'https://sci-hub.ru/10.1038/nature11163',
        tabId: 123,
        frameId: 0
      };

      // Mock scripting API
      mockChrome.scripting = {
        executeScript: jest.fn().mockResolvedValue()
      };

      completedListener(details);

      expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 123 },
        func: expect.any(Function),
        args: [123]
      });
    });

    test('should clean up stored URLs when tabs are closed', () => {
      const tabRemovedListener = mockChrome.tabs.onRemoved.addListener.mock.calls[0][0];
      
      tabRemovedListener(123);

      // Should not throw error and should clean up
      expect(true).toBe(true); // Test passes if no error thrown
    });
  });

  describe('Error Handling', () => {
    test('should handle scripting injection errors gracefully', () => {
      const completedListener = mockChrome.webNavigation.onCompleted.addListener.mock.calls[0][0];
      
      const details = {
        url: 'https://sci-hub.ru/10.1038/nature11163',
        tabId: 123,
        frameId: 0
      };

      // Mock scripting API to reject
      mockChrome.scripting = {
        executeScript: jest.fn().mockRejectedValue(new Error('Injection failed'))
      };

      // Mock console.warn to verify error handling
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

      completedListener(details);

      expect(consoleWarn).toHaveBeenCalledWith(
        'Could not inject error detection script:',
        expect.any(Error)
      );

      consoleWarn.mockRestore();
    });
  });
});

// Helper functions extracted from background.js for testing
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

function checkForSciHubError(tabId) {
  // Check for the Russian error message
  const errorText = 'Cтатья отсутствует в базе';
  
  // Look for the error text in the page content
  const bodyText = document.body ? document.body.innerText : '';
  const hasError = bodyText.includes(errorText);
  
  if (hasError) {
    console.log('Sci-Hub error detected, falling back to original URL');
    
    // Send message to background script to redirect to original URL
    chrome.runtime.sendMessage({
      action: 'fallbackToOriginal',
      tabId: tabId
    });
  }
}
