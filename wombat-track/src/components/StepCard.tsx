// wombat-track/src/components/StepCard.tsx
import React, { useState } from 'react';
import type { PhaseStep, StepProgress } from '../types/models';
import './StepCard.css';

interface StepCardProps {
  step: PhaseStep;
  onUpdate?: (updatedStep: PhaseStep) => void;
  readOnly?: boolean;
}

export const StepCard: React.FC<StepCardProps> = ({ 
  step, 
  onUpdate, 
  readOnly = false 
}) => {
  const [localStep, setLocalStep] = useState<PhaseStep>(step);

  const handleSideQuestToggle = () => {
    if (readOnly) return;
    
    const updatedStep = {
      ...localStep,
      isSideQuest: !localStep.isSideQuest
    };
    
    setLocalStep(updatedStep);
    onUpdate?.(updatedStep);
  };

  const handleStatusChange = (status: StepProgress['status']) => {
    if (readOnly) return;
    
    const updatedStep = {
      ...localStep,
      stepProgress: {
        ...localStep.stepProgress,
        id: localStep.stepProgress?.id || `progress-${localStep.id}`,
        status
      }
    };
    
    setLocalStep(updatedStep);
    onUpdate?.(updatedStep);
  };

  return (
    <div className={`step-card ${localStep.isSideQuest ? 'side-quest' : ''}`}>
      <div className="step-card-header">
        <div className="step-instruction">
          {localStep.stepInstruction}
        </div>
        {localStep.isSideQuest && (
          <span className="side-quest-indicator" title="Side Quest">
            🟥
          </span>
        )}
      </div>
      
      <div className="step-card-meta">
        {localStep.stepProgress?.assignedTo && (
          <span className="assigned-to">
            Assigned: {localStep.stepProgress.assignedTo}
          </span>
        )}
        {localStep.stepNumber && (
          <span className="step-number">
            Step #{localStep.stepNumber}
          </span>
        )}
      </div>
      
      {!readOnly && (
        <div className="step-card-controls">
          <div className="status-controls">
            <label className="status-label">Status:</label>
            <select 
              value={localStep.stepProgress?.status || 'Not Started'} 
              onChange={(e) => handleStatusChange(e.target.value as StepProgress['status'])}
              className="status-select"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Complete">Complete</option>
            </select>
          </div>
          
          <label className="side-quest-toggle">
            <input
              type="checkbox"
              checked={localStep.isSideQuest || false}
              onChange={handleSideQuestToggle}
              className="toggle-checkbox"
            />
            <span className="toggle-label">Mark as Side Quest</span>
          </label>
        </div>
      )}
    </div>
  );
};
