#!/usr/bin/env tsx

async function testDataExplorerAPI() {
  console.log('🔍 Testing Data Explorer API Connection');
  console.log('=====================================');
  
  try {
    // Test projects endpoint
    console.log('\n📊 Testing Projects API...');
    const projectsResponse = await fetch('http://localhost:3002/api/admin/live/projects');
    
    if (projectsResponse.ok) {
      const projectsData = await projectsResponse.json();
      const sampleProject = projectsData.data[0];
      const projectProperties = Object.keys(sampleProject);
      
      console.log(`   ✅ Projects API: ${projectsData.recordCount} records`);
      console.log(`   📋 Properties: ${projectProperties.length} (${projectProperties.length >= 19 ? 'CANONICAL ✅' : 'MISSING PROPERTIES ❌'})`);
      console.log(`   📝 Sample properties: ${projectProperties.slice(0, 10).join(', ')}...`);
      
      // Show sample canonical data
      console.log('\n   📋 Sample Project Data:');
      console.log(`      • ID: ${sampleProject.projectId}`);
      console.log(`      • Name: ${sampleProject.projectName}`);
      console.log(`      • Budget: $${sampleProject.budget} / $${sampleProject.actualCost} actual`);
      console.log(`      • Progress: ${sampleProject.completionPercentage}%`);
      console.log(`      • Priority: ${sampleProject.priority}`);
      console.log(`      • Department: ${sampleProject.department}`);
      console.log(`      • Tags: ${sampleProject.tags}`);
    } else {
      console.log(`   ❌ Projects API failed: ${projectsResponse.status}`);
    }
    
    // Test phases endpoint
    console.log('\n📊 Testing Phases API...');
    const phasesResponse = await fetch('http://localhost:3002/api/admin/live/phases');
    
    if (phasesResponse.ok) {
      const phasesData = await phasesResponse.json();
      const samplePhase = phasesData.data[0];
      const phaseProperties = Object.keys(samplePhase);
      
      console.log(`   ✅ Phases API: ${phasesData.recordCount} records`);
      console.log(`   📋 Properties: ${phaseProperties.length} (${phaseProperties.length >= 10 ? 'CANONICAL ✅' : 'MISSING PROPERTIES ❌'})`);
      console.log(`   📝 Sample properties: ${phaseProperties.join(', ')}`);
      
      // Show sample canonical data
      console.log('\n   📋 Sample Phase Data:');
      console.log(`      • ID: ${samplePhase.phaseid}`);
      console.log(`      • Name: ${samplePhase.phasename}`);
      console.log(`      • Project: ${samplePhase.project_ref}`);
      console.log(`      • Duration: ${samplePhase.estimatedDuration} est / ${samplePhase.actualDuration} actual`);
      console.log(`      • Status: ${samplePhase.RAG} (${samplePhase.status})`);
    } else {
      console.log(`   ❌ Phases API failed: ${phasesResponse.status}`);
    }
    
    console.log('\n✅ Data Explorer API Test Complete');
    console.log('==================================');
    console.log('🎯 Status: Data Explorer should now display all canonical properties');
    console.log('🔗 Access at: http://localhost:5176/orbis/admin/data-explorer');
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testDataExplorerAPI();