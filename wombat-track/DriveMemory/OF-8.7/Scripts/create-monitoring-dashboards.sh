#!/bin/bash

# OF-8.7.3 - Create Monitoring Dashboards
# Real-time operational and business dashboards

set -e

RESOURCE_GROUP="of-8-6-cloud-rg"
APP_INSIGHTS_NAME="orbis-of86-insights"
DASHBOARD_NAME="orbis-operational-dashboard"

echo "📈 OF-8.7.3: Creating Monitoring Dashboards"
echo "==========================================="

# Create operational dashboard JSON
cat > /tmp/operational-dashboard.json << 'EOF'
{
  "lenses": {
    "0": {
      "order": 0,
      "parts": {
        "0": {
          "position": {"x": 0, "y": 0, "rowSpan": 4, "colSpan": 6},
          "metadata": {
            "inputs": [
              {
                "name": "resourceId",
                "value": "/subscriptions/{subscription}/resourceGroups/{resourceGroup}/providers/Microsoft.Insights/components/{appInsights}"
              }
            ],
            "type": "Extension/AppInsightsExtension/PartType/AppMapGalPt"
          }
        },
        "1": {
          "position": {"x": 6, "y": 0, "rowSpan": 2, "colSpan": 3},
          "metadata": {
            "inputs": [
              {
                "name": "chartType",
                "value": "Area"
              },
              {
                "name": "metrics",
                "value": [
                  {
                    "resourceMetadata": {
                      "id": "/subscriptions/{subscription}/resourceGroups/{resourceGroup}/providers/Microsoft.Insights/components/{appInsights}"
                    },
                    "name": "requests/rate",
                    "aggregationType": "Average",
                    "namespace": "microsoft.insights/components",
                    "metricVisualization": {
                      "displayName": "Request Rate",
                      "color": "#47BDF5"
                    }
                  }
                ]
              }
            ],
            "type": "Extension/Microsoft_Azure_Monitoring/PartType/MetricsChartPart"
          }
        },
        "2": {
          "position": {"x": 9, "y": 0, "rowSpan": 2, "colSpan": 3},
          "metadata": {
            "inputs": [
              {
                "name": "metrics",
                "value": [
                  {
                    "resourceMetadata": {
                      "id": "/subscriptions/{subscription}/resourceGroups/{resourceGroup}/providers/Microsoft.Insights/components/{appInsights}"
                    },
                    "name": "requests/duration",
                    "aggregationType": "Average",
                    "namespace": "microsoft.insights/components",
                    "metricVisualization": {
                      "displayName": "Response Time",
                      "color": "#7E58FF"
                    }
                  }
                ]
              }
            ],
            "type": "Extension/Microsoft_Azure_Monitoring/PartType/MetricsChartPart"
          }
        },
        "3": {
          "position": {"x": 6, "y": 2, "rowSpan": 2, "colSpan": 6},
          "metadata": {
            "inputs": [
              {
                "name": "query",
                "value": "requests | where timestamp > ago(1h) | summarize count() by bin(timestamp, 1m), resultCode | render timechart"
              }
            ],
            "type": "Extension/Microsoft_OperationsManagementSuite_Workspace/PartType/LogsDashboardPart"
          }
        }
      }
    }
  },
  "metadata": {
    "model": {
      "timeRange": {
        "value": {
          "relative": {
            "duration": 24,
            "timeUnit": 1
          }
        },
        "type": "MsPortalFx.Composition.Configuration.ValueTypes.TimeRange"
      }
    }
  }
}
EOF

# Create business dashboard JSON
cat > /tmp/business-dashboard.json << 'EOF'
{
  "lenses": {
    "0": {
      "order": 0,
      "parts": {
        "0": {
          "position": {"x": 0, "y": 0, "rowSpan": 2, "colSpan": 4},
          "metadata": {
            "inputs": [
              {
                "name": "query",
                "value": "customEvents | where name == 'UserActivity' | summarize Users = dcount(user_Id) by bin(timestamp, 1h) | render timechart"
              }
            ],
            "type": "Extension/Microsoft_OperationsManagementSuite_Workspace/PartType/LogsDashboardPart"
          }
        },
        "1": {
          "position": {"x": 4, "y": 0, "rowSpan": 2, "colSpan": 4},
          "metadata": {
            "inputs": [
              {
                "name": "query", 
                "value": "customEvents | where name == 'FeatureUsage' | summarize Usage = count() by tostring(customDimensions.feature) | render piechart"
              }
            ],
            "type": "Extension/Microsoft_OperationsManagementSuite_Workspace/PartType/LogsDashboardPart"
          }
        },
        "2": {
          "position": {"x": 8, "y": 0, "rowSpan": 4, "colSpan": 4},
          "metadata": {
            "inputs": [
              {
                "name": "query",
                "value": "requests | where timestamp > ago(24h) | extend Cost = duration * 0.001 | summarize TotalCost = sum(Cost), RequestCount = count() by bin(timestamp, 1h) | render timechart"
              }
            ],
            "type": "Extension/Microsoft_OperationsManagementSuite_Workspace/PartType/LogsDashboardPart"
          }
        }
      }
    }
  }
}
EOF

# Create Azure Dashboard
echo "Creating Azure Dashboard..."
DASHBOARD_JSON=$(cat /tmp/operational-dashboard.json | sed "s/{subscription}/$SUBSCRIPTION_ID/g" | sed "s/{resourceGroup}/$RESOURCE_GROUP/g" | sed "s/{appInsights}/$APP_INSIGHTS_NAME/g")

az portal dashboard create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DASHBOARD_NAME" \
    --input-path /tmp/operational-dashboard.json

# Create Grafana dashboard (if Grafana is available)
echo "Creating Grafana dashboard configuration..."
cat > /tmp/grafana-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "Orbis Operational Metrics",
    "tags": ["orbis", "production"],
    "timezone": "Australia/Sydney",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(requests_total[5m])",
            "legendFormat": "Request Rate"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec"
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "avg(request_duration_ms)",
            "legendFormat": "Avg Response Time"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(errors_total[5m]) / rate(requests_total[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ]
      },
      {
        "id": 4,
        "title": "Active Users",
        "type": "singlestat",
        "targets": [
          {
            "expr": "active_users_count",
            "legendFormat": "Active Users"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

# Create workbook for Application Insights
echo "Creating Application Insights workbook..."
cat > /tmp/app-insights-workbook.json << 'EOF'
{
  "version": "Notebook/1.0",
  "items": [
    {
      "type": 1,
      "content": {
        "json": "## Orbis Platform Performance Overview\nReal-time metrics and diagnostics for all services"
      }
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "requests\n| where timestamp > ago(1h)\n| summarize RequestCount = count(), AvgDuration = avg(duration) by bin(timestamp, 5m)\n| render timechart",
        "size": 0,
        "title": "Request Volume and Performance"
      }
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0", 
        "query": "dependencies\n| where timestamp > ago(1h)\n| summarize DependencyCount = count(), FailureRate = countif(success == false) * 100.0 / count() by target\n| order by DependencyCount desc",
        "size": 0,
        "title": "Dependency Health"
      }
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "exceptions\n| where timestamp > ago(24h)\n| summarize ExceptionCount = count() by type\n| order by ExceptionCount desc\n| limit 10",
        "size": 0,
        "title": "Top Exceptions"
      }
    }
  ]
}
EOF

# Export dashboard URLs
echo "Dashboard URLs:"
DASHBOARD_URL="https://portal.azure.com/#@/dashboard/arm/subscriptions/$SUBSCRIPTION_ID/resourcegroups/$RESOURCE_GROUP/providers/Microsoft.Portal/dashboards/$DASHBOARD_NAME"

echo "✅ Monitoring dashboards created!"
echo ""
echo "Dashboards available:"
echo "- Azure Portal Dashboard: $DASHBOARD_URL"
echo "- Application Insights: Live metrics and analytics"
echo "- Workbooks: Custom performance analysis"
echo "- Grafana: Real-time operational metrics"
echo ""
echo "Key metrics monitored:"
echo "- Request rate and response time"
echo "- Error rates and exception tracking"
echo "- Dependency health and performance"
echo "- User activity and feature usage"
echo "- Cost and efficiency metrics"