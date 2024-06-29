// playwright.config.js
const config = {
  use: {
    headless: false, // Run tests in headful mode
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
};

module.exports = config;
