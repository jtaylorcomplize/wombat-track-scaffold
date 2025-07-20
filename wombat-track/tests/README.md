# Puppeteer Test Suite for Wombat Tracks

## Overview
This directory contains Puppeteer-based UI tests for the Wombat Tracks MetaPlatform dashboard.

## Directory Structure
```
tests/
├── ui/                     # UI test specs
│   ├── meta_platform_dashboard.spec.js
│   └── sample.test.js
├── utils/                  # Test utilities
│   └── puppeteer-setup.js
└── README.md
```

## Running Tests

### Prerequisites
```bash
# Install dependencies
npm install
```

### Run all tests
```bash
npm test
```

### Run UI tests only
```bash
npm run test:ui
```

### Run tests in headed mode (visible browser)
```bash
npm run test:ui:headed
```

### Run tests in watch mode
```bash
npm run test:ui:watch
```

### Run specific test file
```bash
npm test -- tests/ui/meta_platform_dashboard.spec.js
```

## Environment Variables

- `TEST_URL` - Base URL for tests (default: http://localhost:5173)
- `HEADLESS` - Run in headless mode (default: true)
- `SLOWMO` - Slow down Puppeteer operations by specified ms
- `DEVTOOLS` - Open Chrome DevTools automatically

Example:
```bash
TEST_URL=https://staging.example.com HEADLESS=false npm run test:ui
```

## Writing Tests

### Basic Test Structure
```javascript
import { describe, it, expect } from '@jest/globals';
import { launchBrowser, createPage, cleanup } from '../utils/puppeteer-setup.js';

describe('Feature Name', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await launchBrowser();
    page = await createPage(browser);
  });

  afterAll(async () => {
    await cleanup(browser);
  });

  it('should do something', async () => {
    await page.goto('https://example.com');
    // Your test logic here
  });
});
```

### Available Utilities

The `puppeteer-setup.js` provides these helper functions:

- `launchBrowser(headless)` - Launch browser instance
- `createPage(browser)` - Create configured page
- `waitAndClick(page, selector)` - Wait for element and click
- `waitAndType(page, selector, text)` - Wait for element and type
- `takeScreenshot(page, name)` - Take timestamped screenshot
- `safeNavigate(page, url)` - Navigate with error handling
- `cleanup(browser)` - Close browser instance

### Test Data Attributes

Add data-testid attributes to your React components for reliable test selectors:

```jsx
<div data-testid="dashboard-header">
  <h1 data-testid="dashboard-title">MetaPlatform</h1>
  <button data-testid="send-to-github-button">Send to GitHub</button>
</div>
```

## CI/CD Integration

Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Manual workflow dispatch

Failed tests will upload screenshots as artifacts.

## Debugging Failed Tests

1. Run tests in headed mode to see what's happening:
   ```bash
   npm run test:ui:headed
   ```

2. Enable DevTools:
   ```bash
   DEVTOOLS=true npm run test:ui:headed
   ```

3. Add slowmo to slow down operations:
   ```bash
   SLOWMO=250 npm run test:ui:headed
   ```

4. Check screenshots in the `screenshots/` directory

## Best Practices

1. Use data-testid attributes instead of CSS classes
2. Always wait for elements before interacting
3. Use appropriate timeouts for async operations
4. Take screenshots at key points for debugging
5. Mock external API calls when possible
6. Test responsive design at multiple viewports
7. Check for console errors
8. Measure performance metrics

## Troubleshooting

### Tests timeout
- Increase timeout in jest.config.js
- Check if selectors are correct
- Ensure app is running at TEST_URL

### Cannot find module
- Run `npm install`
- Check import paths use .js extension

### Browser fails to launch
- Install system dependencies (see CI workflow)
- Try with `--no-sandbox` flag