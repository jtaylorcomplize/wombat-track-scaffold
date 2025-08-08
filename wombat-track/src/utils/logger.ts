/**
 * Structured logging utility for Wombat Track
 * Replaces console.log with structured, environment-aware logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component?: string;
  message: string;
  data?: any;
  error?: Error;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatLogEntry(entry: LogEntry): string {
    const levelLabel = LogLevel[entry.level];
    const timestamp = entry.timestamp;
    const component = entry.component ? `[${entry.component}]` : '';
    
    return `${timestamp} ${levelLabel} ${component} ${entry.message}`;
  }

  private sendToServer(entry: LogEntry): void {
    // In production, send logs to server
    if (!this.isDevelopment && entry.level >= LogLevel.WARN) {
      const apiUrl = process.env.REACT_APP_API_BASE_URL || '';
      
      fetch(`${apiUrl}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      }).catch(() => {
        // Silently fail to avoid infinite loops
      });
    }
  }

  private log(level: LogLevel, component: string | undefined, message: string, data?: any, error?: Error): void {
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data,
      error,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      correlationId: this.getCorrelationId()
    };

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Output to console in development
    if (this.isDevelopment) {
      const formattedMessage = this.formatLogEntry(entry);
      
      switch (level) {
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          console.log(formattedMessage, data || '');
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, data || '');
          break;
        case LogLevel.ERROR:
        case LogLevel.CRITICAL:
          console.error(formattedMessage, error || data || '');
          break;
      }
    }

    // Send to server
    this.sendToServer(entry);
  }

  debug(component: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, component, message, data);
  }

  info(component: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, component, message, data);
  }

  warn(component: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, component, message, data);
  }

  error(component: string, message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, component, message, data, error);
  }

  critical(component: string, message: string, error?: Error, data?: any): void {
    this.log(LogLevel.CRITICAL, component, message, data, error);
  }

  // Helper methods for context
  private getCurrentUserId(): string | undefined {
    // Get from auth context or localStorage
    return localStorage.getItem('userId') || undefined;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  private getCorrelationId(): string {
    // Generate a correlation ID for request tracking
    return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get buffered logs for debugging
  getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  // Clear log buffer
  clearBuffer(): void {
    this.logBuffer = [];
  }

  // Set log level dynamically
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logDebug = (component: string, message: string, data?: any) => 
  logger.debug(component, message, data);

export const logInfo = (component: string, message: string, data?: any) => 
  logger.info(component, message, data);

export const logWarn = (component: string, message: string, data?: any) => 
  logger.warn(component, message, data);

export const logError = (component: string, message: string, error?: Error, data?: any) => 
  logger.error(component, message, error, data);

export const logCritical = (component: string, message: string, error?: Error, data?: any) => 
  logger.critical(component, message, error, data);

// React hook for component logging
export const useLogger = (componentName: string) => {
  return {
    debug: (message: string, data?: any) => logDebug(componentName, message, data),
    info: (message: string, data?: any) => logInfo(componentName, message, data),
    warn: (message: string, data?: any) => logWarn(componentName, message, data),
    error: (message: string, error?: Error, data?: any) => logError(componentName, message, error, data),
    critical: (message: string, error?: Error, data?: any) => logCritical(componentName, message, error, data)
  };
};