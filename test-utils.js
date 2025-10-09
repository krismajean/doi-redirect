// Test utilities and helpers for DOI Redirect Extension
// This file provides mock implementations and test helpers

class MockChromeAPI {
  constructor() {
    this.storage = {
      sync: {
        data: {},
        get: jest.fn((keys, callback) => {
          const result = {};
          if (Array.isArray(keys)) {
            keys.forEach(key => {
              result[key] = this.storage.sync.data[key];
            });
          } else if (typeof keys === 'object') {
            Object.keys(keys).forEach(key => {
              result[key] = this.storage.sync.data[key] !== undefined 
                ? this.storage.sync.data[key] 
                : keys[key];
            });
          } else {
            result[keys] = this.storage.sync.data[keys];
          }
          callback(result);
        }),
        set: jest.fn((data, callback) => {
          Object.assign(this.storage.sync.data, data);
          if (callback) callback();
        }),
        clear: jest.fn((callback) => {
          this.storage.sync.data = {};
          if (callback) callback();
        })
      }
    };

    this.runtime = {
      onStartup: {
        addListener: jest.fn()
      },
      onInstalled: {
        addListener: jest.fn()
      },
      onMessage: {
        addListener: jest.fn()
      },
      sendMessage: jest.fn((message, callback) => {
        if (callback) callback({ success: true });
      }),
      openOptionsPage: jest.fn()
    };

    this.webNavigation = {
      onBeforeNavigate: {
        addListener: jest.fn()
      }
    };

    this.tabs = {
      update: jest.fn()
    };
  }

  reset() {
    this.storage.sync.data = {};
    jest.clearAllMocks();
  }
}

// Mock fetch for testing DOI resolution
global.fetch = jest.fn();

// Mock AbortController
global.AbortController = jest.fn(() => ({
  abort: jest.fn(),
  signal: {}
}));

// Test data
const TEST_DATA = {
  defaultConfig: {
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
        active: false,
        description: 'Detect PubMed research articles'
      }
    ]
  },
  testUrls: {
    doi: 'https://doi.org/10.1038/nature11163',
    doiEncoded: 'https://doi.org/10.1038%2Fnature11163',
    arxiv: 'https://arxiv.org/abs/2101.12345',
    ieee: 'https://ieeexplore.ieee.org/document/123456',
    pubmed: 'https://pubmed.ncbi.nlm.nih.gov/946794/',
    springer: 'https://link.springer.com/article/10.1007/s12345-021-01234-5',
    nature: 'https://www.nature.com/articles/s41586-021-01234-5',
    science: 'https://www.science.org/doi/10.1126/science.abc123'
  }
};

// Helper functions
const TestHelpers = {
  createMockElement: (tag, id, className = '') => {
    const element = document.createElement(tag);
    if (id) element.id = id;
    if (className) element.className = className;
    return element;
  },

  setupMockDOM: () => {
    // Mock DOM elements that the scripts expect
    const elements = {
      toggleEnabled: TestHelpers.createMockElement('input', 'toggleEnabled'),
      statusText: TestHelpers.createMockElement('span', 'statusText'),
      activePrefixName: TestHelpers.createMockElement('div', 'activePrefixName'),
      activePrefixUrl: TestHelpers.createMockElement('div', 'activePrefixUrl'),
      tryNextPrefix: TestHelpers.createMockElement('button', 'tryNextPrefix'),
      openOptions: TestHelpers.createMockElement('button', 'openOptions'),
      prefixList: TestHelpers.createMockElement('div', 'prefixList'),
      patternList: TestHelpers.createMockElement('div', 'patternList'),
      newPrefixName: TestHelpers.createMockElement('input', 'newPrefixName'),
      newPrefixUrl: TestHelpers.createMockElement('input', 'newPrefixUrl'),
      addPrefixBtn: TestHelpers.createMockElement('button', 'addPrefixBtn'),
      resetBtn: TestHelpers.createMockElement('button', 'resetBtn'),
      saveStatus: TestHelpers.createMockElement('div', 'saveStatus')
    };

    // Add elements to document
    Object.values(elements).forEach(el => {
      document.body.appendChild(el);
    });

    return elements;
  },

  cleanupMockDOM: () => {
    document.body.innerHTML = '';
  },

  mockFetchResponse: (url, responseUrl, status = 200) => {
    fetch.mockResolvedValueOnce({
      url: responseUrl,
      status: status,
      headers: {
        get: jest.fn((header) => {
          if (header === 'Location') {
            return responseUrl !== url ? responseUrl : null;
          }
          return null;
        })
      }
    });
  },

  mockFetchError: (error = new Error('Network error')) => {
    fetch.mockRejectedValueOnce(error);
  }
};

// Export for use in tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MockChromeAPI,
    TEST_DATA,
    TestHelpers
  };
}
