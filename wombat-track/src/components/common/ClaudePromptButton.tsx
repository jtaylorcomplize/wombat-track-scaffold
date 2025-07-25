import React, { useState } from 'react';
import { Bot, Send, Loader2, Sparkles, Edit, RefreshCw } from 'lucide-react';

export interface ClaudePromptButtonProps {
  type: 'ask' | 'scaffold' | 'revise' | 'analyze';
  label?: string;
  prompt?: string;
  context?: any;
  disabled?: boolean;
  loading?: boolean;
  onPrompt: (prompt: string, context?: any) => Promise<string>;
  onResponse?: (response: string) => void;
  className?: string;
  testId?: string;
}

const BUTTON_CONFIGS = {
  ask: {
    icon: Bot,
    label: 'Ask Claude',
    color: 'bg-blue-500 hover:bg-blue-600 text-white',
    placeholder: 'Ask Claude a question...'
  },
  scaffold: {
    icon: Sparkles,
    label: 'AI Scaffold',
    color: 'bg-purple-500 hover:bg-purple-600 text-white',
    placeholder: 'What would you like to scaffold?'
  },
  revise: {
    icon: Edit,
    label: 'Revise with AI',
    color: 'bg-amber-500 hover:bg-amber-600 text-white',
    placeholder: 'How should this be revised?'
  },
  analyze: {
    icon: RefreshCw,
    label: 'AI Analysis',
    color: 'bg-green-500 hover:bg-green-600 text-white',
    placeholder: 'What should be analyzed?'
  }
};

export const ClaudePromptButton: React.FC<ClaudePromptButtonProps> = ({
  type,
  label,
  prompt: initialPrompt = '',
  context,
  disabled = false,
  loading = false,
  onPrompt,
  onResponse,
  className = '',
  testId
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const config = BUTTON_CONFIGS[type];
  const IconComponent = config.icon;

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return;

    try {
      setIsLoading(true);
      const result = await onPrompt(prompt, context);
      setResponse(result);
      onResponse?.(result);
    } catch (error) {
      console.error('Claude prompt error:', error);
      setResponse('Sorry, there was an error processing your request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        disabled={disabled || loading}
        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          disabled || loading 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : config.color
        } ${className}`}
        data-testid={testId}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <IconComponent className="w-4 h-4" />
        )}
        <span>{label || config.label}</span>
      </button>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <IconComponent className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">{label || config.label}</h3>
        </div>
        <button
          onClick={() => {
            setIsExpanded(false);
            setResponse('');
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Prompt Input */}
      <div className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={config.placeholder}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
          disabled={isLoading}
          data-testid={`${testId}-input`}
        />

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </div>
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isLoading}
            className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !prompt.trim() || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            data-testid={`${testId}-submit`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Send className="w-3 h-3" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Response Preview */}
      {response && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center space-x-2 mb-2">
            <Bot className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-900">Claude Response:</span>
          </div>
          <div 
            className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700 max-h-64 overflow-y-auto"
            data-testid={`${testId}-response`}
          >
            <pre className="whitespace-pre-wrap font-sans">{response}</pre>
          </div>
          
          <div className="flex items-center space-x-2 mt-3">
            <button
              onClick={() => navigator.clipboard.writeText(response)}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              Copy Response
            </button>
            <button
              onClick={() => setResponse('')}
              className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};