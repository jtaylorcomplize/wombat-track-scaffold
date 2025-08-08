#!/usr/bin/env node

// 30-second load test for OF-9.2.3.T3
const duration = 30 * 1000; // 30 seconds
const concurrent = 5;
const endpoint = 'http://localhost:3002/health';

let requests = 0;
let successes = 0;
let failures = 0;
let totalTime = 0;

async function makeRequest() {
  const start = Date.now();
  try {
    const response = await fetch(endpoint);
    const end = Date.now();
    totalTime += (end - start);
    requests++;
    if (response.ok) {
      successes++;
    } else {
      failures++;
    }
  } catch (error) {
    const end = Date.now();
    totalTime += (end - start);
    requests++;
    failures++;
  }
}

async function worker(endTime) {
  while (Date.now() < endTime) {
    await makeRequest();
    await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
  }
}

async function runTest() {
  console.log('🚀 Starting 30-second load test...');
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Concurrent requests: ${concurrent}`);
  
  const start = Date.now();
  const endTime = start + duration;
  
  const workers = Array(concurrent).fill().map(() => worker(endTime));
  await Promise.all(workers);
  
  const actualDuration = (Date.now() - start) / 1000;
  const rps = requests / actualDuration;
  const avgResponseTime = totalTime / requests;
  
  console.log('\n📊 Load Test Results:');
  console.log(`Duration: ${actualDuration.toFixed(2)}s`);
  console.log(`Total Requests: ${requests}`);
  console.log(`Successful: ${successes}`);
  console.log(`Failed: ${failures}`);
  console.log(`Success Rate: ${((successes / requests) * 100).toFixed(2)}%`);
  console.log(`Average RPS: ${rps.toFixed(2)}`);
  console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  
  return {
    duration: actualDuration,
    requests,
    successes,
    failures,
    rps: rps.toFixed(2),
    avgResponseTime: avgResponseTime.toFixed(2),
    successRate: ((successes / requests) * 100).toFixed(2)
  };
}

runTest().catch(console.error);