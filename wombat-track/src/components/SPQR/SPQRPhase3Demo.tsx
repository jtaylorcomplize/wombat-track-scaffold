import React, { useState, useEffect } from 'react';
import { SPQRDashboardContainer } from './SPQRDashboardContainer';
import { GovernanceLogger } from '../../services/governance-logger';
import { UserAccessControlService, type UserProfile } from '../../services/user-access-control';

interface DemoProps {
  onPhaseComplete?: () => void;
}

export const SPQRPhase3Demo: React.FC<DemoProps> = ({ onPhaseComplete }) => {
  const [selectedCard, setSelectedCard] = useState<string>('Active_Matters_Overview');
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'demo_user_001',
    email: 'demo@actionstep.com',
    role: 'partner',
    department: 'management',
    permissions: ['view_financial_data', 'view_matter_financials', 'access_sensitive_data'],
    practice_areas: ['Corporate', 'Litigation'],
    client_access: ['high_value']
  });
  const [cardData, setCardData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [governanceLogger] = useState(() => GovernanceLogger.getInstance());
  const [accessControl] = useState(() => UserAccessControlService.getInstance());

  const availableCards = [
    'Active_Matters_Overview',
    'Client_Revenue_Summary', 
    'Matter_Profitability_Analysis',
    'Time_Entry_Dashboard',
    'Deadline_Tracker'
  ];

  const mockUsers: UserProfile[] = [
    {
      id: 'partner_001',
      email: 'partner@actionstep.com',
      role: 'partner',
      department: 'management',
      permissions: ['view_financial_data', 'view_matter_financials', 'access_sensitive_data'],
      practice_areas: ['Corporate', 'Litigation'],
      client_access: ['high_value']
    },
    {
      id: 'associate_001', 
      email: 'associate@actionstep.com',
      role: 'associate',
      department: 'legal',
      permissions: ['view_matter_data'],
      practice_areas: ['Property'],
      client_access: []
    },
    {
      id: 'paralegal_001',
      email: 'paralegal@actionstep.com', 
      role: 'paralegal',
      department: 'support',
      permissions: ['view_basic_data'],
      practice_areas: ['Corporate'],
      client_access: []
    }
  ];

  useEffect(() => {
    loadCardData();
  }, [selectedCard]);

  const loadCardData = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`src/data/spqr/validation/${selectedCard}.json`);
      const data = await response.json();
      setCardData(data);

      governanceLogger.log({
        event_type: 'card_loaded',
        user_id: currentUser.id,
        user_role: currentUser.role,
        resource_type: 'card',
        resource_id: selectedCard,
        action: 'load',
        success: true,
        details: {
          card_name: data.name,
          card_category: data.category
        }
      });

    } catch (error) {
      console.error('Failed to load card data:', error);
      
      const mockCardData = {
        id: selectedCard,
        name: selectedCard.replace(/_/g, ' '),
        description: `Demo dashboard for ${selectedCard.replace(/_/g, ' ')}`,
        category: 'demonstration',
        permissions: {
          viewRoles: ['partner', 'senior_associate', 'associate'],
          editRoles: ['partner', 'admin']
        },
        filters: {
          defaultFilters: [
            { field_name: 'matter_status', operator: 'equals', value: 'Active' }
          ],
          availableFilters: [
            {
              field_name: 'matter_status',
              display_name: 'Matter Status',
              filter_type: 'dropdown',
              options: ['Active', 'Closed', 'On Hold']
            },
            {
              field_name: 'practice_area',
              display_name: 'Practice Area',
              filter_type: 'multiselect',
              options: ['Corporate', 'Litigation', 'Property', 'Family']
            },
            {
              field_name: 'date_range',
              display_name: 'Date Range',
              filter_type: 'date_range'
            }
          ]
        }
      };
      
      setCardData(mockCardData);
    }
    
    setIsLoading(false);
  };

  const handleGovernanceLog = (entry: Record<string, unknown>) => {
    console.log('Phase 3 Governance Entry:', entry);
  };

  const switchUser = (user: UserProfile) => {
    setCurrentUser(user);
    
    governanceLogger.log({
      event_type: 'user_switch',
      user_id: user.id,
      user_role: user.role,
      resource_type: 'dashboard',
      resource_id: 'demo',
      action: 'switch_user',
      success: true,
      details: {
        previous_user: currentUser.id,
        new_user: user.id,
        role_change: `${currentUser.role} -> ${user.role}`
      }
    });
  };

  const completePhase3 = async () => {
    const report = await governanceLogger.generatePhaseCompleteReport();
    
    governanceLogger.log({
      event_type: 'phase_complete',
      user_id: 'system',
      user_role: 'system',
      resource_type: 'dashboard',
      resource_id: 'phase3',
      action: 'complete',
      success: true,
      details: {
        phase: 'Phase3–RuntimeEnablement',
        completion_timestamp: new Date().toISOString(),
        report
      }
    });

    if (onPhaseComplete) {
      onPhaseComplete();
    }
  };

  const renderUserSelector = () => (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="text-lg font-medium text-blue-900 mb-3">Demo User Selector</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {mockUsers.map(user => (
          <button
            key={user.id}
            onClick={() => switchUser(user)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              currentUser.id === user.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
            }`}
          >
            <div className="font-medium">{user.role.replace('_', ' ')}</div>
            <div className="text-sm opacity-75">{user.department}</div>
            <div className="text-xs mt-1 opacity-60">
              {user.practice_areas?.join(', ') || 'All areas'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCardSelector = () => (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Available Dashboard Cards</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {availableCards.map(card => (
          <button
            key={card}
            onClick={() => setSelectedCard(card)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              selectedCard === card
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50'
            }`}
          >
            <div className="font-medium text-sm">
              {card.replace(/_/g, ' ')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderAccessInfo = () => {
    if (!cardData) return null;

    const access = accessControl.canAccessResource(currentUser, 'card', selectedCard);
    
    return (
      <div className={`mb-4 p-3 rounded-lg border ${
        access.granted 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`font-medium ${
              access.granted ? 'text-green-800' : 'text-red-800'
            }`}>
              Access: {access.granted ? 'Granted' : 'Denied'}
            </span>
            {access.reason && (
              <span className={`ml-2 text-sm ${
                access.granted ? 'text-green-600' : 'text-red-600'
              }`}>
                ({access.reason})
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Role: {currentUser.role} | Dept: {currentUser.department}
          </div>
        </div>
        {access.restrictions && access.restrictions.length > 0 && (
          <div className="mt-2 text-sm text-orange-700">
            <strong>Data Restrictions:</strong> {access.restrictions.length} filter(s) applied
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          SPQR Phase 3 – Runtime Enablement Demo
        </h1>
        <p className="text-gray-600">
          Live Looker Studio dashboard embedding with role-based access control and governance logging
        </p>
      </div>

      {renderUserSelector()}
      {renderCardSelector()}
      {renderAccessInfo()}

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading card data...</p>
          </div>
        </div>
      ) : cardData ? (
        <SPQRDashboardContainer
          cardData={cardData}
          userRole={currentUser.role}
          userId={currentUser.id}
          onGovernanceLog={handleGovernanceLog}
        />
      ) : (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">No card data available</p>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <button
          onClick={completePhase3}
          className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Complete Phase 3 – Runtime Enablement
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <strong>Phase:</strong> 3 – Runtime Enablement
          </div>
          <div>
            <strong>Status:</strong> Active Demo
          </div>
          <div>
            <strong>Current User:</strong> {currentUser.role}
          </div>
          <div>
            <strong>Selected Card:</strong> {selectedCard}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SPQRPhase3Demo;