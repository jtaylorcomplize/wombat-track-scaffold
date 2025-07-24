import { logDevFailure } from '../api/governanceLogAPI';

/**
 * Log the missing import DevFailure for governance tracking
 */
export async function logMissingImportFailure() {
  try {
    await logDevFailure(
      'proj-wt-3x-devinfra', // WT-3.x project
      'phase-wt-3.1', // WT-3.1 phase where this issue occurred
      'claude',
      {
        type: 'missing_import',
        description: 'ProjectSidebar failed to build due to missing classNames utility and lucide-react dependency. Import failures not caught in pre-commit or CI.',
        filePath: 'src/components/project/ProjectSidebar.tsx',
        missingModule: 'utils/classNames, lucide-react',
        errorMessage: 'Failed to resolve import "../../utils/classNames" and "lucide-react"'
      }
    );
    
    console.log('✅ DevFailure logged for missing import issue');
  } catch (error) {
    console.error('❌ Failed to log DevFailure:', error);
  }
}

// Execute the logging
logMissingImportFailure();