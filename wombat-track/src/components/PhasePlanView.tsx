import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, GripVertical } from 'lucide-react';
import { useProjectContext } from '../contexts/ProjectContext';
import type { Phase, PhaseStep } from '../types/phase';

interface PhasePlanViewProps {
  projectId: string;
}

export const PhasePlanView: React.FC<PhasePlanViewProps> = ({ projectId }) => {
  const { projects, updatePhase, updatePhaseStep, addPhaseStep, removePhaseStep } = useProjectContext();
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [newStepPhase, setNewStepPhase] = useState<string | null>(null);
  
  const project = projects.find(p => p.id === projectId);
  
  if (!project) {
    return <div className="p-4 text-gray-500">Project not found</div>;
  }

  const handlePhaseEdit = (phaseId: string, updates: Partial<Phase>) => {
    updatePhase(projectId, phaseId, updates);
    setEditingPhase(null);
  };

  const handleStepEdit = (phaseId: string, stepId: string, updates: Partial<PhaseStep>) => {
    updatePhaseStep(projectId, phaseId, stepId, updates);
    setEditingStep(null);
  };

  const handleAddStep = (phaseId: string, stepData: Partial<PhaseStep>) => {
    const newStep: PhaseStep = {
      id: `step-${Date.now()}`,
      phaseId,
      name: stepData.name || 'New Step',
      status: 'not_started',
      description: stepData.description,
      stepInstruction: stepData.stepInstruction,
      isSideQuest: false
    };
    
    addPhaseStep(projectId, phaseId, newStep);
    setNewStepPhase(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Phase Planning</h2>
        <p className="text-sm text-gray-600">
          Edit and organize phases and steps for {project.name}
        </p>
      </div>

      <div className="space-y-6">
        {project.phases
          .sort((a, b) => a.order - b.order)
          .map((phase) => (
            <div key={phase.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Phase Header */}
              <div className="bg-gray-50 p-4">
                {editingPhase === phase.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      defaultValue={phase.name}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Phase name"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handlePhaseEdit(phase.id, { name: e.currentTarget.value });
                        } else if (e.key === 'Escape') {
                          setEditingPhase(null);
                        }
                      }}
                    />
                    <textarea
                      defaultValue={phase.description}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Phase description"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingPhase(null);
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const nameInput = document.querySelector(`input[value="${phase.name}"]`) as HTMLInputElement;
                          const descInput = document.querySelector(`textarea[value="${phase.description}"]`) as HTMLTextAreaElement;
                          handlePhaseEdit(phase.id, {
                            name: nameInput?.value || phase.name,
                            description: descInput?.value || phase.description
                          });
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingPhase(null)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <GripVertical className="w-5 h-5 text-gray-400 mt-1 cursor-move" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{phase.name}</h3>
                        {phase.description && (
                          <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-500">
                            {phase.steps.length} steps
                          </span>
                          {phase.ragStatus && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              phase.ragStatus === 'green' ? 'bg-green-100 text-green-700' :
                              phase.ragStatus === 'amber' ? 'bg-amber-100 text-amber-700' :
                              phase.ragStatus === 'red' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {phase.ragStatus.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingPhase(phase.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                )}
              </div>

              {/* Phase Steps */}
              <div className="p-4 space-y-2">
                {phase.steps.map((step, stepIndex) => (
                  <div key={step.id} className="border border-gray-200 rounded-md p-3">
                    {editingStep === step.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          defaultValue={step.name}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Step name"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleStepEdit(phase.id, step.id, { name: e.currentTarget.value });
                            } else if (e.key === 'Escape') {
                              setEditingStep(null);
                            }
                          }}
                        />
                        <input
                          type="text"
                          defaultValue={step.stepInstruction}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Step instruction"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const nameInput = document.querySelector(`input[value="${step.name}"]`) as HTMLInputElement;
                              const instructionInput = document.querySelector(`input[value="${step.stepInstruction || ''}"]`) as HTMLInputElement;
                              handleStepEdit(phase.id, step.id, {
                                name: nameInput?.value || step.name,
                                stepInstruction: instructionInput?.value
                              });
                            }}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingStep(null)}
                            className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-sm">
                            {stepIndex + 1}.
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{step.name}</p>
                            {step.stepInstruction && (
                              <p className="text-xs text-gray-600">{step.stepInstruction}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            step.status === 'complete' ? 'bg-green-100 text-green-700' :
                            step.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                            step.status === 'error' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {step.status.replace('_', ' ')}
                          </span>
                          <button
                            onClick={() => setEditingStep(step.id)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <Edit2 className="w-3 h-3 text-gray-600" />
                          </button>
                          <button
                            onClick={() => removePhaseStep(projectId, phase.id, step.id)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add New Step */}
                {newStepPhase === phase.id ? (
                  <div className="border border-dashed border-gray-300 rounded-md p-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Step name"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      id={`new-step-name-${phase.id}`}
                    />
                    <input
                      type="text"
                      placeholder="Step instruction (optional)"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      id={`new-step-instruction-${phase.id}`}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const nameInput = document.getElementById(`new-step-name-${phase.id}`) as HTMLInputElement;
                          const instructionInput = document.getElementById(`new-step-instruction-${phase.id}`) as HTMLInputElement;
                          if (nameInput?.value) {
                            handleAddStep(phase.id, {
                              name: nameInput.value,
                              stepInstruction: instructionInput?.value
                            });
                          }
                        }}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        Add Step
                      </button>
                      <button
                        onClick={() => setNewStepPhase(null)}
                        className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setNewStepPhase(phase.id)}
                    className="w-full py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Step
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};