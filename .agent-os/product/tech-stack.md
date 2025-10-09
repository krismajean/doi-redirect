# Technical Stack

## Core Framework
- **Application Framework**: Chrome Extension Framework (Manifest V3)
- **JavaScript Framework**: Vanilla JavaScript (ES6+)
- **CSS Framework**: Custom CSS (no external frameworks)
- **UI Component Library**: Custom HTML/CSS Components

## Data & Storage
- **Database System**: Chrome Storage API (sync/local)
- **Settings Management**: Chrome Storage Sync API
- **State Management**: In-memory state with persistent storage
- **Configuration**: JSON-based configuration system

## Browser APIs & Features
- **Navigation Control**: Chrome Web Navigation API
- **Script Injection**: Chrome Scripting API
- **Message Passing**: Chrome Runtime Messaging API
- **Storage Persistence**: Chrome Storage Sync API
- **Tab Management**: Chrome Tabs API
- **Notifications**: Chrome Notifications API (optional)

## Advanced Features
- **DOI Resolution**: Fetch API with CORS handling
- **Error Detection**: Content script injection for page analysis
- **URL Pattern Matching**: Host-based pattern detection
- **Automatic Fallback**: Error page detection and recovery
- **Debug Logging**: Console-based debugging system

## Assets & Resources
- **Fonts Provider**: System Fonts (cross-platform compatibility)
- **Icon Library**: Custom PNG Icons (16x16, 48x48, 128x128)
- **Asset Hosting**: Chrome Extension Bundle

## Deployment & Distribution
- **Application Hosting**: Chrome Web Store
- **Database Hosting**: Browser-native Storage (Chrome)
- **Deployment Solution**: Chrome Web Store Auto-deployment
- **Code Repository**: Local development (Git repository)

## Testing & Quality Assurance
- **Testing Framework**: Jest with JSDOM
- **Mock System**: Custom Chrome API mocks
- **Test Coverage**: Unit tests for all major components
- **Integration Testing**: End-to-end workflow testing
