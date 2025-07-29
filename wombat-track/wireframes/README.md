# Orbis Platform UI Wireframes

Generated from Sora visual concepts and UX Designer recommendations (session 1577433f-be7a-4070-af62-8a38c4417818).

## 🔵 Orbis Core - Dashboard Wireframe

**File**: `orbis-core-dashboard.html`

### Components Implemented:
- **Orbital Pulse Animation**: Concentric circular visualizations
- **Four-Tile Dashboard Layout**: 
  - Active Orbits (circular graph)
  - Network Growth (line graph)
  - Dataset Details (metadata panel)
  - Governance Proposal (status tracking)
- **Confidence Gradients**: Visual AI confidence indicators
- **Aurora Gradients**: Claude-specific action styling
- **Threaded Governance Timeline**: Decision tracking visualization
- **Depth Tokens**: 4-level visual hierarchy system
- **Humanization Layer**: Morning greetings and contextual status

### UX Designer Refinements Applied:
✅ Quantum Violet (#6B46C1) replaces Nebula Blue for AI states  
✅ Growth Sage Green (#10B981) for success confirmations  
✅ Aurora Gradient (Blue→Violet) for Claude actions  
✅ Confidence gradient visualization around prompts  
✅ Agent status differentiation (Claude vs Gizmo)  

### Test IDs:
- `orbis-header`, `dashboard-grid`
- `active-orbits-card`, `network-growth-card`
- `dataset-details-card`, `governance-proposal-card`
- `orbit-visualization`, `network-graph`
- `governance-timeline`, `proposal-status-approved`

---

## 🔥 Orbis Forge - Vertical Layout Wireframe

**File**: `orbis-forge-layout.html`

### Components Implemented:
- **Molten Loop Logo**: Intertwined loops with slashed O
- **Color Swatch Display**: Brand palette visualization
- **Animated Core Module**: Geometric pulse with node indicators
- **Prompt Console**: Execution tracing with metadata
- **Dual Toolbar**: Stack View toggle + Ignite progress button
- **Trace Flow Animation**: Real-time execution visualization
- **Geometric Pulse**: Gizmo-specific animation style

### Forge-Specific Elements:
✅ Copper Ember highlights (#E97D47)  
✅ Forge Teal accents (#3FB8AF)  
✅ Geometric pulse animations (vs Claude's organic flow)  
✅ Bold, geometric typography treatment  
✅ Molten flow animation for processing states  

### Test IDs:
- `forge-header`, `forge-logo`, `color-swatches`
- `core-module-card`, `core-animation`, `active-nodes-count`
- `prompt-console-card`, `console-input`, `output-metadata`
- `trace-visualization`, `stack-view-toggle`, `ignite-button`

---

## 🎨 Design System Implementation

### Color Palette (UX Refined):
```css
--obsidian: #0C0C0E;          /* Primary background */
--quantum-violet: #6B46C1;    /* AI states (was Nebula Blue) */
--solar-copper: #D77B28;      /* Governance/alerts */
--copper-ember: #E97D47;      /* Forge highlights */
--growth-sage: #10B981;       /* Success states */
--forge-teal: #3FB8AF;        /* System health */
--lumen-cream: #F2F0E6;       /* Text/surfaces */
--orbit-gray: #B3B6B7;        /* Secondary elements */
```

### Typography:
- **Headers**: Space Grotesk (Bold, Uppercase)
- **Body**: Inter (Regular/Medium)
- **Code**: JetBrains Mono

### Animation Principles:
- **Claude**: Organic, flowing, soft pulses
- **Gizmo**: Geometric, precise, angular transitions
- **Confidence**: Progressive fill animations
- **Trace**: Linear flow visualization

### Depth System:
- **Depth 0**: Canvas (#0C0C0E)
- **Depth 1**: Cards (#1A1A1E)
- **Depth 2**: Active elements (#242428)
- **Depth 3**: Focus/Modal (#2E2E32)

---

## 🧪 Usage Instructions

### View Wireframes:
```bash
# Open in browser
open wireframes/orbis-core-dashboard.html
open wireframes/orbis-forge-layout.html
```

### Export to Figma:
Both files use semantic HTML structure compatible with Figma import plugins:
- Import as HTML Auto-Layout
- Component names preserved in comments
- CSS custom properties map to Figma tokens

### Component Integration:
All components include:
- `data-testid` attributes for testing
- Semantic HTML structure
- Accessible color contrast ratios
- Responsive breakpoint classes
- CSS custom property system

---

## 📐 Technical Specifications

- **Framework**: Tailwind CSS with custom extensions
- **Dark Mode**: Default enabled with `class` strategy
- **Animations**: CSS keyframes with hardware acceleration
- **Typography**: System font fallbacks included
- **Accessibility**: WCAG 2.1 AA contrast ratios maintained
- **Testing**: Comprehensive data-testid coverage

Both wireframes demonstrate the evolution from Wombat Track to Orbis, incorporating the UX Designer's humanization recommendations while maintaining the sophisticated, governance-first approach.