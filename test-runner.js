#!/usr/bin/env node

// Test runner script for DOI Redirect Extension
// Provides easy commands to run different test suites

const { execSync } = require('child_process');
const path = require('path');

const commands = {
  'test': 'jest',
  'test:watch': 'jest --watch',
  'test:coverage': 'jest --coverage',
  'test:background': 'jest tests/background.test.js',
  'test:popup': 'jest tests/popup.test.js',
  'test:options': 'jest tests/options.test.js',
  'test:integration': 'jest tests/integration.test.js',
  'test:unit': 'jest tests/background.test.js tests/popup.test.js tests/options.test.js'
};

function runCommand(command) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname)
    });
    console.log(`✅ ${command} completed successfully`);
  } catch (error) {
    console.error(`❌ ${command} failed:`, error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
DOI Redirect Extension - Test Runner

Usage: node test-runner.js <command>

Available commands:
  test              Run all tests
  test:watch        Run tests in watch mode
  test:coverage     Run tests with coverage report
  test:background   Run background script tests only
  test:popup        Run popup script tests only
  test:options      Run options script tests only
  test:integration  Run integration tests only
  test:unit         Run all unit tests (background, popup, options)
  help              Show this help message

Examples:
  node test-runner.js test
  node test-runner.js test:coverage
  node test-runner.js test:background
`);
}

function main() {
  const command = process.argv[2];

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  if (commands[command]) {
    runCommand(commands[command]);
  } else {
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }
}

main();
