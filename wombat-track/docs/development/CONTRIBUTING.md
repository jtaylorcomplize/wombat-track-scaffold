# Contributing to Wombat Track - Developer Onboarding Guide

Welcome to Wombat Track, an AI-enhanced recursive development engine. This guide covers everything needed to contribute effectively to our enterprise-grade codebase.

## Setup

### Prerequisites
- **Node.js**: Version 20+ (verified with v20.19.4)
- **TypeScript**: 5.x for type safety and enterprise standards
- **Git**: Latest version with proper configuration
- **Claude Code**: AI development assistant integration

### Local Development Setup

#### 1. Repository Clone and Initial Setup
```bash
git clone <repository-url>
cd wombat-track
npm install
```

#### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Configure development database
npm run db:setup

# Initialize development server
npm run dev
```

#### 3. Claude Code Integration
Install and configure Claude Code CLI:
```bash
# Install Claude Code (follow latest installation guide)
curl -fsSL https://cli.anthropic.com/install.sh | sh

# Verify installation
claude --version

# Initialize project integration
claude init
```

#### 4. Development Tools Setup
```bash
# Install development dependencies
npm run setup:dev

# Configure pre-commit hooks
npm run hooks:install

# Verify setup
npm run validate:setup
```

## Workflow

### Development Process
Our workflow follows the **WT-Phase** system with AI-assisted development:

#### 1. **Issue Assignment and Planning**
```bash
# Check current phase and active issues
claude phase status

# Create or assign to phase
claude phase assign WT-X.Y
```

#### 2. **Branch Management**
```bash
# Create feature branch following naming convention
git checkout -b feature/wt-x.y-description

# Or for hotfixes
git checkout -b hotfix/critical-issue-description
```

#### 3. **AI-Assisted Development**
```bash
# Start Claude Code session for feature development
claude code --context="Wombat Track development session"

# Use Claude for code generation with context
claude generate component --pattern="existing-component-pattern"

# Get AI assistance for debugging
claude debug --error="specific-error-description"
```

#### 4. **Code Quality and Testing**
```bash
# Run full quality checks
npm run quality:check

# Execute test suite
npm run test

# Type checking
npm run typecheck

# Linting and formatting
npm run lint && npm run format
```

#### 5. **Commit Standards**
Follow the **WT SDLC Controls** commit format:
```
WT-X.Y: [scope] Description

Examples:
✅ WT-8.9: [docs] Update governance framework
✅ WT-7.2: [ui] Fix sidebar navigation bug
✅ WT-3.1: [api] Add data export endpoints
```

#### 6. **Pull Request Process**
```bash
# Push feature branch
git push origin feature/wt-x.y-description

# Create PR using template
gh pr create --template .github/PULL_REQUEST_TEMPLATE.md

# Link to Claude dispatcher for AI review
claude pr review --auto-assign
```

### Code Standards

#### TypeScript Guidelines
- **Strict Mode**: All TypeScript strict options enabled
- **Type Safety**: No `any` types without explicit justification
- **Interface Design**: Prefer interfaces over types for object shapes
- **Generic Constraints**: Use proper generic constraints for reusability

#### React Patterns
- **Functional Components**: Use hooks-based components exclusively
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Error Boundaries**: Implement proper error handling
- **Lazy Loading**: Use React.lazy for performance optimization

#### File Organization
```
src/
├── components/          # Reusable UI components
│   ├── common/         # Shared components
│   ├── layout/         # Layout components (sidebar, header)
│   ├── surfaces/       # Main application surfaces
│   └── admin/          # Admin-specific components
├── pages/              # Route-level components
├── hooks/              # Custom React hooks
├── services/           # API and business logic
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

## Memory

### Memory Anchor System
Wombat Track uses **MemoryPlugin Anchors** for AI context awareness:

#### Understanding Memory Anchors
- **WT-ANCHOR-GOVERNANCE**: Policy and compliance framework
- **WT-ANCHOR-DEPLOYMENT**: Environment and deployment procedures  
- **WT-ANCHOR-QUALITY**: Code standards and quality assurance
- **WT-ANCHOR-IMPLEMENTATION**: Technical implementation patterns

#### Using Memory Anchors in Development
```typescript
// Reference memory anchors in code comments for AI context
/* Memory Context: WT-ANCHOR-IMPLEMENTATION
 * This component follows the established sidebar pattern
 * with enhanced AI integration capabilities.
 */

// Use anchors in governance logging
const governanceEntry = {
  memory_anchors: ['WT-ANCHOR-QUALITY'],
  action: 'component_refactor',
  // ...
};
```

#### DriveMemory Integration
- **Automatic Classification**: Code and documentation automatically classified by memory anchors
- **Context Preservation**: AI maintains context across development sessions
- **Cross-Reference Linking**: Related components and documentation automatically linked

### Memory Guidelines for Contributors
1. **Context Awareness**: Include relevant memory anchors in complex implementations
2. **Documentation Linking**: Reference related anchor documentation in code
3. **Pattern Consistency**: Follow patterns established in anchored directories
4. **AI Collaboration**: Use memory context for enhanced AI assistance

## Dispatch

### Claude Dispatcher Integration
The **Claude Dispatcher** enables automated task orchestration and AI-assisted development:

#### Accessing the Dispatcher
```bash
# Interactive dispatcher session
claude dispatch interactive

# Automated task dispatch
claude dispatch task --phase="WT-X.Y" --scope="feature-description"

# View dispatch history
claude dispatch history --recent=10
```

#### Dispatch Templates
```typescript
// Feature Development Dispatch
{
  "phase": "WT-X.Y",
  "task": "implement-new-feature",
  "context": "sidebar enhancement with memory integration",
  "memory_anchors": ["WT-ANCHOR-IMPLEMENTATION", "WT-ANCHOR-QUALITY"],
  "validation": ["tests-pass", "lint-clean", "type-safe"]
}

// Bug Fix Dispatch
{
  "phase": "hotfix",
  "task": "resolve-critical-issue", 
  "context": "deployment pipeline failure",
  "priority": "critical",
  "memory_anchors": ["WT-ANCHOR-DEPLOYMENT", "WT-ANCHOR-TROUBLESHOOTING"]
}
```

#### PR Integration with Dispatcher
```bash
# Auto-generate PR description with Claude context
claude pr generate --memory-context --include-anchors

# Request AI code review through dispatcher
claude dispatch review --pr-number=123 --deep-analysis

# Automated testing dispatch
claude dispatch test --comprehensive --include-e2e
```

### Common Commands Reference

#### Development Commands
```bash
# Start development server
npm run dev

# Build for production  
npm run build

# Run comprehensive test suite
npm run test:full

# Database operations
npm run db:migrate
npm run db:seed
npm run db:reset
```

#### Quality Assurance Commands
```bash
# Full quality check pipeline
npm run quality:pipeline

# Specific quality checks
npm run lint
npm run typecheck  
npm run test:unit
npm run test:e2e
npm run audit:security
```

#### Claude Integration Commands
```bash
# Context-aware code generation
claude generate --pattern="component" --memory-context

# AI-assisted debugging
claude debug --trace --memory-anchors="WT-ANCHOR-TROUBLESHOOTING"

# Automated documentation generation
claude docs generate --memory-anchors="WT-ANCHOR-IMPLEMENTATION"
```

#### Git and Deployment
```bash
# Commit with SDLC validation
git commit -m "WT-X.Y: [scope] Description"

# Push with pre-commit hooks
git push origin feature/branch-name

# Deploy to staging
npm run deploy:staging

# Production deployment (requires approval)
npm run deploy:production
```

## AI Development Guidelines

### Claude Code Best Practices
1. **Context Provision**: Always provide relevant memory anchor context
2. **Pattern Recognition**: Reference existing code patterns for consistency  
3. **Quality Integration**: Use AI for code review and quality validation
4. **Documentation**: Generate AI-assisted documentation with memory links

### Memory-Aware Development
1. **Anchor Awareness**: Understand which memory anchors apply to your work
2. **Context Preservation**: Maintain context across development sessions
3. **Pattern Consistency**: Follow established patterns from anchored directories
4. **Cross-System Integration**: Consider how changes affect linked memory anchors

### AI Governance Compliance
1. **Human Oversight**: All AI-generated code requires human review
2. **Quality Gates**: AI assistance must pass all quality and security checks
3. **Audit Trail**: AI actions logged through governance system
4. **Ethics Compliance**: Follow AI usage policies and ethical guidelines

## Getting Help

### Resources
- **Documentation**: Comprehensive docs in `/docs/` with memory anchor organization
- **Memory Anchors**: Context-aware documentation through anchor system
- **Claude Integration**: AI-assisted development with memory context
- **Team Chat**: Development discussion channels with AI integration

### Support Channels
- **Technical Issues**: Use Claude debugging assistance with memory context
- **Process Questions**: Reference governance documentation and memory anchors
- **Code Review**: AI-assisted review through Claude dispatcher
- **Emergency Support**: Critical issues with immediate Claude assistance

### Learning Path
1. **Repository Exploration**: Use Claude to understand codebase with memory context
2. **Pattern Recognition**: Study existing components with AI assistance
3. **Feature Development**: Start with small features using Claude guidance
4. **Memory Integration**: Learn to leverage memory anchors for enhanced AI collaboration

---

**Welcome to the future of AI-enhanced development!** 🚀

*This guide evolves with our development practices. Contribute improvements through the standard PR process with Claude assistance.*

**Memory Anchor**: WT-ANCHOR-DEVELOPMENT  
**Last Updated**: 2025-08-07  
**Version**: 1.0