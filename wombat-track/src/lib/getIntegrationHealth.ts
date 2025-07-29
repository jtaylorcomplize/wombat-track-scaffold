export interface IntegrationHealth {
  id: string;
  label: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  type: 'AI' | 'CI/CD' | 'Test' | 'Data';
  category: 'AI' | 'CI/CD' | 'Test' | 'Data' | 'API' | 'Database' | 'Service' | 'Monitoring';
  lastChecked: string; // ISO string
  logUrl?: string;
  responseTime?: number; // in milliseconds
  uptime?: number; // percentage
  metadata?: Record<string, unknown>;
}

// In-memory store for health data (in production, this would be a database)
let healthStore: IntegrationHealth[] = [
  {
    id: 'claude-api',
    label: 'Claude API',
    status: 'healthy',
    type: 'AI',
    category: 'AI',
    lastChecked: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    logUrl: 'https://logs.example.com/claude-api',
    responseTime: 150,
    uptime: 99.9,
    metadata: {
      version: 'v1.0',
      region: 'us-west-2',
      requestsPerMinute: 42
    }
  },
  {
    id: 'chatgpt-api',
    label: 'ChatGPT API',
    status: 'healthy',
    type: 'AI',
    category: 'AI',
    lastChecked: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    logUrl: 'https://logs.example.com/chatgpt-api',
    responseTime: 180,
    uptime: 99.5,
    metadata: {
      version: 'gpt-4',
      tokensPerMinute: 1500
    }
  },
  {
    id: 'github-actions',
    label: 'GitHub Actions',
    status: 'healthy',
    type: 'CI/CD',
    category: 'CI/CD',
    lastChecked: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    logUrl: 'https://logs.example.com/github-actions',
    responseTime: 300,
    uptime: 99.8,
    metadata: {
      activeWorkflows: 3,
      lastDeployment: '2025-01-25T10:30:00Z'
    }
  },
  {
    id: 'claude-dispatcher',
    label: 'Claude Dispatcher',
    status: 'warning',
    type: 'CI/CD',
    category: 'CI/CD',
    lastChecked: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    logUrl: 'https://logs.example.com/claude-dispatcher',
    responseTime: 800,
    uptime: 95.2,
    metadata: {
      queueSize: 15,
      processingRate: 'slow',
      lastError: 'Rate limit exceeded'
    }
  },
  {
    id: 'puppeteer-tests',
    label: 'Puppeteer Tests',
    status: 'healthy',
    type: 'Test',
    category: 'Test',
    lastChecked: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    logUrl: 'https://logs.example.com/puppeteer-tests',
    responseTime: 2500,
    uptime: 98.7,
    metadata: {
      testsRun: 127,
      passRate: 94.5,
      lastRun: '2025-01-25T11:45:00Z'
    }
  },
  {
    id: 'drive-memory',
    label: 'Drive Memory',
    status: 'error',
    type: 'Data',
    category: 'Data',
    lastChecked: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    logUrl: 'https://logs.example.com/drive-memory',
    responseTime: 5000,
    uptime: 85.3,
    metadata: {
      storageUsed: '45GB',
      syncStatus: 'failed',
      lastSync: '2025-01-25T09:15:00Z',
      error: 'Authentication expired'
    }
  },
  {
    id: 'memory-plugin',
    label: 'Memory Plugin',
    status: 'healthy',
    type: 'Data',
    category: 'Data',
    lastChecked: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    logUrl: 'https://logs.example.com/memory-plugin',
    responseTime: 120,
    uptime: 99.1,
    metadata: {
      documentsIndexed: 1423,
      searchLatency: 45,
      lastUpdate: '2025-01-25T11:52:00Z'
    }
  }
];

// Simulate real health checks (in production, these would be actual API calls)
const performHealthCheck = async (integration: IntegrationHealth): Promise<IntegrationHealth> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

  // Simulate health check logic based on integration type
  let newStatus: IntegrationHealth['status'] = 'healthy';
  let responseTime = Math.random() * 300 + 100;

  switch (integration.type) {
    case 'AI':
      // AI services might have rate limits or API issues
      if (Math.random() < 0.1) newStatus = 'warning';
      if (Math.random() < 0.05) newStatus = 'error';
      responseTime = Math.random() * 500 + 100;
      break;
    
    case 'CI/CD':
      // CI/CD might have build failures or deployment issues
      if (Math.random() < 0.15) newStatus = 'warning';
      if (Math.random() < 0.08) newStatus = 'error';
      responseTime = Math.random() * 1000 + 200;
      break;
    
    case 'Test':
      // Testing services might have infrastructure issues
      if (Math.random() < 0.12) newStatus = 'warning';
      if (Math.random() < 0.06) newStatus = 'error';
      responseTime = Math.random() * 3000 + 1000;
      break;
    
    case 'Data':
      // Data services might have storage or sync issues
      if (Math.random() < 0.2) newStatus = 'warning';
      if (Math.random() < 0.1) newStatus = 'error';
      responseTime = Math.random() * 2000 + 100;
      break;
  }

  return {
    ...integration,
    status: newStatus,
    lastChecked: new Date().toISOString(),
    responseTime: Math.round(responseTime),
    uptime: Math.max(85, Math.min(99.9, integration.uptime! + (Math.random() - 0.5) * 2))
  };
};

export const fetchIntegrationHealth = async (): Promise<IntegrationHealth[]> => {
  // Return current health store data
  return [...healthStore];
};

export const refreshIntegrationHealth = async (integrationId?: string): Promise<IntegrationHealth[]> => {
  if (integrationId) {
    // Refresh specific integration
    const integration = healthStore.find(item => item.id === integrationId);
    if (integration) {
      const updatedIntegration = await performHealthCheck(integration);
      healthStore = healthStore.map(item => 
        item.id === integrationId ? updatedIntegration : item
      );
    }
  } else {
    // Refresh all integrations
    const healthCheckPromises = healthStore.map(integration => performHealthCheck(integration));
    const updatedIntegrations = await Promise.all(healthCheckPromises);
    healthStore = updatedIntegrations;
  }
  
  return [...healthStore];
};

export const getIntegrationById = async (id: string): Promise<IntegrationHealth | null> => {
  return healthStore.find(integration => integration.id === id) || null;
};

export const updateIntegrationHealth = (id: string, updates: Partial<IntegrationHealth>): IntegrationHealth | null => {
  const index = healthStore.findIndex(integration => integration.id === id);
  if (index !== -1) {
    healthStore[index] = { ...healthStore[index], ...updates };
    return healthStore[index];
  }
  return null;
};

// Initialize with some random variation in timestamps and status
const initializeHealthStore = () => {
  healthStore = healthStore.map(integration => ({
    ...integration,
    lastChecked: new Date(Date.now() - Math.random() * 30 * 60 * 1000).toISOString(), // Random within last 30 minutes
    responseTime: Math.round(integration.responseTime! * (0.8 + Math.random() * 0.4)) // ±20% variation
  }));
};

// Initialize on module load
initializeHealthStore();