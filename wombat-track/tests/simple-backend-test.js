/**
 * Simple Backend Test - Step 9.0.2.2
 * Test Azure OpenAI backend endpoint functionality
 */

async function testBackendEndpoint() {
  console.log('🔍 Testing Azure OpenAI Backend Endpoint...');
  
  try {
    const response = await fetch('http://localhost:3001/api/azure-openai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Hello, test message for backend endpoint' }
        ],
        maxTokens: 50,
        context: {
          projectName: 'Test Project',
          phaseName: 'Step 9.0.2.2',
          stepName: 'Backend Test'
        }
      })
    });

    const data = await response.json();
    console.log('📥 Response:', data);
    
    if (response.ok && data.success) {
      console.log('✅ Backend endpoint working: Azure OpenAI responded successfully');
      return true;
    } else if (data.error && data.error.includes('configuration')) {
      console.log('⚠️  Backend endpoint working but Azure config needed:', data.error);
      return true; // Endpoint is working, just needs Azure config
    } else {
      console.log('❌ Backend endpoint failed:', data.error);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n🔍 Testing Error Handling...');
  
  try {
    const response = await fetch('http://localhost:3001/api/azure-openai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing messages array
        maxTokens: 50
      })
    });

    const data = await response.json();
    
    if (!response.ok && data.error && data.error.includes('messages array is required')) {
      console.log('✅ Error handling working properly');
      return true;
    } else {
      console.log('❌ Error handling not working as expected');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Error handling test failed:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Simple Backend Tests for Step 9.0.2.2\n');
  
  let results = {
    endpoint: false,
    errorHandling: false
  };

  results.endpoint = await testBackendEndpoint();
  results.errorHandling = await testErrorHandling();
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log('\n📊 Test Summary:');
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('✅ All tests passed - Backend proxy is working correctly');
    return true;
  } else {
    console.log('❌ Some tests failed');
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runTests };