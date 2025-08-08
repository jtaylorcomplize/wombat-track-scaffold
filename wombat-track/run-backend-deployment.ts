import AzureBackendDeployer from './scripts/azure-app-service-backend.js';

async function main() {
  const deployer = new AzureBackendDeployer();
  await deployer.deployBackendAPI();
}

main().catch(console.error);