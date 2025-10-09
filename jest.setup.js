// Jest setup file for DOI Redirect Extension tests
// This file configures Jest for testing Chrome extension code

// Mock Chrome APIs globally
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn()
    }
  },
  runtime: {
    onStartup: { addListener: jest.fn() },
    onInstalled: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() },
    sendMessage: jest.fn(),
    openOptionsPage: jest.fn()
  },
  webNavigation: {
    onBeforeNavigate: { addListener: jest.fn() }
  },
  tabs: {
    update: jest.fn()
  }
};

// Mock fetch globally
global.fetch = jest.fn();

// Mock AbortController
global.AbortController = jest.fn(() => ({
  abort: jest.fn(),
  signal: {}
}));

// Mock setTimeout and clearTimeout for better test control
jest.useFakeTimers();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Fix TextEncoder/TextDecoder for Node.js environment BEFORE loading JSDOM
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Setup DOM environment
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;

// Mock URL constructor
global.URL = dom.window.URL;

// Mock confirm and alert
global.confirm = jest.fn(() => true);
global.alert = jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
});
