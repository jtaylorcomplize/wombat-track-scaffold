const { mkdir } = require('fs/promises');
const { existsSync } = require('fs');

// Create screenshots directory if it doesn't exist
beforeAll(async () => {
  const screenshotsDir = './screenshots';
  if (!existsSync(screenshotsDir)) {
    await mkdir(screenshotsDir, { recursive: true });
  }
});

// Increase timeout for all tests
jest.setTimeout(30000);

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});