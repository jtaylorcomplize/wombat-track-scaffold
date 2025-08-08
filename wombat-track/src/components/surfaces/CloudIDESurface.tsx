import React, { useState, useEffect, useRef } from 'react';
import type { Project, Phase, PhaseStep } from '../../types/phase';
import { cloudIDEGovernance } from '../../services/cloudIDEGovernance';
import type { GitHubBranch, GitHubPullRequest } from '../../services/githubIDEIntegration';
import { githubIDEIntegration } from '../../services/githubIDEIntegration';

interface CloudIDESurfaceProps {
  currentProject: Project | null;
  currentPhase: Phase | null;
  currentStep: PhaseStep | null;
  onPhaseChange?: (phase: Phase) => void;
  onStepChange?: (step: PhaseStep) => void;
}


interface IDEFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

export const CloudIDESurface: React.FC<CloudIDESurfaceProps> = ({
  currentProject,
  currentPhase,
  currentStep
}) => {
  const [isIdeLoading, setIsIdeLoading] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>('feature/of-integration-service');
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [openFiles, setOpenFiles] = useState<IDEFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [githubConnected, setGithubConnected] = useState<boolean>(false);
  const [activePRs, setActivePRs] = useState<GitHubPullRequest[]>([]);
  const ideFrameRef = useRef<HTMLIFrameElement>(null);

  // Mock IDE initialization
  useEffect(() => {
    const initializeIDE = async () => {
      setIsIdeLoading(true);
      
      try {
        // Initialize GitHub integration
        const connected = await githubIDEIntegration.initialize();
        setGithubConnected(connected);
        
        // Load branches from GitHub
        const githubBranches = await githubIDEIntegration.getBranches();
        setBranches(githubBranches);
        
        // Open some default files for the current project
        setOpenFiles([
          {
            name: 'README.md',
            path: '/README.md',
            content: `# ${currentProject?.name || 'Project'}\n\nCloud IDE integration for oApp development.\n\n## Features\n- Branch-based development\n- GitHub PR workflows\n- CI/CD integration\n- Governance logging\n\n## GitHub Integration\n- Repository: ${githubIDEIntegration.getRepository().owner}/${githubIDEIntegration.getRepository().name}\n- Status: ${connected ? '✅ Connected' : '❌ Disconnected'}`,
            language: 'markdown'
          },
          {
            name: 'package.json',
            path: '/package.json',
            content: '{\n  "name": "' + (currentProject?.name.toLowerCase().replace(/\s+/g, '-') || 'project') + '",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "npm run dev",\n    "build": "npm run build",\n    "test": "npm test"\n  }\n}',
            language: 'json'
          }
        ]);
        
        setTerminalOutput(`🚀 Cloud IDE initialized for Phase ${currentPhase?.name || 'Development'}\n${connected ? '✅ GitHub repository connected' : '❌ GitHub connection failed'}\n📝 Governance logging enabled\n📁 Repository: ${githubIDEIntegration.getRepository().owner}/${githubIDEIntegration.getRepository().name}\n\n$ `);
        setIsIdeLoading(false);
        
        // Log IDE initialization to governance
        await cloudIDEGovernance.logIDEInitialization(
          currentProject?.name,
          currentPhase?.name,
          currentStep?.name
        );
      } catch (error) {
        console.error('IDE initialization error:', error);
        setTerminalOutput('❌ IDE initialization failed\n\n$ ');
        setIsIdeLoading(false);
      }
    };

    initializeIDE();
  }, [currentProject, currentPhase, currentStep]);

  const handleBranchChange = async (branchName: string) => {
    setCurrentBranch(branchName);
    setTerminalOutput(prev => prev + `git checkout ${branchName}\nSwitched to branch '${branchName}'\n\n$ `);
    
    // Log governance event
    await cloudIDEGovernance.logEvent('branch_switch', { branch: branchName });
  };

  const handleCreateBranch = async () => {
    const branchName = prompt('Enter new branch name:');
    if (branchName && !branches.find(b => b.name === branchName)) {
      try {
        // Create branch via GitHub integration
        const newBranch = await githubIDEIntegration.createBranch(branchName, currentBranch);
        setBranches([...branches, newBranch]);
        setCurrentBranch(branchName);
        setTerminalOutput(prev => prev + `git checkout -b ${branchName}\nSwitched to a new branch '${branchName}'\n✅ Branch created on GitHub\n\n$ `);
        
        // Log governance event
        await cloudIDEGovernance.logBranchCreated(branchName, currentBranch);
      } catch (error) {
        setTerminalOutput(prev => prev + `❌ Failed to create branch '${branchName}'\n${error}\n\n$ `);
      }
    }
  };

  const handleTerminalCommand = async (command: string) => {
    setTerminalOutput(prev => prev + command + '\n');
    
    // Simulate command execution
    setTimeout(async () => {
      let output = '';
      
      switch (command.toLowerCase().trim()) {
        case 'git status':
          output = 'On branch ' + currentBranch + '\nnothing to commit, working tree clean';
          break;
        case 'npm run dev':
          output = '> Starting development server...\n> Server running on http://localhost:3000';
          break;
        case 'npm test':
          output = '> Running tests...\n> All tests passed ✓';
          break;
        case 'ls':
          output = openFiles.map(f => f.name).join('\n');
          break;
        default:
          output = `Command '${command}' executed`;
      }
      
      setTerminalOutput(prev => prev + output + '\n\n$ ');
      
      // Log governance event for terminal usage
      await cloudIDEGovernance.logTerminalCommand(command, currentBranch);
    }, 500);
    
    setTerminalInput('');
  };

  const handleFileEdit = async (fileIndex: number, newContent: string) => {
    const updatedFiles = [...openFiles];
    updatedFiles[fileIndex].content = newContent;
    setOpenFiles(updatedFiles);
    
    // Log governance event for file changes
    await cloudIDEGovernance.logFileEdited(updatedFiles[fileIndex].path, currentBranch);
  };

  const handleCreatePR = async () => {
    if (currentBranch === 'main') {
      alert('Cannot create PR from main branch');
      return;
    }
    
    const prTitle = prompt(`Create PR from ${currentBranch} to main:`);
    if (prTitle) {
      try {
        // Create PR via GitHub integration
        const pr = await githubIDEIntegration.createPullRequest(prTitle, currentBranch, 'main');
        setActivePRs(prev => [...prev, pr]);
        setTerminalOutput(prev => prev + `gh pr create --title "${prTitle}" --base main --head ${currentBranch}\n✅ Pull request #${pr.number} created successfully\n🔗 ${pr.url}\n🚀 CI/CD workflow triggered\n\n$ `);
        
        // Log governance event for PR creation
        await cloudIDEGovernance.logPRCreated(prTitle, currentBranch, 'main');
      } catch (error) {
        setTerminalOutput(prev => prev + `❌ Failed to create PR: ${error}\n\n$ `);
      }
    }
  };

  if (isIdeLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Cloud IDE...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      {/* IDE Header */}
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="font-semibold text-sm">Cloud IDE - {currentProject?.name}</h2>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Branch:</span>
            <select 
              value={currentBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
            >
              {branches.map(branch => (
                <option key={branch.name} value={branch.name}>
                  {branch.name} {branch.protected && '🔒'}
                </option>
              ))}
            </select>
            <button 
              onClick={handleCreateBranch}
              className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 rounded"
            >
              New Branch
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {activePRs.length > 0 && (
            <div className="text-xs text-green-400">
              {activePRs.length} PR{activePRs.length > 1 ? 's' : ''}
            </div>
          )}
          <button 
            onClick={handleCreatePR}
            className="bg-green-600 hover:bg-green-700 text-xs px-3 py-1 rounded"
            disabled={!githubConnected}
          >
            Create PR
          </button>
          <div 
            className={`h-2 w-2 rounded-full ${githubConnected ? 'bg-green-500' : 'bg-red-500'}`} 
            title={githubConnected ? 'Connected to GitHub' : 'GitHub disconnected'}
          ></div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* File Explorer */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-3">
          <h3 className="text-sm font-medium mb-2">Explorer</h3>
          <div className="space-y-1">
            {openFiles.map((file, index) => (
              <div 
                key={file.path}
                className={`cursor-pointer text-sm px-2 py-1 rounded ${
                  index === activeFileIndex ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
                onClick={() => setActiveFileIndex(index)}
              >
                {file.name}
              </div>
            ))}
          </div>
          
          <div className="mt-6">
            <h4 className="text-xs font-medium text-gray-400 mb-2">PHASE CONTEXT</h4>
            <div className="text-xs text-gray-300 space-y-1">
              <div>Phase: {currentPhase?.name}</div>
              <div>Step: {currentStep?.name}</div>
              <div>Progress: {currentPhase?.completionPercentage}%</div>
            </div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* File Tabs */}
          <div className="bg-gray-800 border-b border-gray-700 px-2">
            <div className="flex">
              {openFiles.map((file, index) => (
                <div 
                  key={file.path}
                  className={`px-4 py-2 text-sm cursor-pointer border-r border-gray-700 ${
                    index === activeFileIndex ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setActiveFileIndex(index)}
                >
                  {file.name}
                </div>
              ))}
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 bg-gray-900 p-4">
            <textarea
              value={openFiles[activeFileIndex]?.content || ''}
              onChange={(e) => handleFileEdit(activeFileIndex, e.target.value)}
              className="w-full h-full bg-transparent text-white font-mono text-sm resize-none outline-none"
              spellCheck={false}
              placeholder="Start coding..."
            />
          </div>
        </div>
      </div>

      {/* Terminal */}
      <div className="h-48 bg-black border-t border-gray-700 flex flex-col">
        <div className="bg-gray-800 px-4 py-1 text-xs font-medium border-b border-gray-700">
          Terminal - {currentBranch}
        </div>
        <div className="flex-1 p-3 overflow-y-auto">
          <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
            {terminalOutput}
          </pre>
          <div className="flex items-center text-xs font-mono">
            <span className="text-green-400">$ </span>
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleTerminalCommand(terminalInput);
                }
              }}
              className="flex-1 bg-transparent text-green-400 outline-none ml-1"
              placeholder="Enter command..."
            />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-blue-600 px-4 py-1 text-xs flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span>Branch: {currentBranch}</span>
          <span>Files: {openFiles.length}</span>
          <span className="text-green-200">✓ Governance Logging Active</span>
        </div>
        <div>
          Memory Anchor: of-9.0-init-20250806
        </div>
      </div>
    </div>
  );
};

export default CloudIDESurface;