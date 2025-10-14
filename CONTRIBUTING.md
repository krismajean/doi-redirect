# Contributing to DOI Redirect Extension

Thank you for your interest in contributing to the DOI Redirect Extension! This document provides guidelines and information for contributors.

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please be respectful, inclusive, and constructive in all interactions.

## How to Contribute

### Reporting Issues

Before creating an issue, please:

1. Check if the issue already exists
2. Search through closed issues to see if it was already resolved
3. Make sure you're using the latest version

When creating an issue, please include:

- **Clear description** of the problem
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Browser version** and operating system
- **Extension version** (found in `chrome://extensions/`)
- **Console errors** (if any) - check Developer Tools

### Suggesting Features

We welcome feature suggestions! When proposing a new feature:

1. Check if it aligns with the project's educational purpose
2. Consider the impact on existing functionality
3. Provide a clear use case and rationale
4. Consider implementation complexity

### Contributing Code

#### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/doi-redirect.git
   cd doi-redirect
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run tests to ensure everything works:
   ```bash
   npm test
   ```

#### Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**:
   ```bash
   npm test
   npm run test:coverage
   ```

4. **Test manually**:
   - Load the extension in Chrome (`chrome://extensions/` → Load unpacked)
   - Test the functionality thoroughly
   - Verify it works across different academic sites

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**

#### Code Style Guidelines

- **JavaScript**: Follow standard JavaScript conventions
- **Comments**: Add comments for complex logic
- **Functions**: Keep functions focused and single-purpose
- **Variables**: Use descriptive variable names
- **Error Handling**: Include proper error handling

#### Testing Guidelines

- **Unit Tests**: Write tests for all new functions
- **Integration Tests**: Test the complete flow
- **Edge Cases**: Consider edge cases and error conditions
- **Cross-browser**: Test in Chrome (primary target)

### Pull Request Process

1. **Ensure tests pass**: All tests must pass before merging
2. **Update documentation**: Update README.md if needed
3. **Write clear commit messages**: Use conventional commit format
4. **Link issues**: Reference related issues in your PR description
5. **Be responsive**: Respond to feedback promptly

#### Pull Request Template

When creating a PR, please include:

- **Description**: What changes were made and why
- **Testing**: How you tested the changes
- **Screenshots**: If UI changes were made
- **Breaking Changes**: Any breaking changes (unlikely for this project)

### Areas for Contribution

We particularly welcome contributions in these areas:

- **Bug Fixes**: Fixing reported issues
- **Test Coverage**: Adding more comprehensive tests
- **Documentation**: Improving README, code comments, or guides
- **Performance**: Optimizing URL matching and redirection
- **Accessibility**: Improving accessibility features
- **New Academic Sites**: Adding support for more academic platforms

### Academic Site Integration

When adding support for new academic sites:

1. **Research the site**: Understand their URL patterns
2. **Test thoroughly**: Ensure redirection works correctly
3. **Update manifest.json**: Add necessary permissions
4. **Add tests**: Include tests for the new site
5. **Update documentation**: Add the site to supported sites list

### Security Considerations

- **Permissions**: Only request necessary permissions
- **Content Security**: Be mindful of CSP policies
- **Data Privacy**: Don't collect or store user data unnecessarily
- **URL Validation**: Validate URLs before redirection

### Release Process

Releases are managed by maintainers. When your PR is merged:

1. Version will be bumped appropriately
2. Changelog will be updated
3. Release notes will be created
4. Extension will be packaged for distribution

## Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Request Comments**: For specific code-related questions

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for contributing to make this extension better for the academic community!
