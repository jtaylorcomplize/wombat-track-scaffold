# AI-Assisted QA Framework for Wombat Track

## Overview

The AI-Assisted QA Framework is a comprehensive testing solution designed to automate quality assurance for Admin UI routes and future Work Surfaces. It combines multi-route Puppeteer testing with AI-powered screenshot and console log analysis to provide governance-compliant QA automation.

## Features

### ✅ Core Capabilities
- **Multi-Route Testing**: Automatically tests all Admin UI routes (`/admin`, `/admin/data`, `/admin/runtime`)
- **AI-Assisted Verification**: Analyzes screenshots and console logs for common issues
- **Artifact Capture**: Saves screenshots and console logs for each tested route
- **Governance Integration**: Logs results to GovernanceLog with memory anchors
- **Configurable Architecture**: Easily extensible for future Work Surfaces and Sub-Apps

### 🤖 AI Verification Features
- **Console Error Analysis**: Detects critical JavaScript errors (TypeError, ReferenceError, etc.)
- **Visual Issue Detection**: Identifies blank dashboards, error banners, and layout issues
- **Performance Monitoring**: Tracks page load times and identifies slow routes
- **Confidence Scoring**: Provides confidence ratings for QA pass/fail decisions

### 📦 Artifact Management
- **QA Bundle Generation**: Creates comprehensive qa-report.json with all test data
- **Memory Plugin Integration**: Stores artifacts with semantic anchors for future reference
- **Governance Compliance**: Maintains audit trail with required compliance fields

## Architecture

```
scripts/qa-framework/
├── run-qa-framework.js           # Main orchestrator
├── configurable-qa-framework.js  # Core testing engine  
├── enhanced-admin-qa.js          # Admin UI specific tests
├── ai-verification-utils.js      # AI analysis utilities
├── memory-plugin-integration.js  # Memory storage & anchors
├── qa-config.json               # Configuration file
└── README.md                    # Documentation
```

## Quick Start

### 1. Run Default QA Framework
```bash
npm run qa:framework
```

### 2. Run in Specific Environment
```bash
npm run qa:framework:dev        # Development
npm run qa:framework:staging    # Staging
```

### 3. Run Individual Components
```bash
npm run qa:admin-ui            # Enhanced Admin UI tests only
npm run qa:configurable        # Configurable framework only
```

## Configuration

The framework uses `qa-config.json` for configuration:

### Test Suites
```json
{
  "testSuites": {
    "admin-ui": {
      "name": "Admin UI Core Routes",
      "routes": ["/admin", "/admin/data", "/admin/runtime"],
      "enabled": true
    },
    "work-surfaces": {
      "name": "Work Surfaces Testing", 
      "routes": ["/surfaces/plan", "/surfaces/execute"],
      "enabled": false
    }
  }
}
```

### AI Verification Settings
```json
{
  "verification": {
    "ai": {
      "confidence_threshold": 75,
      "console_analysis": {
        "critical_error_patterns": ["TypeError", "ReferenceError"]
      },
      "screenshot_analysis": {
        "min_sidebar_width": 60,
        "max_load_time": 10000
      }
    }
  }
}
```

## Usage Examples

### Basic QA Run
```javascript
import { QAFrameworkRunner } from './scripts/qa-framework/run-qa-framework.js';

const runner = new QAFrameworkRunner({
  environment: 'development',
  enableMemoryPlugin: true,
  enableGovernance: true
});

const success = await runner.run();
```

### Custom Configuration
```bash
node scripts/qa-framework/run-qa-framework.js \
  --environment staging \
  --config custom-qa-config.json \
  --no-memory
```

### Programmatic Usage
```javascript
import { ConfigurableQAFramework } from './scripts/qa-framework/configurable-qa-framework.js';

const qa = new ConfigurableQAFramework('./custom-config.json', 'production');
const results = await qa.run();
```

## Outputs & Artifacts

### 1. QA Report (`QAArtifacts/qa-report.json`)
```json
{
  "timestamp": "2025-08-01T08:06:00Z",
  "branch": "feature/qa-framework-upgrade", 
  "testedRoutes": ["/admin", "/admin/data", "/admin/runtime"],
  "screenshots": ["screenshots/admin-ui-admin.png"],
  "consoleLogs": ["logs/admin-ui-admin.log"],
  "aiVerification": "passed",
  "result": "QA passed with visual and console verification"
}
```

### 2. Screenshots
- `QAArtifacts/screenshots/admin-ui-admin.png`
- `QAArtifacts/screenshots/admin-ui-admin-data.png`
- `QAArtifacts/screenshots/admin-ui-admin-runtime.png`

### 3. Console Logs
- `QAArtifacts/logs/admin-ui-admin.log`
- `QAArtifacts/logs/admin-ui-admin-data.log`
- `QAArtifacts/logs/admin-ui-admin-runtime.log`

### 4. Governance Entry
```json
{
  "phase": "WT-Admin-UI",
  "changeType": "QA",
  "summary": "AI-assisted QA executed with screenshot and console log verification",
  "branch": "feature/qa-framework-upgrade",
  "artifact": "QAArtifacts/qa-report.json", 
  "memoryAnchor": "WT-ADMIN-UI-QA-FRAMEWORK-1.0"
}
```

## AI Verification Details

### Console Error Analysis
The framework analyzes console logs for:
- **Critical Errors**: TypeError, ReferenceError, null/undefined access
- **Performance Issues**: Network failures, slow requests
- **React Issues**: Maximum update depth, render warnings

### Screenshot Analysis  
Visual verification checks for:
- **Blank Dashboards**: Missing content elements
- **Error Banners**: "Admin UI Error" or similar messages
- **Layout Issues**: Sidebar width < 60px
- **Loading States**: Extended loading without content

### Confidence Scoring
- Starts at 100% confidence
- Deducts points for each issue found
- Critical errors: -20 points each
- Visual issues: -10 to -25 points each
- Warnings: -5 points each

## Future Extensibility

### Adding New Test Suites
1. Update `qa-config.json`:
```json
{
  "testSuites": {
    "my-new-suite": {
      "name": "My New Test Suite",
      "routes": ["/my/route1", "/my/route2"],
      "enabled": true
    }
  }
}
```

2. Run with new configuration:
```bash
npm run qa:framework
```

### Custom Verification Rules
Add patterns to `qa-config.json`:
```json
{
  "verification": {
    "ai": {
      "console_analysis": {
        "critical_error_patterns": ["MyCustomError", "CustomException"]
      },
      "screenshot_analysis": {
        "error_indicators": ["My Error Message", "Custom Error"]
      }
    }
  }
}
```

## Integration with CI/CD

### GitHub Actions
```yaml
- name: Run QA Framework
  run: npm run qa:framework:staging
  
- name: Upload QA Artifacts
  uses: actions/upload-artifact@v3
  with:
    name: qa-artifacts
    path: QAArtifacts/
```

### Performance Baselines
The framework can be extended to:
- Compare screenshots to golden baseline images
- Track performance metrics over time
- Fail builds on regression detection

## Memory Plugin Integration

### Anchor Creation
Each QA run creates a memory anchor:
```
WT-ADMIN-UI-QA-FRAMEWORK-2025-08-01T08-06-00Z
```

### Artifact Storage
```
DriveMemory/QA-Framework/
├── Anchors/
│   └── WT-ADMIN-UI-QA-FRAMEWORK-{timestamp}.anchor
├── Artifacts/
│   └── {anchor-id}/
│       ├── screenshots/
│       ├── logs/
│       └── qa-report.json
└── Sessions/
    └── {anchor-id}.json
```

### Governance Compliance
- All QA runs logged to `logs/governance.jsonl`
- Memory anchors provide semantic linking
- Audit trail maintained for compliance

## Troubleshooting

### Common Issues

1. **Server Won't Start**
   - Check if ports 5173/3000 are available
   - Verify npm dependencies are installed
   - Check for firewall/network restrictions

2. **Screenshots Fail**
   - Ensure headless browser can access display
   - Check viewport settings in config
   - Verify sufficient disk space

3. **AI Verification False Positives**
   - Adjust confidence thresholds in config
   - Update error patterns for your app
   - Review screenshot analysis rules

### Debug Mode
```bash
HEADLESS=false npm run qa:framework:dev
```

### Log Analysis
Check console logs in `QAArtifacts/logs/` for detailed error information.

## Contributing

### Adding New AI Rules
1. Update `ai-verification-utils.js`
2. Add patterns to `qa-config.json`
3. Test with various scenarios
4. Update documentation

### Extending Memory Integration
1. Modify `memory-plugin-integration.js`
2. Add new anchor types
3. Update governance schema
4. Test storage and retrieval

## License

Part of the Wombat Track project. See main project LICENSE for details.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run qa:framework` | Run complete QA pipeline |
| `npm run qa:framework:dev` | Run in development mode |
| `npm run qa:framework:staging` | Run in staging environment |
| `npm run qa:admin-ui` | Run admin UI tests only |
| `npm run qa:configurable` | Run configurable framework only |

For detailed API documentation, see individual script files.