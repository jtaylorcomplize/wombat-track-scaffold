// OF-9.2.4-P1 Load Test for Staging Backend
// Target: 1.5x projected peak RPS for 10-15 minutes

const http = require('http');
const https = require('https');

class LoadTester {
  constructor(baseUrl, targetRPS = 50, durationMinutes = 12) {
    this.baseUrl = baseUrl;
    this.targetRPS = targetRPS;
    this.duration = durationMinutes * 60 * 1000; // Convert to milliseconds
    this.interval = 1000 / targetRPS; // Milliseconds between requests
    
    this.stats = {
      total: 0,
      success: 0,
      error: 0,
      timeouts: 0,
      responseTimes: [],
      startTime: null,
      endTime: null
    };
    
    this.endpoints = [
      '/health',
      '/api/governance/health',
      '/api/agents/available',
      '/api/orbis/teams',
      '/api/integration/dashboard-status'
    ];
  }

  async makeRequest(endpoint) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const url = this.baseUrl + endpoint;
      const client = url.startsWith('https') ? https : http;
      
      const req = client.get(url, { timeout: 5000 }, (res) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        this.stats.total++;
        this.stats.responseTimes.push(responseTime);
        
        if (res.statusCode >= 200 && res.statusCode < 400) {
          this.stats.success++;
        } else {
          this.stats.error++;
        }
        
        resolve({ statusCode: res.statusCode, responseTime });
      });
      
      req.on('timeout', () => {
        this.stats.total++;
        this.stats.timeouts++;
        req.destroy();
        resolve({ statusCode: 'TIMEOUT', responseTime: 5000 });
      });
      
      req.on('error', () => {
        this.stats.total++;
        this.stats.error++;
        resolve({ statusCode: 'ERROR', responseTime: Date.now() - startTime });
      });
    });
  }

  getRandomEndpoint() {
    return this.endpoints[Math.floor(Math.random() * this.endpoints.length)];
  }

  calculateStats() {
    const avgResponseTime = this.stats.responseTimes.length > 0 
      ? this.stats.responseTimes.reduce((a, b) => a + b) / this.stats.responseTimes.length 
      : 0;
      
    const sortedTimes = this.stats.responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95ResponseTime = sortedTimes[p95Index] || 0;
    
    return {
      ...this.stats,
      avgResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      successRate: ((this.stats.success / this.stats.total) * 100).toFixed(2),
      actualDuration: this.stats.endTime - this.stats.startTime,
      actualRPS: (this.stats.total / ((this.stats.endTime - this.stats.startTime) / 1000)).toFixed(2)
    };
  }

  async run() {
    console.log(`🚀 Starting load test against ${this.baseUrl}`);
    console.log(`📊 Target: ${this.targetRPS} RPS for ${this.duration/60000} minutes`);
    console.log('═'.repeat(60));
    
    this.stats.startTime = Date.now();
    const endTime = this.stats.startTime + this.duration;
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - this.stats.startTime;
      const progress = ((elapsed / this.duration) * 100).toFixed(1);
      const currentRPS = (this.stats.total / (elapsed / 1000)).toFixed(1);
      
      process.stdout.write(`\\r⏱️  Progress: ${progress}% | Requests: ${this.stats.total} | Current RPS: ${currentRPS} | Success: ${this.stats.success} | Errors: ${this.stats.error + this.stats.timeouts}`);
    }, 2000);

    while (Date.now() < endTime) {
      const requestStart = Date.now();
      const endpoint = this.getRandomEndpoint();
      
      // Fire request without awaiting (simulate concurrent load)
      this.makeRequest(endpoint).catch(() => {});
      
      // Wait for next request interval
      const elapsed = Date.now() - requestStart;
      const waitTime = Math.max(0, this.interval - elapsed);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    clearInterval(progressInterval);
    this.stats.endTime = Date.now();
    
    // Wait for any pending requests to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\\n' + '═'.repeat(60));
    console.log('📈 LOAD TEST COMPLETE');
    
    const finalStats = this.calculateStats();
    console.log(`📋 Total Requests: ${finalStats.total}`);
    console.log(`✅ Successful: ${finalStats.success} (${finalStats.successRate}%)`);
    console.log(`❌ Errors: ${finalStats.error}`);
    console.log(`⏰ Timeouts: ${finalStats.timeouts}`);
    console.log(`📏 Avg Response Time: ${finalStats.avgResponseTime}ms`);
    console.log(`🎯 95th Percentile: ${finalStats.p95ResponseTime}ms`);
    console.log(`🔥 Actual RPS: ${finalStats.actualRPS}`);
    console.log(`⏱️  Duration: ${Math.round(finalStats.actualDuration/1000)}s`);
    
    return finalStats;
  }
}

// Run load test
const loadTester = new LoadTester('http://localhost:3001', 50, 12);
loadTester.run()
  .then(stats => {
    console.log('\\n💾 Saving results to load-test-results.json');
    require('fs').writeFileSync('./DriveMemory/OF-9.2/9.2.4-P1/load-test-results.json', 
      JSON.stringify(stats, null, 2));
    process.exit(stats.successRate > 95 ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ Load test failed:', err);
    process.exit(1);
  });