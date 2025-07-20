export default {
  launch: {
    headless: process.env.HEADLESS !== 'false',
    slowMo: process.env.SLOWMO ? Number(process.env.SLOWMO) : 0,
    devtools: process.env.DEVTOOLS === 'true',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  },
  server: {
    command: 'npm run dev',
    port: 5173,
    launchTimeout: 120000, // Increased to 2 minutes for CI environment
    debug: true,
    usedPortAction: 'kill',
    waitOnScheme: {
      delay: 1000
    }
  }
};