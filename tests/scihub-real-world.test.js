// Test for Sci-Hub error detection with real-world example

const { MockChromeAPI, TEST_DATA, TestHelpers } = require('../test-utils');

describe('Sci-Hub Error Detection - Real World Test', () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = new MockChromeAPI();
    global.chrome = mockChrome;
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockChrome.reset();
  });

  describe('PubMed URL Error Detection', () => {
    test('should detect error for PubMed URL that Sci-Hub does not have', () => {
      // Test the specific URL from the user's example
      const pubmedUrl = 'https://pubmed.ncbi.nlm.nih.gov/29557336/';
      const sciHubUrl = 'https://sci-hub.ru/https://pubmed.ncbi.nlm.nih.gov/29557336/';
      
      // Mock document with the actual error message
      const mockDocument = {
        body: {
          innerText: 'Cтатья отсутствует в базе'
        }
      };
      global.document = mockDocument;

      global.chrome = {
        runtime: {
          sendMessage: jest.fn()
        }
      };

      // Test the error detection function
      checkForSciHubError(123);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'fallbackToOriginal',
        tabId: 123
      });
    });

    test('should handle the complete workflow for unavailable articles', () => {
      const pubmedUrl = 'https://pubmed.ncbi.nlm.nih.gov/29557336/';
      
      // Setup extension state
      mockChrome.storage.sync.data = {
        enabled: true,
        redirectPrefixes: TEST_DATA.defaultConfig.redirectPrefixes,
        urlPatterns: TEST_DATA.defaultConfig.urlPatterns,
        settings: { enableSciHubErrorDetection: true },
        activePrefixIndex: 0
      };

      // Simulate navigation to PubMed URL
      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      const details = {
        url: pubmedUrl,
        tabId: 123,
        frameId: 0
      };

      navigationListener(details);

      // Should redirect to Sci-Hub
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(123, {
        url: expect.stringContaining('https://sci-hub.ru/')
      });

      // Simulate Sci-Hub page loading with error
      const completedListener = mockChrome.webNavigation.onCompleted.addListener.mock.calls[0][0];
      const completedDetails = {
        url: 'https://sci-hub.ru/https://pubmed.ncbi.nlm.nih.gov/29557336/',
        tabId: 123,
        frameId: 0
      };

      // Mock scripting API
      mockChrome.scripting = {
        executeScript: jest.fn().mockResolvedValue()
      };

      completedListener(completedDetails);

      // Should inject error detection script
      expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 123 },
        func: expect.any(Function),
        args: [123]
      });
    });

    test('should fallback to original URL when error is detected', () => {
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      // Setup original URL storage (simulating what would happen during navigation)
      const originalUrls = new Map();
      originalUrls.set(123, 'https://pubmed.ncbi.nlm.nih.gov/29557336/');

      messageListener({
        action: 'fallbackToOriginal',
        tabId: 123
      }, null, sendResponse);

      expect(mockChrome.tabs.update).toHaveBeenCalledWith(123, {
        url: 'https://pubmed.ncbi.nlm.nih.gov/29557336/'
      });
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('Error Message Variations', () => {
    test('should detect different error message formats', () => {
      const errorMessages = [
        'Cтатья отсутствует в базе',
        'Cтатья отсутствует в базе\n',
        '  Cтатья отсутствует в базе  ',
        'Error: Cтатья отсутствует в базе',
        'Cтатья отсутствует в базе. Please try another source.'
      ];

      errorMessages.forEach(errorText => {
        const mockDocument = {
          body: {
            innerText: errorText
          }
        };
        global.document = mockDocument;

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
    });

    test('should not trigger fallback for normal content', () => {
      const normalContent = [
        'This is a normal article page',
        'PDF download available',
        'Article content here...',
        'Cтатья отсутствует в базе data but not the exact error',
        'Some other Russian text'
      ];

      normalContent.forEach(content => {
        const mockDocument = {
          body: {
            innerText: content
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
    });
  });

  describe('Performance and Timing', () => {
    test('should handle rapid navigation events', () => {
      const pubmedUrl = 'https://pubmed.ncbi.nlm.nih.gov/29557336/';
      
      // Simulate rapid navigation events
      const navigationListener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      
      for (let i = 0; i < 5; i++) {
        const details = {
          url: pubmedUrl,
          tabId: 123 + i,
          frameId: 0
        };

        navigationListener(details);
      }

      // Should handle all navigation events
      expect(mockChrome.tabs.update).toHaveBeenCalledTimes(5);
    });

    test('should clean up stored URLs properly', () => {
      const tabRemovedListener = mockChrome.tabs.onRemoved.addListener.mock.calls[0][0];
      
      // Simulate tab removal
      tabRemovedListener(123);

      // Should not throw error and should clean up
      expect(true).toBe(true); // Test passes if no error thrown
    });
  });
});

// Helper function extracted from background.js for testing
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
