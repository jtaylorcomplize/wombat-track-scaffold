import { createNotionClient } from './notionClient';

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  userInfo?: Record<string, unknown>; // no-explicit-any fix
  accessibleDatabases?: Array<{
    id: string;
    title: string;
    url: string;
  }>;
}

export interface ExpectedDatabase {
  name: string;
  id?: string;
}

const EXPECTED_DATABASES: ExpectedDatabase[] = [
  { name: 'Complize Home' },
  { name: 'DMS' },
  { name: 'Project Management System' },
  { name: 'RML Projects' },
];

export async function testNotionConnection(token?: string): Promise<ConnectionTestResult> {
  try {
    const client = createNotionClient(token);
    
    // Test 1: Verify token is valid and get user info
    console.log('🔐 Testing token validity...');
    const userInfo = await client.getUser();
    console.log('✅ Token is valid');
    console.log(`👤 User: ${userInfo.name || 'Unknown'} (${userInfo.type})`);
    
    // Test 2: List accessible databases
    console.log('\n📊 Fetching accessible databases...');
    const databasesResponse = await client.listDatabases();
    const databases = databasesResponse.results
      .filter((item: Record<string, unknown>) => item.object === 'database') // no-explicit-any fix
      .map((db: Record<string, unknown>) => ({ // no-explicit-any fix
        id: db.id,
        title: db.title?.[0]?.plain_text || 'Untitled',
        url: db.url,
      }));
    
    console.log(`✅ Found ${databases.length} accessible databases:`);
    databases.forEach((db, index) => {
      console.log(`  ${index + 1}. ${db.title} (${db.id})`);
    });
    
    // Test 3: Check for expected databases
    console.log('\n🔍 Checking for expected databases...');
    const foundDatabases: string[] = [];
    const missingDatabases: string[] = [];
    
    EXPECTED_DATABASES.forEach(expectedDb => {
      const found = databases.some(db => 
        db.title.toLowerCase().includes(expectedDb.name.toLowerCase())
      );
      if (found) {
        foundDatabases.push(expectedDb.name);
        console.log(`  ✅ ${expectedDb.name} - Found`);
      } else {
        missingDatabases.push(expectedDb.name);
        console.log(`  ❌ ${expectedDb.name} - Not found`);
      }
    });
    
    console.log('\n📋 Summary:');
    console.log(`  • Found databases: ${foundDatabases.length}/${EXPECTED_DATABASES.length}`);
    console.log(`  • Missing databases: ${missingDatabases.length}`);
    
    if (missingDatabases.length > 0) {
      console.log('\n⚠️  Missing databases may indicate:');
      console.log('  • Databases not shared with the integration');
      console.log('  • Different database names than expected');
      console.log('  • Insufficient permissions');
    }
    
    return {
      success: true,
      userInfo,
      accessibleDatabases: databases,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Connection test failed:', errorMessage);
    
    if (errorMessage.includes('Unauthorized')) {
      console.error('🔑 Token appears to be invalid or expired');
    } else if (errorMessage.includes('NOTION_TOKEN')) {
      console.error('🔑 NOTION_TOKEN environment variable not set');
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function validateDatabaseAccess(
  databaseId: string,
  token?: string
): Promise<{ canAccess: boolean; error?: string }> {
  try {
    const client = createNotionClient(token);
    
    // Try to query the database with minimal parameters
    await client.queryDatabase({
      database_id: databaseId,
      page_size: 1,
    });
    
    return { canAccess: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      canAccess: false,
      error: errorMessage,
    };
  }
}

// CLI script for manual testing
if (import.meta.main) {
  console.log('🧪 Notion Connection Test');
  console.log('========================\n');
  
  testNotionConnection()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Connection test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Connection test failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}