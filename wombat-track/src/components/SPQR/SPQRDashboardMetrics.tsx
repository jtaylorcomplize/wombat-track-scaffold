import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GovernanceLogger } from '../../services/governance-logger';
import type { RAGStatus } from '../../types/feature';

interface MetricsData {
  loadTimeMs: number;
  interactionCount: number;
  errorCount: number;
  lastInteraction: string;
  sessionDuration: number;
  dataFreshness: 'realtime' | 'cached' | 'stale';
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  ragScore: RAGStatus;
}

interface PerformanceMetric {
  timestamp: string;
  metric: string;
  value: number;
  context?: Record<string, unknown>;
}

interface SPQRDashboardMetricsProps {
  dashboardId: string;
  cardId: string;
  userId: string;
  userRole: string;
  onMetricsUpdate?: (metrics: MetricsData) => void;
  captureInterval?: number;
}

export const SPQRDashboardMetrics: React.FC<SPQRDashboardMetricsProps> = ({
  dashboardId,
  cardId,
  userId,
  userRole,
  onMetricsUpdate,
  captureInterval = 30000
}) => {
  const governanceLogger = GovernanceLogger.getInstance();
  const sessionStartRef = useRef(Date.now());
  const metricsBufferRef = useRef<PerformanceMetric[]>([]);
  
  const [metrics, setMetrics] = useState<MetricsData>({
    loadTimeMs: 0,
    interactionCount: 0,
    errorCount: 0,
    lastInteraction: new Date().toISOString(),
    sessionDuration: 0,
    dataFreshness: 'realtime',
    performanceGrade: 'A',
    ragScore: 'green'
  });

  const [isCapturing, setIsCapturing] = useState(true);
  const [showMetrics, setShowMetrics] = useState(false);

  const calculatePerformanceGrade = useCallback((loadTime: number, errorRate: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
    const score = (loadTime / 10000) * 0.7 + errorRate * 0.3;
    if (score < 0.2) return 'A';
    if (score < 0.4) return 'B';
    if (score < 0.6) return 'C';
    if (score < 0.8) return 'D';
    return 'F';
  }, []);

  const calculateRAGScore = useCallback((metrics: MetricsData): RAGStatus => {
    const { loadTimeMs, errorCount, interactionCount, performanceGrade } = metrics;
    const errorRate = interactionCount > 0 ? errorCount / interactionCount : 0;

    if (performanceGrade === 'F' || errorRate > 0.2 || loadTimeMs > 10000) {
      return 'red';
    }
    if (performanceGrade === 'D' || errorRate > 0.1 || loadTimeMs > 7000) {
      return 'amber';
    }
    if (performanceGrade <= 'B' && errorRate < 0.05 && loadTimeMs < 3000) {
      return 'green';
    }
    return 'green';
  }, []);

  const captureLoadMetrics = useCallback((loadStartTime: number) => {
    const loadEndTime = Date.now();
    const loadTimeMs = loadEndTime - loadStartTime;

    const performanceMetric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      metric: 'dashboard_load_time',
      value: loadTimeMs,
      context: {
        dashboard_id: dashboardId,
        card_id: cardId,
        user_role: userRole
      }
    };

    metricsBufferRef.current.push(performanceMetric);

    setMetrics(prev => {
      const errorRate = prev.interactionCount > 0 ? prev.errorCount / prev.interactionCount : 0;
      const grade = calculatePerformanceGrade(loadTimeMs, errorRate);
      
      const updated = {
        ...prev,
        loadTimeMs,
        performanceGrade: grade,
        dataFreshness: loadTimeMs < 1000 ? 'realtime' : loadTimeMs < 5000 ? 'cached' : 'stale'
      };
      
      updated.ragScore = calculateRAGScore(updated);
      return updated;
    });

    governanceLogger.logDashboardAccess(
      userId,
      userRole,
      cardId,
      dashboardId,
      true,
      loadTimeMs
    );
  }, [dashboardId, cardId, userId, userRole, calculatePerformanceGrade, calculateRAGScore, governanceLogger]);

  const captureInteraction = useCallback((interactionType: string, details?: Record<string, unknown>) => {
    const interactionMetric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      metric: 'user_interaction',
      value: 1,
      context: {
        interaction_type: interactionType,
        dashboard_id: dashboardId,
        card_id: cardId,
        ...details
      }
    };

    metricsBufferRef.current.push(interactionMetric);

    setMetrics(prev => {
      const updated = {
        ...prev,
        interactionCount: prev.interactionCount + 1,
        lastInteraction: new Date().toISOString()
      };
      updated.ragScore = calculateRAGScore(updated);
      return updated;
    });

    governanceLogger.logUserAction(
      userId,
      userRole,
      cardId,
      interactionType,
      { dashboard_id: dashboardId, ...details }
    );
  }, [dashboardId, cardId, userId, userRole, calculateRAGScore, governanceLogger]);

  const captureError = useCallback((error: Error, context?: Record<string, unknown>) => {
    const errorMetric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      metric: 'dashboard_error',
      value: 1,
      context: {
        error_message: error.message,
        error_stack: error.stack,
        dashboard_id: dashboardId,
        card_id: cardId,
        ...context
      }
    };

    metricsBufferRef.current.push(errorMetric);

    setMetrics(prev => {
      const updated = {
        ...prev,
        errorCount: prev.errorCount + 1
      };
      const errorRate = updated.interactionCount > 0 ? updated.errorCount / updated.interactionCount : 0;
      updated.performanceGrade = calculatePerformanceGrade(updated.loadTimeMs, errorRate);
      updated.ragScore = calculateRAGScore(updated);
      return updated;
    });

    governanceLogger.logError(
      userId,
      userRole,
      cardId,
      error,
      { dashboard_id: dashboardId, ...context }
    );
  }, [dashboardId, cardId, userId, userRole, calculatePerformanceGrade, calculateRAGScore, governanceLogger]);

  const flushMetricsBuffer = useCallback(async () => {
    if (metricsBufferRef.current.length === 0) return;

    const metricsToFlush = [...metricsBufferRef.current];
    metricsBufferRef.current = [];

    const sessionDuration = Date.now() - sessionStartRef.current;
    
    const aggregatedMetrics = {
      timestamp: new Date().toISOString(),
      event_type: 'metrics_flush',
      user_id: userId,
      user_role: userRole,
      resource_type: 'dashboard' as const,
      resource_id: dashboardId,
      action: 'metrics_capture',
      success: true,
      details: {
        card_id: cardId,
        metrics_count: metricsToFlush.length,
        session_duration_ms: sessionDuration,
        performance_summary: {
          load_time_ms: metrics.loadTimeMs,
          interaction_count: metrics.interactionCount,
          error_count: metrics.errorCount,
          performance_grade: metrics.performanceGrade,
          rag_score: metrics.ragScore,
          data_freshness: metrics.dataFreshness
        },
        detailed_metrics: metricsToFlush
      },
      performance_metrics: {
        load_time_ms: metrics.loadTimeMs,
        error_count: metrics.errorCount
      }
    };

    governanceLogger.log(aggregatedMetrics);

    setMetrics(prev => ({
      ...prev,
      sessionDuration: Math.floor(sessionDuration / 1000)
    }));

    if (onMetricsUpdate) {
      onMetricsUpdate({
        ...metrics,
        sessionDuration: Math.floor(sessionDuration / 1000)
      });
    }
  }, [dashboardId, cardId, userId, userRole, metrics, onMetricsUpdate, governanceLogger]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isCapturing) {
        flushMetricsBuffer();
      }
    }, captureInterval);

    return () => {
      clearInterval(interval);
      flushMetricsBuffer();
    };
  }, [captureInterval, isCapturing, flushMetricsBuffer]);

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      captureError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      captureError(new Error('Unhandled promise rejection'), {
        reason: event.reason
      });
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [captureError]);

  const getRAGStatusColor = (status: RAGStatus) => {
    switch (status) {
      case 'red': return 'text-red-600 bg-red-100';
      case 'amber': return 'text-amber-600 bg-amber-100';
      case 'green': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPerformanceGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600';
      case 'B': return 'text-blue-600';
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      case 'F': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowMetrics(!showMetrics)}
          className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Toggle metrics display"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>

      {showMetrics && (
        <div className="fixed bottom-20 right-4 z-50 bg-white rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Dashboard Metrics</h3>
            <button
              onClick={() => setIsCapturing(!isCapturing)}
              className={`px-3 py-1 rounded text-sm ${
                isCapturing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {isCapturing ? 'Capturing' : 'Paused'}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">RAG Status</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${getRAGStatusColor(metrics.ragScore)}`}>
                {metrics.ragScore.toUpperCase()}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Performance Grade</span>
              <span className={`text-2xl font-bold ${getPerformanceGradeColor(metrics.performanceGrade)}`}>
                {metrics.performanceGrade}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Load Time</span>
                <div className="font-medium">{metrics.loadTimeMs}ms</div>
              </div>
              <div>
                <span className="text-gray-600">Interactions</span>
                <div className="font-medium">{metrics.interactionCount}</div>
              </div>
              <div>
                <span className="text-gray-600">Errors</span>
                <div className="font-medium text-red-600">{metrics.errorCount}</div>
              </div>
              <div>
                <span className="text-gray-600">Session</span>
                <div className="font-medium">{metrics.sessionDuration}s</div>
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Data Freshness</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  metrics.dataFreshness === 'realtime' ? 'bg-green-100 text-green-700' :
                  metrics.dataFreshness === 'cached' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {metrics.dataFreshness}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t text-xs text-gray-500">
              <div>Dashboard: {dashboardId.substring(0, 8)}...</div>
              <div>Card: {cardId}</div>
              <div>Last update: {new Date(metrics.lastInteraction).toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      )}

      <SPQRMetricsCapture
        onLoadCapture={captureLoadMetrics}
        onInteractionCapture={captureInteraction}
      />
    </>
  );
};

interface SPQRMetricsCaptureProps {
  onLoadCapture: (loadStartTime: number) => void;
  onInteractionCapture: (type: string, details?: Record<string, unknown>) => void;
}

const SPQRMetricsCapture: React.FC<SPQRMetricsCaptureProps> = ({
  onLoadCapture,
  onInteractionCapture
}) => {
  const loadStartTimeRef = useRef(Date.now());

  useEffect(() => {
    const handleDOMContentLoaded = () => {
      onLoadCapture(loadStartTimeRef.current);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const details = {
        element_type: target.tagName,
        element_text: target.innerText?.substring(0, 50),
        element_id: target.id,
        element_class: target.className
      };
      onInteractionCapture('click', details);
    };

    const handleScroll = () => {
      onInteractionCapture('scroll', {
        scroll_position: window.scrollY,
        viewport_height: window.innerHeight,
        document_height: document.documentElement.scrollHeight
      });
    };

    const handleResize = () => {
      onInteractionCapture('resize', {
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
    } else {
      handleDOMContentLoaded();
    }

    document.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [onLoadCapture, onInteractionCapture]);

  return null;
};

export default SPQRDashboardMetrics;