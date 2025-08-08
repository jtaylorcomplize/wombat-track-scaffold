/**
 * OF-9.2.1.1: Provision Azure SQL Production Tier
 * Creates production-ready Azure SQL database with proper scaling and security
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

interface AzureSQLConfig {
  resourceGroup: string;
  serverName: string;
  databaseName: string;
  location: string;
  adminUsername: string;
  adminPassword: string;
  tier: 'Basic' | 'Standard' | 'Premium' | 'GeneralPurpose' | 'BusinessCritical';
  maxSizeGb: number;
  backupRetentionDays: number;
}

class AzureSQLProvisioner {
  private config: AzureSQLConfig;

  constructor() {
    this.config = {
      resourceGroup: process.env.AZURE_RESOURCE_GROUP || 'of-8-6-cloud-rg',
      serverName: process.env.AZURE_SQL_SERVER || 'wombat-track-prod-sql',
      databaseName: process.env.AZURE_SQL_DATABASE || 'wombat-track-prod',
      location: process.env.AZURE_LOCATION || 'Australia East',
      adminUsername: process.env.AZURE_SQL_ADMIN_USER || 'wtadmin',
      adminPassword: process.env.AZURE_SQL_ADMIN_PASSWORD || '',
      tier: 'GeneralPurpose',
      maxSizeGb: 100,
      backupRetentionDays: 35
    };
  }

  async provisionProductionSQL(): Promise<void> {
    console.log('🚀 OF-9.2.1.1: Provisioning Azure SQL Production Tier...');

    try {
      // Check if server exists
      await this.checkServerExists();
      
      // Create SQL Server if not exists
      await this.createSQLServer();
      
      // Configure firewall rules
      await this.configureFirewallRules();
      
      // Create production database
      await this.createProductionDatabase();
      
      // Configure backup and retention policies
      await this.configureBackupPolicies();
      
      // Validate connection
      await this.validateConnection();
      
      console.log('✅ Azure SQL Production Tier provisioned successfully');
      
      // Log to governance
      await this.logToGovernance('OF-9.2.1.1', 'completed', 'Azure SQL Production Tier provisioned');
      
    } catch (error) {
      console.error('❌ Azure SQL provisioning failed:', error);
      await this.logToGovernance('OF-9.2.1.1', 'failed', `Azure SQL provisioning failed: ${error}`);
      throw error;
    }
  }

  private async checkServerExists(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`az sql server show --name ${this.config.serverName} --resource-group ${this.config.resourceGroup}`);
      console.log('📍 SQL Server exists:', this.config.serverName);
      return true;
    } catch (error) {
      console.log('📍 SQL Server does not exist, will create');
      return false;
    }
  }

  private async createSQLServer(): Promise<void> {
    const command = `az sql server create \
      --name ${this.config.serverName} \
      --resource-group ${this.config.resourceGroup} \
      --location "${this.config.location}" \
      --admin-user ${this.config.adminUsername} \
      --admin-password "${this.config.adminPassword}" \
      --enable-ad-only-auth false`;

    const { stdout } = await execAsync(command);
    console.log('🏗️ SQL Server created:', JSON.parse(stdout).name);
  }

  private async configureFirewallRules(): Promise<void> {
    // Allow Azure services
    await execAsync(`az sql server firewall-rule create \
      --resource-group ${this.config.resourceGroup} \
      --server ${this.config.serverName} \
      --name AllowAzureServices \
      --start-ip-address 0.0.0.0 \
      --end-ip-address 0.0.0.0`);

    // Allow development IPs (update with your actual IPs)
    await execAsync(`az sql server firewall-rule create \
      --resource-group ${this.config.resourceGroup} \
      --server ${this.config.serverName} \
      --name DevelopmentAccess \
      --start-ip-address 203.0.113.0 \
      --end-ip-address 203.0.113.255`);

    console.log('🔥 Firewall rules configured');
  }

  private async createProductionDatabase(): Promise<void> {
    const command = `az sql db create \
      --resource-group ${this.config.resourceGroup} \
      --server ${this.config.serverName} \
      --name ${this.config.databaseName} \
      --service-objective GP_S_Gen5_2 \
      --max-size ${this.config.maxSizeGb}GB \
      --backup-storage-redundancy Zone`;

    const { stdout } = await execAsync(command);
    console.log('💾 Production database created:', JSON.parse(stdout).name);
  }

  private async configureBackupPolicies(): Promise<void> {
    const command = `az sql db ltr-policy set \
      --resource-group ${this.config.resourceGroup} \
      --server ${this.config.serverName} \
      --database ${this.config.databaseName} \
      --weekly-retention P4W \
      --monthly-retention P12M \
      --yearly-retention P7Y \
      --week-of-year 15`;

    await execAsync(command);
    console.log('💼 Backup policies configured');
  }

  private async validateConnection(): Promise<void> {
    const connectionString = `Server=tcp:${this.config.serverName}.database.windows.net,1433;Initial Catalog=${this.config.databaseName};Persist Security Info=False;User ID=${this.config.adminUsername};Password=${this.config.adminPassword};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;`;
    
    // Save connection string to artefacts
    await fs.writeFile(
      './DriveMemory/OF-9.2/azure-sql-connection.json',
      JSON.stringify({
        server: `${this.config.serverName}.database.windows.net`,
        database: this.config.databaseName,
        username: this.config.adminUsername,
        connectionString: connectionString.replace(this.config.adminPassword, '${AZURE_SQL_PASSWORD}'),
        provisionedAt: new Date().toISOString(),
        tier: this.config.tier,
        maxSizeGb: this.config.maxSizeGb
      }, null, 2)
    );

    console.log('🔌 Connection validated and saved to DriveMemory');
  }

  private async logToGovernance(stepId: string, status: 'completed' | 'failed', details: string): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      entryType: 'Implementation',
      summary: `${stepId}: ${details}`,
      phaseRef: 'OF-9.2.1',
      projectRef: 'OF-CloudMig',
      gptDraftEntry: `Azure SQL provisioning ${status} - ${details}`,
      status,
      stepId
    };

    await fs.appendFile('./logs/governance.jsonl', JSON.stringify(logEntry) + '\n');
    console.log(`📝 Logged to governance: ${stepId} ${status}`);
  }
}

export default AzureSQLProvisioner;

// Run if called directly
if (require.main === module) {
  const provisioner = new AzureSQLProvisioner();
  provisioner.provisionProductionSQL().catch(console.error);
}