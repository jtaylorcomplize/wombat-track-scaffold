import DatabaseManager from '../src/server/database/connection';

async function addSampleStepProgress() {
  console.log('📝 Adding sample step progress data...');
  const dbManager = DatabaseManager.getInstance();
  
  try {
    // Get some sample phases to link steps to
    const phases = await dbManager.executeQuery('SELECT phaseid, phasename FROM phases LIMIT 5');
    
    if (phases.length === 0) {
      console.log('❌ No phases found to link steps to');
      return;
    }
    
    console.log(`Found ${phases.length} phases to add steps to`);
    
    let stepCount = 0;
    
    for (const phase of phases) {
      // Add 2-3 steps per phase
      const stepsForPhase = [
        {
          stepId: `${phase.phaseid}-STEP-1`,
          stepName: `Initialize ${phase.phasename}`,
          status: 'Completed',
          progress: 100,
          assignedTo: 'system'
        },
        {
          stepId: `${phase.phaseid}-STEP-2`, 
          stepName: `Execute ${phase.phasename} tasks`,
          status: 'In Progress',
          progress: 60,
          assignedTo: 'admin'
        },
        {
          stepId: `${phase.phaseid}-STEP-3`,
          stepName: `Review ${phase.phasename} completion`,
          status: 'Pending',
          progress: 0,
          assignedTo: 'reviewer'
        }
      ];
      
      for (const step of stepsForPhase) {
        const query = `
          INSERT INTO step_progress (
            stepId, phaseId, stepName, status, progress, assignedTo, 
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;
        
        const params = [
          step.stepId,
          phase.phaseid,
          step.stepName,
          step.status,
          step.progress,
          step.assignedTo
        ];
        
        await dbManager.executeQuery(query, params);
        stepCount++;
      }
    }
    
    console.log(`✅ Added ${stepCount} sample step progress entries`);
    
    // Log to governance
    const governanceQuery = `
      INSERT INTO governance_logs (timestamp, event_type, user_id, user_role, resource_type, resource_id, action, success, details, runtime_context)
      VALUES (datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const governanceParams = [
      'data_seed',
      'system',
      'admin', 
      'step_progress',
      'sample_data',
      'add_sample_steps',
      1,
      JSON.stringify({
        operation: 'Add Sample Step Progress',
        stepCount,
        phaseCount: phases.length
      }),
      JSON.stringify({
        phase: 'OF-PRE-GH1',
        environment: 'data_seed'
      })
    ];
    
    await dbManager.executeQuery(governanceQuery, governanceParams);
    
    console.log('📝 Governance entry logged');
    
  } catch (error) {
    console.error('❌ Error adding sample steps:', error);
    throw error;
  }
}

// Run the seeding
addSampleStepProgress().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((error) => {
  console.error('Failed:', error);
  process.exit(1);
});