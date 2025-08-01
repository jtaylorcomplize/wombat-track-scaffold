/**
 * MCP GSuite Type Definitions - WT-MCPGS-1.0
 * Phase 2: Structured JSON in/out for Claude & Gizmo
 */

// Base interfaces
export interface MCPGsuiteRequest {
  action: string;
  service: 'gmail' | 'drive' | 'sheets' | 'calendar';
  parameters: Record<string, any>;
  userId?: string;
  metadata?: {
    timestamp: string;
    requestId: string;
    source: 'claude' | 'gizmo' | 'user' | 'system';
    priority?: 'high' | 'medium' | 'low';
  };
}

export interface MCPGsuiteResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    timestamp: string;
    requestId: string;
    processingTime: number;
    service: string;
    action: string;
  };
  governance?: {
    logged: boolean;
    auditId: string;
    sensitiveDataDetected?: boolean;
  };
}

// Gmail specific interfaces
export interface GmailSendRequest {
  to: string | string[];
  subject: string;
  body: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: {
    name: string;
    content: string;
    mimeType: string;
  }[];
}

export interface GmailSearchRequest {
  query: string;
  maxResults?: number;
  pageToken?: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      data: string;
      size: number;
    };
  };
  internalDate: string;
  labelIds: string[];
}

// Google Drive interfaces
export interface DriveListRequest {
  maxResults?: number;
  folderId?: string;
  query?: string;
  orderBy?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  createdTime: string;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
}

export interface DriveCreateRequest {
  name: string;
  content: string;
  mimeType?: string;
  parentFolderId?: string;
  description?: string;
}

export interface DriveReadRequest {
  fileId: string;
  format?: 'text' | 'json' | 'binary';
}

// Google Sheets interfaces
export interface SheetsReadRequest {
  spreadsheetId: string;
  range: string;
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
}

export interface SheetsUpdateRequest {
  spreadsheetId: string;
  range: string;
  values: any[][];
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}

export interface SheetsData {
  spreadsheetId: string;
  range: string;
  majorDimension: 'ROWS' | 'COLUMNS';
  values: any[][];
}

// Google Calendar interfaces
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

export interface CalendarEventRequest {
  calendarId?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: string[];
  location?: string;
}

export interface CalendarListRequest {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  singleEvents?: boolean;
  orderBy?: 'startTime' | 'updated';
}

// Claude/Gizmo specific action schemas
export interface ClaudeGizmoAction {
  type: 'mcp-gsuite-action';
  id: string;
  timestamp: string;
  agent: 'claude' | 'gizmo';
  prompt: string;
  action: MCPGsuiteRequest;
  rationale?: string;
  confidenceLevel: number;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
}

export interface ClaudeGizmoResponse {
  type: 'mcp-gsuite-response';
  id: string;
  timestamp: string;
  agent: 'claude' | 'gizmo';
  originalActionId: string;
  result: MCPGsuiteResponse;
  followUpActions?: ClaudeGizmoAction[];
  memoryUpdate?: {
    key: string;
    value: any;
    context: string;
  };
}

// Governance and audit interfaces
export interface GovernanceLogEntry {
  timestamp: string;
  event: string;
  phase: string;
  userId?: string;
  agent?: 'claude' | 'gizmo' | 'user';
  action?: string;
  service?: string;
  parameters?: any;
  result?: 'success' | 'failure' | 'pending';
  riskLevel?: 'low' | 'medium' | 'high';
  sensitiveData?: boolean;
  auditId: string;
  metadata?: Record<string, any>;
}

export interface MemoryPluginEntry {
  timestamp: string;
  type: 'mcp-gsuite-action' | 'mcp-gsuite-response' | 'governance-event';
  agent?: 'claude' | 'gizmo';
  content: any;
  context: {
    service: string;
    action: string;
    userId?: string;
    riskLevel: string;
  };
  embeddings?: number[];
  tags?: string[];
}

// RAG trigger interfaces
export interface RAGTrigger {
  type: 'sensitive-action' | 'high-risk-operation' | 'bulk-operation' | 'external-share';
  service: string;
  action: string;
  threshold: {
    riskLevel: 'medium' | 'high';
    dataVolume?: number;
    externalRecipients?: boolean;
  };
  governanceAction: 'log' | 'approve' | 'block';
  memoryUpdate: boolean;
}

// Agent orchestration interfaces
export interface AgentExecutionPlan {
  id: string;
  agent: 'claude' | 'gizmo';
  actions: ClaudeGizmoAction[];
  dependencies: string[];
  executionOrder: number[];
  rollbackPlan?: string[];
  approvalRequired: boolean;
  estimatedDuration: number;
}

export interface MultiAgentExecution {
  id: string;
  timestamp: string;
  agents: ('claude' | 'gizmo')[];
  coordinatedActions: {
    [agentName: string]: AgentExecutionPlan;
  };
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  results?: {
    [agentName: string]: ClaudeGizmoResponse[];
  };
  governanceLogs: GovernanceLogEntry[];
}

// Configuration interfaces
export interface MCPGsuiteConfig {
  services: {
    gmail: boolean;
    drive: boolean;
    sheets: boolean;
    calendar: boolean;
  };
  governance: {
    enabled: boolean;
    logPath: string;
    auditLevel: 'basic' | 'detailed' | 'full';
    requireApproval: {
      highRisk: boolean;
      externalSharing: boolean;
      bulkOperations: boolean;
    };
  };
  memoryPlugin: {
    enabled: boolean;
    syncInterval: number;
    ragTriggers: RAGTrigger[];
  };
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit: number;
  };
}