#!/usr/bin/env node

import { performance } from 'perf_hooks';

const ENDPOINTS = [
  'http://localhost:3002/health',
  'http://localhost:3002/api/admin/runtime/status',
  'http://localhost:3002/api/admin/tables/projects'
];

const DURATION_MS = 5 * 60 * 1000; // 5 minutes
const CONCURRENT_REQUESTS = 10;

class LoadTester {
  constructor() {
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      errorCounts: {},
      rpsData: []
    };
    this.startTime = null;
  }

  async makeRequest(url) {
    const start = performance.now();
    try {
      const response = await fetch(url);
      const end = performance.now();
      const duration = end - start;
      
      this.results.totalRequests++;
      this.results.totalResponseTime += duration;
      this.results.maxResponseTime = Math.max(this.results.maxResponseTime, duration);
      this.results.minResponseTime = Math.min(this.results.minResponseTime, duration);
      
      if (response.ok) {
        this.results.successfulRequests++;
      } else {
        this.results.failedRequests++;
        const error = `HTTP_${response.status}`;
        this.results.errorCounts[error] = (this.results.errorCounts[error] || 0) + 1;
      }
    } catch (error) {
      const end = performance.now();
      const duration = end - start;
      this.results.totalRequests++;
      this.results.failedRequests++;
      this.results.totalResponseTime += duration;
      
      const errorType = error.code || error.message || 'UNKNOWN_ERROR';
      this.results.errorCounts[errorType] = (this.results.errorCounts[errorType] || 0) + 1;
    }
  }

  async runLoadTest() {
    console.log('🚀 Starting Load Test...');
    console.log(`Duration: ${DURATION_MS / 1000}s`);
    console.log(`Concurrent requests: ${CONCURRENT_REQUESTS}`);
    console.log(`Endpoints: ${ENDPOINTS.join(', ')}`);
    console.log('');

    this.startTime = Date.now();
    const endTime = this.startTime + DURATION_MS;
    
    let requestCount = 0;
    let lastRpsTime = this.startTime;
    let lastRequestCount = 0;

    const workers = [];
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      workers.push(this.runWorker(endTime));
    }

    // RPS monitoring
    const rpsInterval = setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - lastRpsTime) / 1000;
      const requestDiff = this.results.totalRequests - lastRequestCount;
      const currentRps = Math.round(requestDiff / timeDiff);
      
      this.results.rpsData.push({
        timestamp: now,
        rps: currentRps,
        totalRequests: this.results.totalRequests
      });
      
      console.log(`📊 Current RPS: ${currentRps} | Total: ${this.results.totalRequests} | Success: ${this.results.successfulRequests} | Failed: ${this.results.failedRequests}`);
      
      lastRpsTime = now;
      lastRequestCount = this.results.totalRequests;
    }, 10000); // Every 10 seconds

    await Promise.all(workers);
    clearInterval(rpsInterval);
    
    this.generateReport();
  }

  async runWorker(endTime) {
    while (Date.now() < endTime) {
      const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
      await this.makeRequest(endpoint);
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100)); // Random delay 0-100ms
    }
  }

  generateReport() {
    const duration = (Date.now() - this.startTime) / 1000;
    const avgResponseTime = this.results.totalResponseTime / this.results.totalRequests;
    const avgRps = this.results.totalRequests / duration;
    const maxRps = Math.max(...this.results.rpsData.map(d => d.rps));
    
    const report = {
      testSummary: {
        duration: `${duration.toFixed(2)}s`,
        totalRequests: this.results.totalRequests,
        successfulRequests: this.results.successfulRequests,
        failedRequests: this.results.failedRequests,
        successRate: `${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%`
      },
      performance: {
        averageRps: avgRps.toFixed(2),
        peakRps: maxRps,
        averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        minResponseTime: `${this.results.minResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${this.results.maxResponseTime.toFixed(2)}ms`
      },
      errors: this.results.errorCounts,
      rpsTimeline: this.results.rpsData
    };

    console.log('\n' + '='.repeat(60));
    console.log('📊 LOAD TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Test Duration: ${report.testSummary.duration}`);
    console.log(`Total Requests: ${report.testSummary.totalRequests}`);
    console.log(`Successful: ${report.testSummary.successfulRequests} (${report.testSummary.successRate})`);
    console.log(`Failed: ${report.testSummary.failedRequests}`);
    console.log('');
    console.log('Performance Metrics:');
    console.log(`  Average RPS: ${report.performance.averageRps}`);
    console.log(`  Peak RPS: ${report.performance.peakRps}`);
    console.log(`  Avg Response Time: ${report.performance.averageResponseTime}`);
    console.log(`  Min Response Time: ${report.performance.minResponseTime}`);
    console.log(`  Max Response Time: ${report.performance.maxResponseTime}`);
    
    if (Object.keys(report.errors).length > 0) {
      console.log('\nErrors:');
      Object.entries(report.errors).forEach(([error, count]) => {
        console.log(`  ${error}: ${count}`);
      });
    }
    console.log('='.repeat(60));
    
    return report;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new LoadTester();
  tester.runLoadTest().catch(console.error);
}