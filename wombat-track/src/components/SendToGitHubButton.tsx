import React, { useState } from 'react';

interface SendToGitHubButtonProps {
  phaseId: string | number;
  className?: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export const SendToGitHubButton: React.FC<SendToGitHubButtonProps> = ({ 
  phaseId, 
  className = '' 
}) => {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleClick = async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/github/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phase_id: String(phaseId) }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        // Reset to idle after 3 seconds
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to trigger workflow');
      }
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      setStatus('error');
      setErrorMessage('Network error: Unable to connect');
    }
  };

  const getButtonContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Sending...
          </>
        );
      case 'success':
        return (
          <>
            <svg className="w-4 h-4 mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Sent to GitHub
          </>
        );
      case 'error':
        return (
          <>
            <svg className="w-4 h-4 mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Failed
          </>
        );
      default:
        return (
          <>
            <svg className="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Send to GitHub
          </>
        );
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    switch (status) {
      case 'loading':
        return `${baseClasses} bg-gray-400 text-white cursor-not-allowed`;
      case 'success':
        return `${baseClasses} bg-green-600 text-white`;
      case 'error':
        return `${baseClasses} bg-red-600 text-white`;
      default:
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
    }
  };

  return (
    <div className="inline-flex flex-col items-start">
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className={`${getButtonClasses()} ${className}`}
        aria-label={`Send phase ${phaseId} to GitHub`}
        data-testid="send-to-github-button"
      >
        {getButtonContent()}
      </button>
      {status === 'error' && errorMessage && (
        <span className="text-sm text-red-600 mt-1" data-testid="error-message">{errorMessage}</span>
      )}
      {status === 'success' && (
        <span className="text-sm text-green-600 mt-1" data-testid="success-message">Workflow triggered successfully</span>
      )}
    </div>
  );
};