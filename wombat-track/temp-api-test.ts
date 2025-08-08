
import { GovernanceProjectHooks } from '../src/services/governanceProjectHooks';

const hooks = GovernanceProjectHooks.getInstance();
const success = await hooks.processGovernanceEntry({
  projectId: 'API-VISIBLE-1754620858898',
  summary: 'API visibility test project',
  actor: 'ci-api-test',
  status: 'Active',
  objectiveOrDescription: 'Testing project visibility in API endpoints'
});

console.log(JSON.stringify({ success, projectId: 'API-VISIBLE-1754620858898' }));
      