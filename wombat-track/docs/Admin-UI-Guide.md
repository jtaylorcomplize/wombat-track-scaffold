# OF-BEV Admin UI Guide
## Visual Differentiation & Admin Mode Features

**Version:** 1.0  
**Date:** 2025-07-30  
**Phase:** OF-BEV Phase 3 - Admin Console  

---

## 🎯 Overview

The OF-BEV Admin Console features visual differentiation to clearly distinguish admin operations from the main console interface. This prevents confusion and ensures users are aware when they have elevated privileges and access to backend systems.

## 🔐 Admin Mode Activation

### Automatic Detection
Admin mode is automatically activated when:
- **Environment Variable:** `VITE_ADMIN_MODE=true` is set in `.env`
- **URL Path:** Current path includes `/admin` (e.g., `/admin/data-explorer`)
- **Local Storage:** User has previously enabled admin mode via toggle

### Manual Toggle
Users can manually toggle admin mode using the **Admin Mode Toggle** button located in:
- Sidebar footer (always visible)
- Settings menu (context-dependent)

## 🎨 Visual Differentiation Features

### 1. Admin Mode Banner
**Location:** Top of all admin pages  
**Style:** Red background (#B91C1C) with white text  
**Content:** 🔐 ADMIN MODE – Local Backend Access (Phase 3)

**Features:**
- Persistent across all admin routes
- Responsive design for mobile/desktop
- Environment indicator (development/staging/production)
- Live status indicator with pulsing animation

### 2. Admin Theme Color Scheme
**Main Console vs Admin Console:**

| Element | Main Console | Admin Console |
|---------|-------------|---------------|
| Sidebar Background | White (#FFFFFF) | Dark Gray (#111827) |
| Active Navigation | Blue (#3B82F6) | Red (#DC2626) |
| Text Color | Gray (#374151) | White/Light Gray |
| Hover States | Light Gray | Dark Gray with Red accent |
| Borders | Light Gray (#E5E7EB) | Dark Gray (#374151) |

### 3. Component-Level Changes

#### Sidebar Enhancements
- **Header:** Platform title shows "(ADMIN)" suffix in red
- **Navigation:** Red accent for active items instead of blue
- **Background:** Dark theme with improved contrast
- **Admin Toggle:** Prominent toggle button with status indicator

#### Enhanced Project Sidebar
- Dark gray background (#111827)
- Red active states (#DC2626)
- White text on dark background
- Gray hover states with red accents

#### Content Areas
- Subtle theme adjustments for better readability
- Admin-specific form styling
- Enhanced table and card designs

## 🔧 Technical Implementation

### Context Provider
```typescript
// AdminModeContext.tsx
const AdminModeProvider: React.FC = ({ children }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  // Auto-detection logic for env vars, URL paths, localStorage
};
```

### Component Structure
```typescript
// AdminAppLayout.tsx
return (
  <div className={`admin-app-layout ${isAdminMode ? 'admin-mode-active' : ''}`}>
    {isAdminMode && <AdminBanner environment={environment} />}
    <AppLayout />
  </div>
);
```

### CSS Classes
```css
/* Body classes applied automatically */
body.admin-mode { /* Admin mode indicator */ }
body.admin-theme { /* Visual theme overrides */ }

/* Component-specific styling */
.enhanced-sidebar.admin-theme { /* Dark sidebar */ }
.admin-banner { /* Red banner styling */ }
```

## 📱 Responsive Design

### Desktop (>768px)
- Full admin banner with environment details
- Complete sidebar with admin toggle
- Rich visual indicators and status

### Mobile (<768px)
- Condensed admin banner
- Collapsible sidebar with admin mode indicator
- Touch-friendly admin toggle

### Tablet (768px-1024px)
- Hybrid layout with responsive sidebar
- Adaptive banner sizing
- Optimized for touch interaction

## 🛡️ Security Considerations

### Visual Security
- **Clear Differentiation:** Admin mode is impossible to miss
- **Environment Awareness:** Shows current environment (dev/staging/prod)
- **Session Persistence:** Admin mode state persists across sessions
- **Auto-Detection:** Prevents accidental admin access

### Access Control
- Admin mode only affects UI presentation
- Backend API security handles actual permissions
- Visual indicators complement, not replace, access controls

## 🔄 User Workflows

### Entering Admin Mode
1. **Automatic:** Visit `/admin/*` route or set `VITE_ADMIN_MODE=true`
2. **Manual:** Click admin toggle in sidebar
3. **Visual Confirmation:** Red banner appears, theme changes
4. **Governance Logging:** Admin mode activation logged

### Working in Admin Mode
1. **Clear Visual Context:** Red banner always visible
2. **Enhanced Navigation:** Admin-specific theme applied
3. **Elevated Privileges:** Access to backend data operations
4. **Audit Trail:** All actions logged to governance system

### Exiting Admin Mode
1. **Toggle Off:** Click admin mode toggle
2. **Visual Confirmation:** Banner disappears, theme reverts
3. **Session Update:** Preference saved to localStorage
4. **Governance Logging:** Admin mode deactivation logged

## 📊 Governance Integration

### Automatic Logging
All admin mode activities are automatically logged:

```json
{
  "timestamp": "2025-07-30T12:00:00Z",
  "event_type": "admin_mode_ui_activated",
  "user_id": "admin_user",
  "resource_type": "admin_interface",
  "action": "render_admin_banner",
  "details": {
    "environment": "development",
    "ui_differentiation": "active",
    "local_backend_access": true
  }
}
```

### MemoryPlugin Anchors
- **Banner Render:** `of-bev-admin-ui-banner-{timestamp}`
- **Mode Toggle:** `admin-mode-toggle-{timestamp}`
- **Theme Activation:** `admin-theme-active-{timestamp}`

## 🧪 Testing & Validation

### Visual Testing Checklist
- [ ] Admin banner appears on `/admin/*` routes
- [ ] Red theme applies consistently across components
- [ ] Toggle button works correctly
- [ ] Mobile responsive design functions properly
- [ ] Environment indicator shows correct environment

### Functional Testing
- [ ] Admin mode persists across page refreshes
- [ ] Governance logging captures all mode changes
- [ ] Theme switching is instantaneous
- [ ] No impact on main console when admin mode is off

### Browser Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 🚀 Production Deployment

### Environment Configuration
```bash
# Production
VITE_ADMIN_MODE=false
VITE_ENVIRONMENT=production

# Staging
VITE_ADMIN_MODE=true
VITE_ENVIRONMENT=staging

# Development
VITE_ADMIN_MODE=true
VITE_ENVIRONMENT=development
```

### Deployment Checklist
- [ ] Environment variables configured correctly
- [ ] Admin theme CSS included in build
- [ ] Governance logging endpoints available
- [ ] MemoryPlugin integration functional
- [ ] Visual differentiation tested in target environment

## 📖 Developer Notes

### Extending Admin Theme
To add admin theme support to new components:

```typescript
import { useAdminMode } from '../../contexts/AdminModeContext';

const MyComponent = () => {
  const { isAdminMode } = useAdminMode();
  
  return (
    <div className={isAdminMode ? 'admin-theme-component' : 'default-component'}>
      {/* Component content */}
    </div>
  );
};
```

### CSS Guidelines
- Use conditional classes based on `isAdminMode`
- Follow established color palette (red accents, dark backgrounds)
- Maintain accessibility standards (contrast ratios)
- Test both light and dark mode variations

### Component Integration
- Always import `useAdminMode` hook for theme support
- Log significant admin actions to governance system
- Include admin mode awareness in component testing
- Document admin-specific behavior in component docs

## 🔍 Troubleshooting

### Common Issues

**Admin Mode Not Activating:**
1. Check `VITE_ADMIN_MODE` environment variable
2. Verify URL contains `/admin` path
3. Clear localStorage and retry
4. Check browser console for JavaScript errors

**Theme Not Applying:**
1. Ensure `admin-theme.css` is imported
2. Verify body classes are being applied
3. Check CSS specificity conflicts
4. Inspect element styles in browser dev tools

**Toggle Not Working:**
1. Verify AdminModeProvider wraps application
2. Check useAdminMode hook is properly imported
3. Ensure localStorage permissions are available
4. Test in different browsers

### Debug Information
Enable debug logging by setting:
```javascript
localStorage.setItem('wombat-track-debug', 'true');
```

This will output detailed admin mode state information to the browser console.

---

**Documentation Version:** 1.0  
**Last Updated:** 2025-07-30  
**Related Components:** AdminBanner, AdminModeToggle, AdminAppLayout, EnhancedProjectSidebar  
**Governance Anchor:** `of-bev-admin-ui-guide-20250730`