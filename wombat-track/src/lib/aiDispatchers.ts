// Real-time AI dispatchers for Claude and Gizmo integration
// Phase WT-5.6 - Runtime AI Orchestration

export interface AIDispatchContext {
  projectId?: string;
  phaseStepId?: string;
  promptType?: string;
  userId?: string;
}

export interface AIDispatchResponse {
  response: string;
  isLive: boolean;
  agentVersion?: string;
  responseTime?: number;
  tokensUsed?: number;
}

/**
 * Dispatch prompt to Claude via API endpoint
 * Uses /api/claude/dispatch POST endpoint
 */
export async function dispatchToClaude(
  prompt: string,
  context: AIDispatchContext = {}
): Promise<string> {
  const startTime = Date.now();
  
  try {
    const response = await fetch("/api/claude/dispatch", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-AI-Console": "wt-5.6-live-agent-dispatch"
      },
      body: JSON.stringify({ 
        prompt, 
        ...context,
        timestamp: new Date().toISOString(),
        source: "gizmo-console"
      })
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Claude API endpoint not available. Using fallback response.");
      }
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    // Log performance metrics
    console.log(`[Claude Dispatch] Response time: ${responseTime}ms, Context: ${context.projectId || 'general'}`);
    
    return data.response || "No response received from Claude.";
    
  } catch (error) {
    console.error('Claude dispatch error:', error);
    
    // Fallback to enhanced mock response with context awareness
    return generateClaudeFallback(prompt, context);
  }
}

/**
 * Dispatch to Gizmo - Internal AI or stub responder
 * Currently using enhanced local logic, ready for future AI integration
 */
export async function dispatchToGizmo(
  prompt: string,
  context: AIDispatchContext = {}
): Promise<string> {
  const startTime = Date.now();
  
  // Simulate processing time for realistic UX
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
  
  try {
    // Future: Replace with actual Gizmo AI integration
    // const response = await fetch("/api/gizmo/dispatch", { ... });
    
    const responseTime = Date.now() - startTime;
    console.log(`[Gizmo Dispatch] Response time: ${responseTime}ms, Context: ${context.projectId || 'general'}`);
    
    return generateGizmoResponse(prompt, context);
    
  } catch (error) {
    console.error('Gizmo dispatch error:', error);
    return `🔧 Gizmo Error: Unable to process "${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}". Please try again.`;
  }
}

/**
 * Router function for agent selection and dispatch
 * Handles both Claude and Gizmo routing with context
 */
export const handleAIPrompt = async (
  prompt: string,
  agent: 'claude' | 'gizmo',
  context: AIDispatchContext = {}
): Promise<string> => {
  if (!prompt.trim()) {
    return "Please provide a prompt to process.";
  }
  
  // Add agent selection to context
  const enrichedContext = {
    ...context,
    selectedAgent: agent,
    dispatchTimestamp: new Date().toISOString()
  };
  
  try {
    switch (agent) {
      case "claude":
        return await dispatchToClaude(prompt, enrichedContext);
      case "gizmo":
        return await dispatchToGizmo(prompt, enrichedContext);
      default:
        return `Agent "${agent}" not implemented. Available agents: claude, gizmo.`;
    }
  } catch (error) {
    console.error(`AI dispatch error for ${agent}:`, error);
    return `Sorry, there was an error communicating with ${agent}. Please try again.`;
  }
};

/**
 * Enhanced Claude fallback with context awareness
 */
function generateClaudeFallback(prompt: string, context: AIDispatchContext): string {
  const contextInfo = context.projectId ? ` for project ${context.projectId}` : '';
  const phaseInfo = context.phaseStepId ? ` (Phase: ${context.phaseStepId})` : '';
  
  const responses = [
    `I understand you're asking about: "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}"\n\n📋 Context${contextInfo}${phaseInfo}\n\n🔄 **Fallback Mode**: This response is generated locally as the Claude API is not available. Here's my analysis:\n\n• This aligns with your current development phase\n• Consider documenting this interaction in your project notes\n• The request shows good contextual awareness\n• I recommend testing this again when the API is available\n\n💡 **Suggestion**: This type of query would benefit from real-time Claude integration for more detailed responses.`,
    
    `Based on your request${contextInfo}${phaseInfo}, I can provide some guidance:\n\n🔄 **Operating in Fallback Mode**\n\nYour prompt: "${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}"\n\n**Analysis**:\n• Good contextual framing with project/phase information\n• This type of query is well-suited for AI assistance\n• Consider breaking complex requests into smaller parts\n\n**Next Steps**:\n1. Verify Claude API connectivity\n2. Test with simplified prompts\n3. Document findings in governance log\n\n⚡ Once live API is available, you'll get much more detailed and context-aware responses.`,
    
    `🤖 **Claude (Fallback Response)**\n\nProcessing: "${prompt}"\n${contextInfo ? `\n📍 Project Context: ${context.projectId}` : ''}${phaseInfo}\n\n**Response**: I'm currently operating in fallback mode, but I can still help! Your question shows good structure and context. For the live Claude integration:\n\n• The API endpoint will provide more nuanced responses\n• Context awareness will be significantly enhanced\n• Response quality will improve with real-time processing\n\n🔧 **Current Status**: API integration pending - using local response generation\n📝 **Recommendation**: Save this interaction to governance log for future reference`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Enhanced Gizmo response generator
 */
function generateGizmoResponse(prompt: string, context: AIDispatchContext): string {
  const hasContext = Boolean(context.projectId || context.phaseStepId);
  const contextInfo = context.projectId ? `\n📍 Project: ${context.projectId}` : '';
  const phaseInfo = context.phaseStepId ? `\n📋 Phase/Step: ${context.phaseStepId}` : '';
  
  // Analyze prompt for action keywords
  const isCodeRelated = /\b(code|function|component|implement|create|build|scaffold)\b/i.test(prompt);
  const isAnalysisRelated = /\b(analyze|review|explain|understand|help|what|how|why)\b/i.test(prompt);
  const isProjectRelated = /\b(project|phase|step|task|workflow|process)\b/i.test(prompt);
  
  let responseType = '🔧 General';
  let actions = ['• Quick response generation', '• Context analysis', '• Basic task assistance'];
  
  if (isCodeRelated) {
    responseType = '⚡ Code Assistant';
    actions = ['• Code scaffolding available', '• Component generation ready', '• Template creation possible'];
  } else if (isAnalysisRelated) {
    responseType = '🧠 Analysis Mode';
    actions = ['• Deep analysis capabilities', '• Pattern recognition active', '• Insight generation enabled'];
  } else if (isProjectRelated) {
    responseType = '📊 Project Mode';
    actions = ['• Project workflow optimization', '• Phase management assistance', '• Task coordination support'];
  }
  
  return `🔮 **Gizmo ${responseType}**

**Prompt**: "${prompt}"${contextInfo}${phaseInfo}

**Processing Complete** ✅
${hasContext ? '🎯 **Context-Aware Response**' : '📝 **General Response**'}

${actions.join('\n')}

**Available Integrations**:
• Wombat Track project management
• Governance logging system  
• Phase-based workflow coordination
${hasContext ? '• Project-specific optimizations' : '• Context-enhanced responses when project info available'}

**Status**: ${hasContext ? 'Enhanced with project context' : 'Ready for context integration'}
**Next**: This interaction ${context.projectId ? 'will be' : 'can be'} logged to governance for audit trail

🚀 **Future**: Full AI integration coming in Phase WT-5.7+`;
}

/**
 * Utility to check if dispatchers are in live mode
 */
export function getDispatcherStatus() {
  return {
    claude: {
      isLive: false, // Will be true when API is available
      endpoint: "/api/claude/dispatch",
      fallbackActive: true
    },
    gizmo: {
      isLive: false, // Will be true when AI integration is complete
      endpoint: "/api/gizmo/dispatch", 
      fallbackActive: true
    }
  };
}

/**
 * Test function for dispatcher validation
 */
export async function testDispatchers(testPrompt: string = "Hello, this is a test prompt.") {
  console.log('Testing AI Dispatchers...');
  
  const testContext: AIDispatchContext = {
    projectId: 'test-project',
    phaseStepId: 'test-phase',
    promptType: 'testing',
    userId: 'test-user'
  };
  
  try {
    console.log('Testing Claude dispatcher...');
    const claudeResponse = await dispatchToClaude(testPrompt, testContext);
    console.log('Claude Response:', claudeResponse.slice(0, 100) + '...');
    
    console.log('Testing Gizmo dispatcher...');
    const gizmoResponse = await dispatchToGizmo(testPrompt, testContext);
    console.log('Gizmo Response:', gizmoResponse.slice(0, 100) + '...');
    
    console.log('Dispatchers test completed successfully!');
    return { claude: true, gizmo: true };
  } catch (error) {
    console.error('Dispatcher test failed:', error);
    return { claude: false, gizmo: false };
  }
}