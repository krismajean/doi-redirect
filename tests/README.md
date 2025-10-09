# DOI Redirect Extension - Test Suite

This directory contains comprehensive unit tests and integration tests for the DOI Redirect Chrome Extension.

## Test Structure

### Test Files

- **`test-utils.js`** - Test utilities, mock implementations, and helper functions
- **`tests/background.test.js`** - Unit tests for background script functionality
- **`tests/popup.test.js`** - Unit tests for popup interface functionality  
- **`tests/options.test.js`** - Unit tests for options page functionality
- **`tests/integration.test.js`** - Integration tests for complete workflows

### Configuration Files

- **`package.json`** - Node.js dependencies and Jest configuration
- **`jest.setup.js`** - Jest setup and global mocks

## Running Tests

### Prerequisites

Install Node.js dependencies:

```bash
npm install
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

The test suite covers:

### Background Script (`background.js`)
- ✅ URL pattern matching (DOI, arXiv, IEEE, PubMed, Springer, Nature, Science)
- ✅ DOI resolution and URL decoding
- ✅ Configuration management and storage
- ✅ Message handling between components
- ✅ Web navigation interception
- ✅ Error handling and edge cases

### Popup Script (`popup.js`)
- ✅ State loading and display
- ✅ Toggle functionality (enable/disable)
- ✅ Prefix management and rotation
- ✅ Options page integration
- ✅ Status updates and visual feedback
- ✅ Error handling

### Options Script (`options.js`)
- ✅ Configuration loading and saving
- ✅ Prefix management (add, delete, select)
- ✅ Pattern management (toggle, delete)
- ✅ Reset to defaults functionality
- ✅ Form validation
- ✅ Status messages and user feedback
- ✅ Event handling

### Integration Tests
- ✅ Complete DOI redirection workflow
- ✅ PubMed redirection workflow
- ✅ Prefix rotation workflow
- ✅ Configuration persistence across components
- ✅ Cross-component communication
- ✅ Error handling integration
- ✅ Mixed pattern type handling

## Test Utilities

### MockChromeAPI
Provides mock implementations of Chrome extension APIs:
- `chrome.storage.sync` - Storage operations
- `chrome.runtime` - Runtime messaging and lifecycle
- `chrome.webNavigation` - Navigation interception
- `chrome.tabs` - Tab management

### TestHelpers
Utility functions for test setup:
- `setupMockDOM()` - Creates mock DOM elements
- `cleanupMockDOM()` - Cleans up DOM after tests
- `mockFetchResponse()` - Mocks fetch responses
- `mockFetchError()` - Mocks fetch errors

### TEST_DATA
Contains test data and configurations:
- Default extension configuration
- Sample URLs for different platforms
- Test patterns and prefixes

## Mocking Strategy

### Chrome APIs
All Chrome extension APIs are mocked to allow testing without a browser environment:
- Storage operations are simulated in memory
- Runtime messaging uses Jest mocks
- Navigation events are simulated

### DOM Environment
Uses JSDOM to provide a browser-like DOM environment:
- Document and window objects
- Event handling
- Element manipulation

### Network Requests
Fetch API is mocked to control network behavior:
- Successful responses
- Error conditions
- Timeout scenarios

## Test Patterns

### Unit Tests
Each component is tested in isolation with mocked dependencies:
- Individual function testing
- State management testing
- Event handling testing
- Error condition testing

### Integration Tests
Test complete workflows across multiple components:
- End-to-end user scenarios
- Component interaction testing
- Configuration persistence
- Error propagation

### Mock Patterns
- **Setup/Teardown**: Each test sets up required mocks and cleans up afterward
- **Isolation**: Tests don't depend on each other's state
- **Realistic Data**: Uses realistic test data that matches production scenarios

## Coverage Goals

- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

## Adding New Tests

### For New Features
1. Add unit tests for individual functions
2. Add integration tests for workflows
3. Update mock data if needed
4. Ensure coverage targets are met

### For Bug Fixes
1. Add regression tests that reproduce the bug
2. Verify the fix resolves the issue
3. Ensure no existing functionality is broken

## Continuous Integration

The test suite is designed to run in CI environments:
- No external dependencies
- Deterministic results
- Fast execution
- Clear failure reporting
