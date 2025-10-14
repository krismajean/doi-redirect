# DOI Redirect Chrome Extension

A Chrome extension that automatically redirects academic URLs through custom prefixes. Perfect for academics, researchers, and anyone who needs custom URL transformations.

## Features

- **Automatic DOI Redirection**: Automatically redirects DOI URLs through configurable prefixes
- **Academic Site Support**: Works with arXiv, IEEE, Springer, Nature, PubMed, and other academic sites
- **Customizable**: Configure your own redirect prefixes through the options page
- **Privacy-Focused**: All processing happens locally in your browser
- **Educational Tool**: Designed for educational and research purposes

## Installation

### Quick Download (Recommended)

**🎯 One-Click Installation:**

1. **Download the extension**: [doi-redirect-extension-v2.0.0.zip](https://github.com/krismajean/doi-redirect/releases/latest/download/doi-redirect-extension-v2.0.0.zip)
2. **Extract the zip file** to any folder on your computer
3. **Open Chrome** and go to `chrome://extensions/`
4. **Enable "Developer mode"** (toggle in top right)
5. **Click "Load unpacked"** and select the extracted folder
6. **Done!** The extension is now installed and ready to use

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/doi-redirect.git
   cd doi-redirect
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `doi-redirect` folder

### From Chrome Web Store

*Coming soon - this extension will be available on the Chrome Web Store*

## Usage

1. **Install the extension** following the installation steps above
2. **Configure prefixes** by clicking the extension icon and going to Options
3. **Browse normally** - the extension will automatically redirect URLs when they match configured patterns

### Supported Sites

- DOI.org (Digital Object Identifiers)
- arXiv.org (Preprints)
- IEEE.org (Technical papers)
- Springer.com (Academic journals)
- Nature.com (Scientific journals)
- PubMed (Medical literature)
- And many more academic sites

## Configuration

Click the extension icon and select "Options" to configure:

- **DOI Prefixes**: Set custom prefixes for DOI redirection
- **Site-specific Rules**: Configure different rules for different academic sites
- **Enable/Disable**: Turn the extension on or off for specific sites

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Chrome browser

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/doi-redirect.git
   cd doi-redirect
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Run tests in watch mode:
   ```bash
   npm run test:watch
   ```

5. Generate test coverage:
   ```bash
   npm run test:coverage
   ```

### Project Structure

```
doi-redirect/
├── background.js          # Service worker for URL redirection
├── content-script.js      # Content script for page interaction
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── popup.css             # Popup styling
├── options.html          # Options page
├── options.js            # Options page functionality
├── options.css           # Options page styling
├── help-styles.css       # Help system styling
├── manifest.json         # Extension manifest
├── icons/                # Extension icons
├── tests/                # Test files
└── package.json          # Dependencies and scripts
```

### Testing

The project uses Jest for testing with jsdom environment. Tests are located in the `tests/` directory:

- `background.test.js` - Tests for background service worker
- `popup.test.js` - Tests for popup functionality
- `options.test.js` - Tests for options page
- `integration.test.js` - End-to-end integration tests
- `cors-handling.test.js` - Tests for CORS handling
- `scihub-error.test.js` - Tests for error handling
- `scihub-real-world.test.js` - Real-world scenario tests

### Building

This extension doesn't require a build step - it runs directly from source files. 

#### Creating a Release Package

To create a distribution package:

```bash
# Run the packaging script
./package-release.sh
```

This will:
- Create a clean package with only essential files
- Generate a versioned zip file (e.g., `doi-redirect-extension-v2.0.0.zip`)
- Include installation instructions

#### GitHub Releases

For automatic releases:

1. **Create a git tag**: `git tag v2.0.1`
2. **Push the tag**: `git push origin v2.0.1`
3. **GitHub Actions** will automatically:
   - Run tests
   - Create the package
   - Generate a release with download links

#### Manual Distribution

1. Run `./package-release.sh` to create the zip file
2. Upload to Chrome Web Store or distribute manually
3. Share the zip file with users

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m "Add feature"`
6. Push to your fork: `git push origin feature-name`
7. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This extension is designed as an educational tool for URL redirection. Users must ensure compliance with copyright laws, institutional policies, and terms of service of the websites they access. Use at your own risk.

## Support

- **Issues**: Report bugs or request features on [GitHub Issues](https://github.com/YOUR_USERNAME/doi-redirect/issues)
- **Discussions**: Join the conversation on [GitHub Discussions](https://github.com/YOUR_USERNAME/doi-redirect/discussions)

## Changelog

### Version 2.0.0
- Complete rewrite with Manifest V3
- Improved URL matching and redirection
- Enhanced options page with better UX
- Comprehensive test coverage
- Support for more academic sites

### Version 1.0.0
- Initial release
- Basic DOI redirection functionality
