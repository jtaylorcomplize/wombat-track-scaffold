interface UserProfile {
  id: string;
  email: string;
  role: string;
  department: string;
  permissions: string[];
  practice_areas?: string[];
  client_access?: string[];
  metadata?: Record<string, unknown>;
}

interface AccessRule {
  resource_type: 'dashboard' | 'card' | 'data' | 'action';
  resource_id: string;
  required_roles: string[];
  required_permissions: string[];
  conditions?: AccessCondition[];
}

interface AccessCondition {
  type: 'department' | 'practice_area' | 'client_access' | 'custom';
  field: string;
  operator: 'equals' | 'in' | 'not_in' | 'contains';
  value: unknown;
}

interface DataRowLevelSecurity {
  field: string;
  filter_type: 'include' | 'exclude';
  values: string[];
  condition: 'user_role' | 'user_department' | 'user_attribute';
}

class UserAccessControlService {
  private static instance: UserAccessControlService;
  private accessRules: Map<string, AccessRule[]> = new Map();
  private roleHierarchy: Map<string, string[]> = new Map();

  constructor() {
    this.initializeRoleHierarchy();
    this.initializeAccessRules();
  }

  static getInstance(): UserAccessControlService {
    if (!UserAccessControlService.instance) {
      UserAccessControlService.instance = new UserAccessControlService();
    }
    return UserAccessControlService.instance;
  }

  private initializeRoleHierarchy() {
    this.roleHierarchy.set('admin', ['admin', 'partner', 'senior_associate', 'associate', 'paralegal', 'clerk']);
    this.roleHierarchy.set('partner', ['partner', 'senior_associate', 'associate', 'paralegal', 'clerk']);
    this.roleHierarchy.set('senior_associate', ['senior_associate', 'associate', 'paralegal', 'clerk']);
    this.roleHierarchy.set('associate', ['associate', 'paralegal', 'clerk']);
    this.roleHierarchy.set('paralegal', ['paralegal', 'clerk']);
    this.roleHierarchy.set('clerk', ['clerk']);
  }

  private initializeAccessRules() {
    const rules: AccessRule[] = [
      {
        resource_type: 'dashboard',
        resource_id: 'financial_dashboards',
        required_roles: ['partner', 'admin'],
        required_permissions: ['view_financial_data'],
        conditions: [
          {
            type: 'department',
            field: 'department',
            operator: 'in',
            value: ['management', 'finance']
          }
        ]
      },
      {
        resource_type: 'dashboard',
        resource_id: 'matter_profitability',
        required_roles: ['partner', 'senior_associate', 'admin'],
        required_permissions: ['view_matter_financials'],
        conditions: [
          {
            type: 'practice_area',
            field: 'practice_areas',
            operator: 'in',
            value: ['Corporate', 'Litigation', 'Property']
          }
        ]
      },
      {
        resource_type: 'card',
        resource_id: 'client_revenue_summary',
        required_roles: ['partner', 'admin'],
        required_permissions: ['view_client_revenue']
      },
      {
        resource_type: 'data',
        resource_id: 'sensitive_client_data',
        required_roles: ['partner', 'admin'],
        required_permissions: ['access_sensitive_data'],
        conditions: [
          {
            type: 'client_access',
            field: 'client_access',
            operator: 'contains',
            value: 'high_value'
          }
        ]
      }
    ];

    rules.forEach(rule => {
      const existing = this.accessRules.get(rule.resource_id) || [];
      existing.push(rule);
      this.accessRules.set(rule.resource_id, existing);
    });
  }

  hasRole(userRole: string, requiredRole: string): boolean {
    const hierarchy = this.roleHierarchy.get(userRole) || [];
    return hierarchy.includes(requiredRole);
  }

  canAccessResource(user: UserProfile, resourceType: string, resourceId: string): {
    granted: boolean;
    reason?: string;
    restrictions?: DataRowLevelSecurity[];
  } {
    const rules = this.accessRules.get(resourceId) || [];
    const applicableRules = rules.filter(rule => rule.resource_type === resourceType);

    if (applicableRules.length === 0) {
      return {
        granted: this.hasDefaultAccess(user, resourceType),
        reason: 'No specific access rules defined'
      };
    }

    for (const rule of applicableRules) {
      const roleCheck = this.checkRoleRequirement(user.role, rule.required_roles);
      if (!roleCheck.granted) {
        continue;
      }

      const permissionCheck = this.checkPermissionRequirement(user.permissions, rule.required_permissions);
      if (!permissionCheck.granted) {
        continue;
      }

      if (rule.conditions) {
        const conditionCheck = this.checkConditions(user, rule.conditions);
        if (!conditionCheck.granted) {
          continue;
        }
      }

      const restrictions = this.getDataRestrictions(user);
      
      return {
        granted: true,
        restrictions
      };
    }

    return {
      granted: false,
      reason: 'Access denied: Insufficient permissions or role requirements not met'
    };
  }

  private checkRoleRequirement(userRole: string, requiredRoles: string[]): { granted: boolean; reason?: string } {
    for (const required of requiredRoles) {
      if (this.hasRole(userRole, required)) {
        return { granted: true };
      }
    }
    return {
      granted: false,
      reason: `User role '${userRole}' does not meet requirements: ${requiredRoles.join(', ')}`
    };
  }

  private checkPermissionRequirement(userPermissions: string[], requiredPermissions: string[]): { granted: boolean; reason?: string } {
    const missingPermissions = requiredPermissions.filter(perm => !userPermissions.includes(perm));
    
    if (missingPermissions.length > 0) {
      return {
        granted: false,
        reason: `Missing permissions: ${missingPermissions.join(', ')}`
      };
    }

    return { granted: true };
  }

  private checkConditions(user: UserProfile, conditions: AccessCondition[]): { granted: boolean; reason?: string } {
    for (const condition of conditions) {
      const userValue = this.getUserFieldValue(user, condition.field);
      
      if (!this.evaluateCondition(userValue, condition)) {
        return {
          granted: false,
          reason: `Condition not met: ${condition.field} ${condition.operator} ${condition.value}`
        };
      }
    }

    return { granted: true };
  }

  private getUserFieldValue(user: UserProfile, field: string): unknown {
    switch (field) {
      case 'department':
        return user.department;
      case 'practice_areas':
        return user.practice_areas || [];
      case 'client_access':
        return user.client_access || [];
      default:
        return user.metadata?.[field];
    }
  }

  private evaluateCondition(userValue: unknown, condition: AccessCondition): boolean {
    switch (condition.operator) {
      case 'equals':
        return userValue === condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(userValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(userValue);
      case 'contains':
        if (Array.isArray(userValue)) {
          return userValue.some(v => condition.value.includes(v));
        }
        return String(userValue).includes(String(condition.value));
      default:
        return false;
    }
  }

  private hasDefaultAccess(user: UserProfile, resourceType: string): boolean {
    switch (resourceType) {
      case 'dashboard':
        return ['partner', 'senior_associate', 'admin'].includes(user.role);
      case 'card':
        return true;
      case 'data':
        return ['partner', 'admin'].includes(user.role);
      default:
        return false;
    }
  }

  private getDataRestrictions(user: UserProfile): DataRowLevelSecurity[] {
    const restrictions: DataRowLevelSecurity[] = [];

    switch (user.role) {
      case 'admin':
      case 'partner':
        break;
      
      case 'senior_associate':
        restrictions.push({
          field: 'responsible_partner',
          filter_type: 'include',
          values: [user.email],
          condition: 'user_attribute'
        });
        break;
      
      case 'associate':
        restrictions.push({
          field: 'assigned_fee_earner',
          filter_type: 'include',
          values: [user.email],
          condition: 'user_attribute'
        });
        restrictions.push({
          field: 'matter_status',
          filter_type: 'exclude',
          values: ['Confidential'],
          condition: 'user_role'
        });
        break;
      
      case 'paralegal':
      case 'clerk':
        restrictions.push({
          field: 'assigned_fee_earner',
          filter_type: 'include',
          values: [user.email],
          condition: 'user_attribute'
        });
        restrictions.push({
          field: 'financial_data',
          filter_type: 'exclude',
          values: ['billing_rates', 'revenue', 'profit_margin'],
          condition: 'user_role'
        });
        break;
    }

    if (user.practice_areas && user.practice_areas.length > 0) {
      restrictions.push({
        field: 'practice_area',
        filter_type: 'include',
        values: user.practice_areas,
        condition: 'user_attribute'
      });
    }

    return restrictions;
  }

  getPermittedCards(user: UserProfile, allCards: Array<{ id: string }>): Array<{ id: string }> {
    return allCards.filter(card => {
      const access = this.canAccessResource(user, 'card', card.id);
      return access.granted;
    });
  }

  applyDataRestrictions(user: UserProfile, query: Record<string, unknown>, resourceId: string): Record<string, unknown> {
    const access = this.canAccessResource(user, 'data', resourceId);
    
    if (!access.granted) {
      throw new Error(`Access denied: ${access.reason}`);
    }

    if (!access.restrictions || access.restrictions.length === 0) {
      return query;
    }

    const modifiedQuery = { ...query };
    
    access.restrictions.forEach(restriction => {
      if (!modifiedQuery.filters) {
        modifiedQuery.filters = {};
      }

      switch (restriction.filter_type) {
        case 'include':
          modifiedQuery.filters[restriction.field] = {
            operator: 'in',
            values: restriction.values
          };
          break;
        case 'exclude':
          modifiedQuery.filters[restriction.field] = {
            operator: 'not_in',
            values: restriction.values
          };
          break;
      }
    });

    return modifiedQuery;
  }

  logAccessAttempt(user: UserProfile, resourceType: string, resourceId: string, granted: boolean, reason?: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_role: user.role,
      resource_type: resourceType,
      resource_id: resourceId,
      access_granted: granted,
      reason,
      user_department: user.department,
      user_permissions: user.permissions
    };

    console.log('Access Control Log:', logEntry);
    
    return logEntry;
  }
}

export { UserAccessControlService, type UserProfile, type AccessRule, type DataRowLevelSecurity };